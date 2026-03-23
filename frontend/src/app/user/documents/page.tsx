'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Doc {
  id: string;
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  document_type: string;
  status: string;
  ocr_processed: boolean;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  indexed:   'bg-blue-100 text-blue-700',
  rejected:  'bg-red-100 text-red-700',
  ingestion_failed: 'bg-red-100 text-red-600',
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UserDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const params = filter !== 'all' ? `?doc_status=${filter}` : '';
    apiFetch<Doc[]>(`/documents${params}`)
      .then(d => setDocs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const tabs = ['all', 'pending', 'approved', 'indexed', 'rejected'];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Documents</h1>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => { setFilter(t); setLoading(true); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
              filter === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No documents found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['File', 'Type', 'Size', 'Status', 'Uploaded'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {docs.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📄</span>
                      <span className="text-gray-900 font-medium truncate max-w-[200px]">{d.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{d.document_type?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtSize(d.file_size_bytes)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[d.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {d.status?.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
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
