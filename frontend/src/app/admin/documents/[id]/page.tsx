'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface OCRFlaggedPage {
  page_number: number;
  confidence: number;
  extracted_text_preview: string;
}

interface DocumentDetail {
  id: string;
  title: string;
  domain_name: string;
  uploader_email: string;
  status: string;
  file_size: number;
  page_count: number;
  extracted_text: string;
  ocr_processed: boolean;
  ocr_confidence_avg?: number;
  ocr_flagged_pages: OCRFlaggedPage[];
  detected_language?: string;
  rejection_reason?: string;
  created_at: string;
}

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? data?.detail ?? 'Request failed');
  return data;
}

export default function DocumentReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [params.id]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DocumentDetail>(`/documents/${params.id}`);
      setDoc(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/documents/${params.id}/approve`, { method: 'PATCH' });
      router.push('/admin/documents');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      await apiFetch(`/documents/${params.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectionReason }),
      });
      router.push('/admin/documents');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading document…</div>;
  }

  if (!doc) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Document not found'}</p>
      </div>
    );
  }

  const isRTL = ['urdu', 'sindhi'].includes(doc.detected_language?.toLowerCase() ?? '');
  const previewText = showFullText
    ? doc.extracted_text
    : doc.extracted_text?.slice(0, 2000) + (doc.extracted_text?.length > 2000 ? '…' : '');

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/admin/documents')}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Back to Queue
        </button>
        <h1 className="text-xl font-bold text-gray-900 truncate">{doc.title}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* OCR Confidence Summary */}
          {doc.ocr_processed && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-800 mb-3">OCR Results</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Avg Confidence</p>
                  <p
                    className={`text-lg font-bold ${
                      (doc.ocr_confidence_avg ?? 0) >= 0.7 ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {doc.ocr_confidence_avg != null
                      ? `${Math.round(doc.ocr_confidence_avg * 100)}%`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Flagged Pages</p>
                  <p className="text-lg font-bold text-gray-900">
                    {doc.ocr_flagged_pages.length}
                    <span className="text-sm font-normal text-gray-500"> / {doc.page_count}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Detected Language</p>
                  <p className="text-sm font-semibold text-gray-700 capitalize">
                    {doc.detected_language ?? '—'}
                  </p>
                </div>
              </div>

              {/* Flagged pages */}
              {doc.ocr_flagged_pages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-2">
                    ⚠ Pages needing attention:
                  </p>
                  <div className="space-y-2">
                    {doc.ocr_flagged_pages.map((page) => (
                      <div
                        key={page.page_number}
                        className="bg-amber-50 rounded-lg p-3 text-xs"
                      >
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold text-amber-800">
                            Page {page.page_number}
                          </span>
                          <span className="text-amber-600">
                            {Math.round(page.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p
                          className={`text-gray-600 truncate ${isRTL ? 'text-right dir-rtl' : ''}`}
                        >
                          {page.extracted_text_preview}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extracted Text Preview */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">Extracted Text</h2>
              {doc.extracted_text?.length > 2000 && (
                <button
                  onClick={() => setShowFullText((v) => !v)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showFullText ? 'Show Less' : 'Show Full Text'}
                </button>
              )}
            </div>
            <pre
              className={`text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto ${
                isRTL ? 'text-right direction-rtl' : ''
              }`}
              style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } as any : {}}
            >
              {previewText || 'No text extracted'}
            </pre>
          </div>
        </div>

        {/* Sidebar — document metadata + actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">Document Info</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500 text-xs">Domain</dt>
                <dd className="font-medium text-gray-800">{doc.domain_name}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Uploaded by</dt>
                <dd className="text-gray-700 truncate">{doc.uploader_email}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Date</dt>
                <dd className="text-gray-700">
                  {new Date(doc.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Pages</dt>
                <dd className="text-gray-700">{doc.page_count}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Current Status</dt>
                <dd>
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium capitalize">
                    {doc.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {doc.status === 'pending' && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
              <h2 className="font-semibold text-gray-800 mb-2">Decision</h2>

              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading ? '…' : '✓ Approve & Index'}
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rejection Reason
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
                  rows={3}
                  placeholder="Reason for rejection…"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="w-full mt-2 bg-red-50 text-red-700 border border-red-200 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                >
                  {actionLoading ? '…' : '✗ Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
