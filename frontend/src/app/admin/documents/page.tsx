'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

type DocStatus = 'pending' | 'approved' | 'rejected' | 'processing';

interface AdminDocument {
  id: string;
  title: string;
  domain_name: string;
  uploader_email: string;
  status: DocStatus;
  file_size: number;
  page_count?: number;
  ocr_processed: boolean;
  ocr_confidence_avg?: number;
  has_flagged_pages: boolean;
  created_at: string;
}

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail ?? 'Request failed');
  return data;
}

const STATUS_CLASSES: Record<DocStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  processing: 'bg-blue-50 text-blue-700',
};

export default function AdminDocumentQueuePage() {
  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [filter, setFilter] = useState<DocStatus | ''>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDocs();
  }, [filter]);

  const loadDocs = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = filter ? `?status=${filter}` : '';
      const data = await apiFetch<AdminDocument[]>(`/documents${qs}`);
      setDocs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await apiFetch(`/documents/${id}/approve`, { method: 'PATCH' });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filterTabs: { label: string; value: DocStatus | '' }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: '' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Review Queue</h1>
      <p className="text-gray-500 text-sm mb-6">
        Review uploaded documents, check OCR quality, and approve for RAG indexing
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              filter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading documents…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Domain</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Uploader</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Size / Pages</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">OCR</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No documents found
                  </td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                      {doc.title}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{doc.domain_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{doc.uploader_email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatSize(doc.file_size)}
                      {doc.page_count ? ` / ${doc.page_count}p` : ''}
                    </td>
                    <td className="px-4 py-3">
                      {doc.ocr_processed ? (
                        <span
                          className={`text-xs font-medium ${
                            doc.has_flagged_pages
                              ? 'text-amber-600'
                              : 'text-green-600'
                          }`}
                        >
                          {doc.ocr_confidence_avg != null
                            ? `${Math.round(doc.ocr_confidence_avg * 100)}%`
                            : 'Done'}
                          {doc.has_flagged_pages && ' ⚠'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[doc.status]}`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a
                          href={`/admin/documents/${doc.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                        >
                          Review
                        </a>
                        {doc.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(doc.id)}
                            disabled={actionLoading === doc.id}
                            className="text-green-600 hover:text-green-800 font-medium text-xs disabled:opacity-50"
                          >
                            {actionLoading === doc.id ? '…' : 'Quick Approve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
