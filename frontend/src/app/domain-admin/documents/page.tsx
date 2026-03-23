'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Doc { id: string; filename: string; status: string; uploaded_by: string; created_at: string; profiles?: { email: string } | null; }

const STATUS_COLORS: Record<string,string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  indexed: 'bg-blue-100 text-blue-700',
};

export default function DomainDocumentsPage() {
  const [docs, setDocs]     = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true); setError('');
    try {
      const d = await apiFetch<any>(`/documents?status=${statusFilter}&page_size=50`);
      setDocs(d.documents ?? d ?? []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function approve(id: string) {
    try { await apiFetch(`/documents/${id}/approve`, { method: 'POST' }); load(); }
    catch (e: any) { alert(e.message); }
  }

  async function reject(id: string) {
    const reason = prompt('Rejection reason (optional):') ?? '';
    try { await apiFetch(`/documents/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }); load(); }
    catch (e: any) { alert(e.message); }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Queue</h1>
        <div className="flex gap-2">
          {['pending','approved','rejected','indexed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition ${statusFilter===s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Filename','Uploaded By','Status','Date','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : docs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No {statusFilter} documents</td></tr>
            ) : docs.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{doc.filename}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{(doc.profiles as any)?.email ?? doc.uploaded_by?.slice(0,8)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>{doc.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(doc.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 flex gap-2">
                  {doc.status === 'pending' && (
                    <>
                      <button onClick={() => approve(doc.id)} className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700">Approve</button>
                      <button onClick={() => reject(doc.id)} className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
