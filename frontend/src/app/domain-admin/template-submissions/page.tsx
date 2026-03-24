'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Submission {
  id: string;
  name: string;
  description: string | null;
  content: string;
  slot_definitions: any[];
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

export default function TemplateSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [preview, setPreview]         = useState<Submission | null>(null);
  const [notes, setNotes]             = useState('');
  const [acting, setActing]           = useState(false);
  const [msg, setMsg]                 = useState('');

  const load = () => {
    setLoading(true);
    apiFetch<Submission[]>('/templates/submissions')
      .then(d => setSubmissions(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function review(action: 'approve' | 'reject') {
    if (!preview) return;
    setActing(true);
    setMsg('');
    try {
      await apiFetch(`/templates/submissions/${preview.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ action, review_notes: notes }),
      });
      setMsg(action === 'approve' ? '✅ Template approved and is now live.' : '❌ Template rejected.');
      setPreview(null);
      setNotes('');
      load();
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setActing(false);
    }
  }

  const pending = submissions.filter(s => s.status === 'pending');
  const reviewed = submissions.filter(s => s.status !== 'pending');

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Template Submissions</h1>
      <p className="text-gray-500 text-sm mb-6">Review custom templates submitted by users and institutes. Approved templates go live in the domain.</p>

      {msg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm mb-5">{msg}</div>
      )}

      {/* Preview / review panel */}
      {preview && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{preview.name}</h2>
              {preview.description && <p className="text-sm text-gray-500 mt-0.5">{preview.description}</p>}
            </div>
            <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
          </div>

          {/* Detected slots */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Detected Fields ({preview.slot_definitions.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {preview.slot_definitions.map((s: any) => (
                <span key={s.name} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-mono">{`{{${s.name}}}`}</span>
              ))}
            </div>
          </div>

          {/* Template content preview */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Template Content</p>
            <pre className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap font-mono">
              {preview.content}
            </pre>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Review Notes (optional)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Approved with minor adjustments needed / Missing required fields"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => review('approve')}
              disabled={acting}
              className="px-5 py-2.5 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-40 transition"
            >
              {acting ? '…' : '✅ Approve & Publish'}
            </button>
            <button
              onClick={() => review('reject')}
              disabled={acting}
              className="px-5 py-2.5 bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-200 disabled:opacity-40 transition"
            >
              {acting ? '…' : '❌ Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Pending submissions */}
      <h2 className="font-semibold text-gray-800 mb-3">
        Pending Review <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">{pending.length}</span>
      </h2>
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading…</div>
      ) : pending.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl text-center py-8 text-gray-400 text-sm mb-6">No pending submissions.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Template', 'Fields', 'Submitted', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.slot_definitions.length} fields</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setPreview(s); setNotes(''); setMsg(''); }}
                      className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reviewed submissions */}
      {reviewed.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-800 mb-3">Previously Reviewed</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Template', 'Status', 'Notes', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reviewed.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.review_notes ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
