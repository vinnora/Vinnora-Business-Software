'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge,
} from '../_components/ui';

type JobPosting = {
  _id: string; title: string; department: string; location: string; type: string;
  description: string; requirements: string; salaryMin: number; salaryMax: number;
  status: string; openings: number; applicantCount: number; closingDate: string; createdAt: string;
};

type Applicant = {
  _id: string; jobPostingId: string; firstName: string; lastName: string; email: string;
  phone: string; source: string; stage: string; rating: number; interviewDate: string;
  resumeUrl: string; createdAt: string;
};

const JOB_STATUSES = ['Draft', 'Open', 'On Hold', 'Closed', 'Filled'];
const JOB_STATUS_TONE: Record<string, any> = { Draft: 'gray', Open: 'green', 'On Hold': 'amber', Closed: 'purple', Filled: 'blue' };
const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'];

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected', 'Withdrawn'];
const STAGE_TONE: Record<string, any> = { Applied: 'gray', Screening: 'blue', Interview: 'amber', Offer: 'purple', Hired: 'green', Rejected: 'red', Withdrawn: 'gray' };
const SOURCES = ['Job Portal', 'Referral', 'LinkedIn', 'Company Website', 'Campus', 'Agency', 'Other'];

export default function RecruitmentPage() {
  const [tab, setTab] = useState<'jobs' | 'applicants'>('jobs');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');

  /* Job modal */
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JobPosting | null>(null);
  const [form, setForm] = useState<any>({});

  /* Applicant modal */
  const [appOpen, setAppOpen] = useState(false);
  const [appEditing, setAppEditing] = useState<Applicant | null>(null);
  const [appForm, setAppForm] = useState<any>({});

  const loadJobs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search && tab === 'jobs') params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/hrm/recruitment?${params}`).then(r => r.json());
    setJobs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadApplicants = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search && tab === 'applicants') params.set('search', search);
    if (jobFilter) params.set('jobPostingId', jobFilter);
    const data = await fetch(`/api/hrm/applicants?${params}`).then(r => r.json());
    setApplicants(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadJobs(); }, [statusFilter]);
  useEffect(() => { loadApplicants(); }, [jobFilter]);

  const saveJob = async () => {
    if (!form.title || !form.department) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    await fetch('/api/hrm/recruitment', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setOpen(false); setEditing(null); setForm({}); loadJobs();
  };

  const removeJob = async (id: string) => {
    if (!confirm('Delete this job posting?')) return;
    await fetch(`/api/hrm/recruitment?id=${id}`, { method: 'DELETE' }); loadJobs();
  };

  const saveApplicant = async () => {
    if (!appForm.jobPostingId || !appForm.firstName || !appForm.lastName || !appForm.email) return;
    const method = appEditing ? 'PATCH' : 'POST';
    const payload = appEditing ? { _id: appEditing._id, ...appForm } : appForm;
    await fetch('/api/hrm/applicants', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setAppOpen(false); setAppEditing(null); setAppForm({}); loadApplicants();
  };

  const removeApplicant = async (id: string) => {
    if (!confirm('Delete this applicant?')) return;
    await fetch(`/api/hrm/applicants?id=${id}`, { method: 'DELETE' }); loadApplicants();
  };

  const renderStars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <>
      <PageHeader
        title="Recruitment"
        subtitle="HRM"
        count={tab === 'jobs' ? jobs.length : applicants.length}
        actions={
          <>
            <div className="flex border border-[#E8D5B7] rounded overflow-hidden mr-2">
              <button onClick={() => setTab('jobs')} className={`px-3 py-1.5 text-xs ${tab === 'jobs' ? 'bg-[#8B6F47] text-white' : 'text-[#8B6F47]'}`}>Job Postings</button>
              <button onClick={() => setTab('applicants')} className={`px-3 py-1.5 text-xs ${tab === 'applicants' ? 'bg-[#8B6F47] text-white' : 'text-[#8B6F47]'}`}>Applicants</button>
            </div>
            {tab === 'jobs' ? (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadJobs()} placeholder="Search..." className="px-3 py-1.5 text-sm border border-[#E8D5B7] rounded focus:border-[#8B6F47] focus:outline-none" />
                <SelectInput value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{JOB_STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput>
                <PrimaryButton onClick={() => { setEditing(null); setForm({ title: '', department: '', location: '', type: 'Full-Time', description: '', requirements: '', salaryMin: 0, salaryMax: 0, status: 'Draft', openings: 1, closingDate: '' }); setOpen(true); }}>+ New Job</PrimaryButton>
              </>
            ) : (
              <>
                <SelectInput value={jobFilter} onChange={e => setJobFilter(e.target.value)}><option value="">All Jobs</option>{jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}</SelectInput>
                <PrimaryButton onClick={() => { setAppEditing(null); setAppForm({ jobPostingId: '', firstName: '', lastName: '', email: '', phone: '', source: 'Job Portal', stage: 'Applied', rating: 3, interviewDate: '', resumeUrl: '' }); setAppOpen(true); }}>+ New Applicant</PrimaryButton>
              </>
            )}
          </>
        }
      />

      <div className="p-6">
        {tab === 'jobs' ? (
          <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
                <tr>
                  <th className="text-left px-4 py-2.5">Title</th>
                  <th className="text-left px-4 py-2.5">Dept</th>
                  <th className="text-left px-4 py-2.5">Type</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-right px-4 py-2.5">Openings</th>
                  <th className="text-right px-4 py-2.5">Applicants</th>
                  <th className="text-left px-4 py-2.5">Closing Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8B6F47]">Loading...</td></tr>
                ) : jobs.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8B6F47]">No job postings yet.</td></tr>
                ) : jobs.map(j => (
                  <tr key={j._id} className="border-t border-[#F2E4CF] hover:bg-[#FAF1E1]">
                    <td className="px-4 py-2 font-medium text-[#2C2620]">{j.title}</td>
                    <td className="px-4 py-2 text-[#6B5841]">{j.department}</td>
                    <td className="px-4 py-2 text-[#6B5841]">{j.type}</td>
                    <td className="px-4 py-2"><Badge tone={JOB_STATUS_TONE[j.status]}>{j.status}</Badge></td>
                    <td className="px-4 py-2 text-right">{j.openings}</td>
                    <td className="px-4 py-2 text-right font-semibold text-[#2C2620]">{j.applicantCount || 0}</td>
                    <td className="px-4 py-2 text-xs text-[#8B6F47]">{j.closingDate ? new Date(j.closingDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => { setEditing(j); setForm({ ...j, closingDate: j.closingDate ? j.closingDate.slice(0, 10) : '' }); setOpen(true); }} className="text-xs text-[#8B6F47] hover:underline mr-3">Edit</button>
                      <button onClick={() => removeJob(j._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
                <tr>
                  <th className="text-left px-4 py-2.5">Name</th>
                  <th className="text-left px-4 py-2.5">Email</th>
                  <th className="text-left px-4 py-2.5">Source</th>
                  <th className="text-left px-4 py-2.5">Stage</th>
                  <th className="text-left px-4 py-2.5">Rating</th>
                  <th className="text-left px-4 py-2.5">Interview Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8B6F47]">Loading...</td></tr>
                ) : applicants.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8B6F47]">No applicants yet.</td></tr>
                ) : applicants.map(a => (
                  <tr key={a._id} className="border-t border-[#F2E4CF] hover:bg-[#FAF1E1]">
                    <td className="px-4 py-2 font-medium text-[#2C2620]">{a.firstName} {a.lastName}</td>
                    <td className="px-4 py-2 text-[#6B5841]">{a.email}</td>
                    <td className="px-4 py-2 text-[#6B5841]">{a.source}</td>
                    <td className="px-4 py-2"><Badge tone={STAGE_TONE[a.stage]}>{a.stage}</Badge></td>
                    <td className="px-4 py-2 text-[#C9A178]">{renderStars(a.rating || 0)}</td>
                    <td className="px-4 py-2 text-xs text-[#8B6F47]">{a.interviewDate ? new Date(a.interviewDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => { setAppEditing(a); setAppForm({ ...a, interviewDate: a.interviewDate ? a.interviewDate.slice(0, 10) : '' }); setAppOpen(true); }} className="text-xs text-[#8B6F47] hover:underline mr-3">Edit</button>
                      <button onClick={() => removeApplicant(a._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Job Posting Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Job Posting' : 'New Job Posting'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={saveJob}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title" required><TextInput value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Department" required><TextInput value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} /></Field>
          <Field label="Location"><TextInput value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Type"><SelectInput value={form.type || 'Full-Time'} onChange={e => setForm({ ...form, type: e.target.value })}>{JOB_TYPES.map(t => <option key={t}>{t}</option>)}</SelectInput></Field>
          <Field label="Status"><SelectInput value={form.status || 'Draft'} onChange={e => setForm({ ...form, status: e.target.value })}>{JOB_STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="Openings"><TextInput type="number" min={1} value={form.openings || 1} onChange={e => setForm({ ...form, openings: Number(e.target.value) })} /></Field>
          <Field label="Salary Min"><TextInput type="number" value={form.salaryMin || ''} onChange={e => setForm({ ...form, salaryMin: Number(e.target.value) })} /></Field>
          <Field label="Salary Max"><TextInput type="number" value={form.salaryMax || ''} onChange={e => setForm({ ...form, salaryMax: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Closing Date"><TextInput type="date" value={form.closingDate || ''} onChange={e => setForm({ ...form, closingDate: e.target.value })} /></Field>
        <Field label="Description"><TextArea rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Requirements"><TextArea rows={3} value={form.requirements || ''} onChange={e => setForm({ ...form, requirements: e.target.value })} /></Field>
      </Modal>

      {/* Applicant Modal */}
      <Modal open={appOpen} onClose={() => setAppOpen(false)} title={appEditing ? 'Edit Applicant' : 'New Applicant'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setAppOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={saveApplicant}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Job Posting" required>
            <SelectInput value={appForm.jobPostingId || ''} onChange={e => setAppForm({ ...appForm, jobPostingId: e.target.value })}>
              <option value="">Select job...</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
            </SelectInput>
          </Field>
          <Field label="Source"><SelectInput value={appForm.source || 'Job Portal'} onChange={e => setAppForm({ ...appForm, source: e.target.value })}>{SOURCES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="First Name" required><TextInput value={appForm.firstName || ''} onChange={e => setAppForm({ ...appForm, firstName: e.target.value })} /></Field>
          <Field label="Last Name" required><TextInput value={appForm.lastName || ''} onChange={e => setAppForm({ ...appForm, lastName: e.target.value })} /></Field>
          <Field label="Email" required><TextInput type="email" value={appForm.email || ''} onChange={e => setAppForm({ ...appForm, email: e.target.value })} /></Field>
          <Field label="Phone"><TextInput value={appForm.phone || ''} onChange={e => setAppForm({ ...appForm, phone: e.target.value })} /></Field>
          <Field label="Stage"><SelectInput value={appForm.stage || 'Applied'} onChange={e => setAppForm({ ...appForm, stage: e.target.value })}>{STAGES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="Rating (1-5)"><TextInput type="number" min={1} max={5} value={appForm.rating || 3} onChange={e => setAppForm({ ...appForm, rating: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Interview Date"><TextInput type="date" value={appForm.interviewDate || ''} onChange={e => setAppForm({ ...appForm, interviewDate: e.target.value })} /></Field>
        <Field label="Resume URL"><TextInput value={appForm.resumeUrl || ''} onChange={e => setAppForm({ ...appForm, resumeUrl: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
