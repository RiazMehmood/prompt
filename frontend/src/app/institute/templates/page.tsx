'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Submission {
  id: string;
  name: string;
  description: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
  template_id: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending:  '⏳ Pending Review',
  approved: '✅ Approved & Live',
  rejected: '❌ Rejected',
};

export default function InstituteTemplatesPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [msg, setMsg]                 = useState('');
  const [err, setErr]                 = useState('');

  // Form state
  const [name, setName]           = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent]     = useState('');

  const load = () => {
    setLoading(true);
    apiFetch<Submission[]>('/templates/submissions')
      .then(d => setSubmissions(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function submit() {
    if (!name.trim() || !content.trim()) {
      setErr('Name and template content are required.');
      return;
    }
    // Auto-detect slots from {{slot_name}} placeholders
    const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
    const slot_definitions = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))]
      .map(s => ({ name: s, type: 'text', required: true, data_source: 'user_input', label: s.replace(/_/g, ' ') }));

    setSubmitting(true);
    setErr('');
    setMsg('');
    try {
      await apiFetch('/templates/submissions', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim(), content: content.trim(), slot_definitions }),
      });
      setMsg('Template submitted for review. You will see the status update here once reviewed by admin.');
      setShowForm(false);
      setName(''); setDescription(''); setContent('');
      load();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to submit template.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Submit custom document templates for your institution. Admin reviews before going live.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setErr(''); setMsg(''); }}
          className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition"
        >
          {showForm ? 'Cancel' : '+ Submit Template'}
        </button>
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm mb-5">{msg}</div>
      )}

      {/* Submission form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">New Template Submission</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Template Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Employment Contract"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of what this template is for"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Template Content *</label>
              <p className="text-xs text-gray-400 mb-2">Use <code className="bg-gray-100 px-1 rounded">{'{{field_name}}'}</code> for dynamic fields. e.g. <code className="bg-gray-100 px-1 rounded">{'{{accused_name}}'}</code></p>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={12}
                placeholder={`EMPLOYMENT CONTRACT\n\nThis contract is between {{employer_name}} and {{employee_name}}...\n\nPosition: {{position}}\nStart Date: {{start_date}}`}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-gray-400 resize-y"
              />
              {content && (
                <p className="text-xs text-gray-400 mt-1">
                  Detected fields: {[...new Set((content.match(/\{\{(\w+)\}\}/g) ?? []).map(m => m.replace(/[{}]/g, '')))]
                    .map(s => <code key={s} className="bg-gray-100 px-1 rounded mx-0.5">{s}</code>)}
                </p>
              )}
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button
              onClick={submit}
              disabled={submitting}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition"
            >
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}

      {/* Submissions list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-3">📝</p>
            <p className="text-sm font-medium text-gray-500">No template submissions yet</p>
            <p className="text-xs text-gray-400 mt-1">Submit a custom template to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Template', 'Status', 'Notes', 'Submitted'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {submissions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                    {s.review_notes ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
