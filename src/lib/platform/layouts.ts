/** Page layouts: defaults, resolution per profile, sanitising. Server-only. */
import dbConnect from '@/lib/mongodb';
import PageLayout from '@/models/PageLayout';
import LayoutAssignment from '@/models/LayoutAssignment';
import type { LayoutBehavior, LayoutItem, LayoutSection, ObjectDescribe, PageLayoutDTO } from './types';

export function generateDefaultLayout(object: ObjectDescribe): PageLayoutDTO {
  const editable = object.fields.filter((f) => !f.isSystem);
  const system = object.fields.filter((f) => f.isSystem);
  const sections: LayoutSection[] = [
    {
      id: 'information',
      label: `${object.label} Information`,
      columns: 2,
      items: editable.filter((f) => !f.isCustom && f.type !== 'textarea').map((f) => ({ field: f.apiName, behavior: f.required ? 'required' : 'edit' })),
    },
  ];
  const custom = editable.filter((f) => f.isCustom && f.type !== 'textarea');
  if (custom.length) {
    sections.push({
      id: 'custom',
      label: 'Additional Information',
      columns: 2,
      items: custom.map((f) => ({ field: f.apiName, behavior: f.required ? 'required' : 'edit' })),
    });
  }
  const long = editable.filter((f) => f.type === 'textarea');
  if (long.length) {
    sections.push({
      id: 'description',
      label: 'Description Information',
      columns: 1,
      items: long.map((f) => ({ field: f.apiName, behavior: f.required ? 'required' : 'edit' })),
    });
  }
  if (system.length) {
    sections.push({
      id: 'system',
      label: 'System Information',
      columns: 2,
      hideOnCreate: true,
      items: system.map((f) => ({ field: f.apiName, behavior: 'readonly' })),
    });
  }
  return {
    objectApiName: object.apiName,
    name: `${object.label} Layout`,
    isDefault: true,
    sections,
    generated: true,
  };
}

/**
 * Clean a layout against the object's current fields:
 * drops deleted fields & duplicates, forces system/formula fields read-only,
 * and forces data-required fields to 'required'.
 */
export function sanitizeLayout(object: ObjectDescribe, sections: LayoutSection[]): LayoutSection[] {
  const byApi = new Map(object.fields.map((f) => [f.apiName, f]));
  const seen = new Set<string>();
  return (sections || []).map((s, i) => ({
    id: String(s.id || `section-${i}`),
    label: String(s.label || 'Section'),
    columns: s.columns === 1 ? 1 : 2,
    hideOnCreate: Boolean(s.hideOnCreate),
    items: (s.items || [])
      .filter((it) => byApi.has(it.field) && !seen.has(it.field) && seen.add(it.field))
      .map((it): LayoutItem => {
        const f = byApi.get(it.field)!;
        let behavior: LayoutBehavior = it.behavior === 'required' || it.behavior === 'readonly' ? it.behavior : 'edit';
        if (f.isSystem || f.type === 'formula') behavior = 'readonly';
        else if (f.required) behavior = 'required';
        return { field: it.field, behavior };
      }),
  }));
}

function toDTO(doc: Record<string, unknown>): PageLayoutDTO {
  return {
    _id: String(doc._id),
    objectApiName: doc.objectApiName as string,
    name: doc.name as string,
    description: doc.description as string | undefined,
    isDefault: Boolean(doc.isDefault),
    sections: (doc.sections as LayoutSection[]) || [],
  };
}

export async function listLayouts(tenant: string, object: ObjectDescribe): Promise<PageLayoutDTO[]> {
  await dbConnect();
  const docs = await PageLayout.find({ orgId: tenant, objectApiName: object.apiName }).sort({ isDefault: -1, name: 1 }).lean();
  return docs.map((d) => toDTO(d as Record<string, unknown>));
}

/** Layout for a user's profile: assignment → default layout → generated. Always sanitised. */
export async function resolveLayout(tenant: string, object: ObjectDescribe, profileId: string): Promise<PageLayoutDTO> {
  await dbConnect();
  let layout: PageLayoutDTO | null = null;
  if (profileId) {
    const asg = await LayoutAssignment.findOne({ orgId: tenant, objectApiName: object.apiName, profileId }).lean();
    if (asg) {
      const doc = await PageLayout.findOne({ _id: asg.layoutId, orgId: tenant }).lean();
      if (doc) layout = toDTO(doc as Record<string, unknown>);
    }
  }
  if (!layout) {
    const doc =
      (await PageLayout.findOne({ orgId: tenant, objectApiName: object.apiName, isDefault: true }).lean()) ||
      (await PageLayout.findOne({ orgId: tenant, objectApiName: object.apiName }).sort({ createdAt: 1 }).lean());
    if (doc) layout = toDTO(doc as Record<string, unknown>);
  }
  if (!layout) return generateDefaultLayout(object);
  return { ...layout, sections: sanitizeLayout(object, layout.sections) };
}
