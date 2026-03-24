'use client';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, getToken, API_BASE } from '@/utils/auth';

interface Doc {
  id: string;
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  document_type: string;
  status: string;
  ocr_processed: boolean;
  created_at: string;
  approval_notes?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:          'bg-amber-100 text-amber-700',
  approved:         'bg-green-100 text-green-700',
  indexed:          'bg-blue-100 text-blue-700',
  rejected:         'bg-red-100 text-red-700',
  ingestion_failed: 'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  pending:          '⏳ Pending Review',
  approved:         '✅ Approved',
  indexed:          '🔍 In Knowledge Base',
  rejected:         '❌ Rejected',
  ingestion_failed: '⚠️ Ingestion Failed',
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UserDocumentsPage() {
  const [docs, setDocs]       = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    const params = filter !== 'all' ? `?doc_status=${filter}` : '';
    apiFetch<Doc[]>(`/documents${params}`)
      .then(d => setDocs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setUploadMsg('');
    setUploadErr('');

    const token = getToken();
    let successCount = 0;

    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      form.append('document_type', 'standard');
      try {
        await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }).then(r => r.json());
        successCount++;
      } catch {
        setUploadErr(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    if (successCount > 0) {
      setUploadMsg(
        `${successCount} file${successCount > 1 ? 's' : ''} submitted for review. ` +
        `Once approved by admin, they will be added to the knowledge base.`
      );
      load();
    }
  }

  const tabs = ['all', 'pending', 'indexed', 'rejected'];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
          <p className="text-gray-500 text-sm mt-1">Upload documents to the knowledge base — reviewed by admin before indexing.</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition"
        >
          {uploading ? (
            <><span className="animate-spin">⟳</span> Uploading…</>
          ) : (
            <><span>⬆️</span> Upload Document</>
          )}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
        className="hidden"
        onChange={handleUpload}
      />

      {uploadMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-2">
          <span>📋</span>
          <p>{uploadMsg}</p>
        </div>
      )}
      {uploadErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">{uploadErr}</div>
      )}

      {/* Info box */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-500 mb-5 flex gap-3">
        <span className="text-base">ℹ️</span>
        <div>
          <p className="font-medium text-gray-700 mb-0.5">How document approval works</p>
          <p>Uploaded documents are reviewed by the admin before being added to the AI knowledge base. Once indexed (🔍), the AI can use them to answer questions and fill document fields.</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => { setFilter(t); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
              filter === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'indexed' ? 'In KB' : t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-3">📂</p>
            <p className="text-sm font-medium text-gray-500">No documents yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload a PDF, image, or text file to get started</p>
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
                      <div>
                        <span className="text-gray-900 font-medium truncate max-w-[200px] block">{d.filename}</span>
                        {d.status === 'rejected' && d.approval_notes && (
                          <span className="text-xs text-red-500">Reason: {d.approval_notes}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{d.document_type?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtSize(d.file_size_bytes)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[d.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[d.status] ?? d.status?.replace(/_/g,' ')}
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
