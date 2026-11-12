#!/usr/bin/env node
/**
 * One-off migration to the metadata/permission platform.
 *
 *   node scripts/migrate-platform.mjs           # dry run (default): report only
 *   node scripts/migrate-platform.mjs --apply   # perform the writes
 *
 * Steps (idempotent — safe to re-run):
 *   1. Stamp orgId on legacy Sales & Service records (owned by userId = user's email).
 *   2. Copy legacy custom field definitions (customfielddefs) into fielddefinitions.
 *   3. Report users without a profileId (they get one derived from orgRole at runtime).
 *
 * MONGODB_URI comes from the environment, falling back to .env.local in the repo root.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const RECORD_COLLECTIONS = ['leads', 'contacts', 'accounts', 'opportunities', 'cases'];
const CUSTOM_FIELD_OBJECTS = new Set(['Lead', 'Contact', 'Account', 'Opportunity', 'Case']);
const DEV_USER = 'dev-user-id';
const DEV_ORG = 'dev-org-id';

function loadMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return undefined;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?MONGODB_URI\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    return v;
  }
  return undefined;
}

function toApiName(raw, label) {
  let base = String(raw || label || '')
    .replace(/__c$/i, '')
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) return null;
  if (/^[0-9]/.test(base)) base = `f_${base}`;
  return `${base}__c`;
}

const TYPE_MAP = {
  text: 'text',
  number: 'number',
  date: 'date',
  email: 'email',
  url: 'url',
  boolean: 'checkbox',
  picklist: 'picklist',
  multipicklist: 'multipicklist',
};

function log(...args) {
  console.log(...args);
}

async function main() {
  const uri = loadMongoUri();
  if (!uri) {
    console.error('MONGODB_URI not set (env or .env.local).');
    process.exit(1);
  }

  log(`Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no writes; pass --apply to migrate)'}`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const users = await db
    .collection('users')
    .find({}, { projection: { email: 1, orgId: 1, profileId: 1 } })
    .toArray();
  const byEmail = new Map(users.filter((u) => u.email).map((u) => [u.email, u]));

  /* ---------------- Step 1: stamp orgId on legacy records ---------------- */
  log('\nStep 1 — stamp orgId on legacy records');
  const orgUsers = users.filter((u) => u.orgId && u.email);
  log(`  users with an org: ${orgUsers.length}`);
  for (const coll of RECORD_COLLECTIONS) {
    let matched = 0;
    let modified = 0;
    for (const u of orgUsers) {
      const filter = { userId: u.email, $or: [{ orgId: { $exists: false } }, { orgId: null }] };
      if (APPLY) {
        const res = await db.collection(coll).updateMany(filter, { $set: { orgId: String(u.orgId) } });
        matched += res.matchedCount;
        modified += res.modifiedCount;
      } else {
        matched += await db.collection(coll).countDocuments(filter);
      }
    }
    log(`  ${coll}: ${matched} record(s) need orgId${APPLY ? `, ${modified} updated` : ''}`);
  }

  /* ---------------- Step 2: legacy custom fields → fielddefinitions ---------------- */
  log('\nStep 2 — copy legacy custom field definitions');
  const legacyDefs = await db.collection('customfielddefs').find({}).toArray();
  const stats = { total: legacyDefs.length, workOrder: 0, noTenant: 0, badName: 0, exists: 0, toInsert: 0, soloTenant: 0 };
  const seen = new Set();
  const docs = [];
  const now = new Date();

  for (const d of legacyDefs) {
    if (d.objectType === 'WorkOrder') {
      stats.workOrder++;
      continue;
    }
    if (!CUSTOM_FIELD_OBJECTS.has(d.objectType)) {
      stats.noTenant++;
      continue;
    }

    // Tenant: owning user's org; solo users use the same `user:<id>` key as tenantOf().
    let orgId = null;
    const owner = byEmail.get(d.userId);
    if (owner?.orgId) orgId = String(owner.orgId);
    else if (owner) {
      orgId = `user:${String(owner._id)}`;
      stats.soloTenant++;
    } else if (d.userId === DEV_USER) orgId = DEV_ORG;
    else if (d.orgId) orgId = String(d.orgId);
    if (!orgId) {
      stats.noTenant++;
      continue;
    }

    const apiName = toApiName(d.apiName, d.name);
    if (!apiName) {
      stats.badName++;
      continue;
    }
    const key = `${orgId}|${d.objectType}|${apiName}`;
    if (seen.has(key)) {
      stats.exists++;
      continue;
    }
    seen.add(key);
    if (await db.collection('fielddefinitions').findOne({ orgId, objectApiName: d.objectType, apiName }, { projection: { _id: 1 } })) {
      stats.exists++;
      continue;
    }

    const type = TYPE_MAP[d.type] || 'text';
    const doc = {
      orgId,
      objectApiName: d.objectType,
      apiName,
      label: d.name || apiName.replace(/__c$/, ''),
      type,
      isOverride: false,
      required: Boolean(d.required),
      unique: false,
      active: true,
      order: typeof d.order === 'number' ? d.order : 0,
      createdAt: d.createdAt || now,
      updatedAt: now,
      __v: 0,
    };
    if (d.helpText) doc.helpText = d.helpText;
    if (d.defaultValue !== undefined && d.defaultValue !== null && d.defaultValue !== '') doc.defaultValue = d.defaultValue;
    if (type === 'picklist' || type === 'multipicklist') {
      doc.picklistValues = (d.picklistValues || [])
        .map((v) => String(v).trim())
        .filter(Boolean)
        .map((v) => ({ value: v, label: v, active: true, isDefault: false }));
    }
    if (type === 'text') doc.length = 255;
    docs.push(doc);
  }
  stats.toInsert = docs.length;

  log(`  legacy definitions: ${stats.total}`);
  log(`  skipped (WorkOrder — no custom-field storage yet): ${stats.workOrder}`);
  log(`  skipped (no owning user/tenant or unknown object): ${stats.noTenant}`);
  log(`  skipped (unusable api name): ${stats.badName}`);
  log(`  skipped (already exists): ${stats.exists}`);
  log(`  to insert: ${stats.toInsert} (of which ${stats.soloTenant} for solo users without an org)`);
  if (APPLY && docs.length) {
    try {
      const res = await db.collection('fielddefinitions').insertMany(docs, { ordered: false });
      log(`  inserted: ${res.insertedCount}`);
    } catch (e) {
      // Unique index (orgId, objectApiName, apiName): a concurrent insert is fine to skip.
      if (e?.code === 11000 || e?.writeErrors) {
        log(`  inserted: ${e.result?.insertedCount ?? e.insertedCount ?? '?'} (some duplicates skipped)`);
      } else throw e;
    }
  }

  /* ---------------- Step 3: profiles ---------------- */
  log('\nStep 3 — profiles');
  const noProfile = users.filter((u) => !u.profileId).length;
  log(`  users without profileId: ${noProfile} (profile derived from orgRole at runtime; nothing to do)`);

  log(`\nDone${APPLY ? '' : ' (dry run — nothing was written)'}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
