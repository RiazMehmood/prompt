'use client';
import { useRef, useState } from 'react';
import { apiFetch, API_BASE, authHeader, getUser } from '@/utils/auth';

interface ImportRow { email: string; password: string; subscription_tier?: string; }
interface ImportResult { email: string; status: 'created' | 'failed'; error?: string; }

export default function BulkImportPage() {
  const fileRef           = useRef<HTMLInputElement>(null);
  const [rows, setRows]   = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep]   = useState<'upload' | 'preview' | 'done'>('upload');
  const [error, setError] = useState('');

  function parseCSV(text: string): ImportRow[] {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      return { email: obj.email, password: obj.password, subscription_tier: obj.subscription_tier || 'basic' };
    }).filter(r => r.email && r.password);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target?.result as string);
        if (parsed.length === 0) { setError('No valid rows found. Ensure CSV has email and password columns.'); return; }
        setRows(parsed);
        setStep('preview');
      } catch { setError('Failed to parse CSV file.'); }
    };
    reader.readAsText(file);
  }

  async function runImport() {
    setImporting(true);
    const u = getUser();
    const res: ImportResult[] = [];
    for (const row of rows) {
      try {
        await apiFetch('/admin/create-user', {
          method: 'POST',
          body: JSON.stringify({ email: row.email, password: row.password, subscription_tier: row.subscription_tier, institute_id: u?.institute_id }),
        });
        res.push({ email: row.email, status: 'created' });
      } catch (e: any) {
        res.push({ email: row.email, status: 'failed', error: e.message });
      }
    }
    setResults(res);
    setStep('done');
    setImporting(false);
  }

  const created = results.filter(r => r.status === 'created').length;
  const failed  = results.filter(r => r.status === 'failed').length;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bulk Member Import</h1>
      <p className="text-gray-500 text-sm mb-6">Upload a CSV to create multiple accounts at once.</p>

      {step === 'upload' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          {/* Template download */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-blue-800 mb-1">CSV Format</p>
            <p className="text-xs text-blue-600 font-mono">email,password,subscription_tier</p>
            <p className="text-xs text-blue-600 font-mono">student1@school.edu,Temp1234!,basic</p>
            <button
              onClick={() => {
                const csv = 'email,password,subscription_tier\nstudent1@school.edu,Temp1234!,basic\nstudent2@school.edu,Temp1234!,basic';
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                a.download = 'import_template.csv';
                a.click();
              }}
              className="mt-2 text-xs text-blue-700 underline hover:text-blue-900"
            >
              Download template CSV
            </button>
          </div>

          {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>}

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-10 cursor-pointer hover:border-gray-400 transition">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm font-medium text-gray-700">Click to choose CSV file</p>
            <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
        </div>
      )}

      {step === 'preview' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{rows.length} accounts to import</h2>
            <button onClick={() => { setRows([]); setStep('upload'); if (fileRef.current) fileRef.current.value = ''; }}
              className="text-xs text-gray-500 hover:text-gray-700 underline">Start over</button>
          </div>

          <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl mb-5">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500">#</th>
                  <th className="text-left px-4 py-2 text-gray-500">Email</th>
                  <th className="text-left px-4 py-2 text-gray-500">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2 text-gray-900">{r.email}</td>
                    <td className="px-4 py-2 text-gray-500 capitalize">{r.subscription_tier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={runImport} disabled={importing}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 transition">
            {importing ? `Importing… (${results.length}/${rows.length})` : `Import ${rows.length} Accounts`}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex gap-4 mb-5">
            <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{created}</p>
              <p className="text-xs text-green-600 mt-1">Created</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{failed}</p>
              <p className="text-xs text-red-500 mt-1">Failed</p>
            </div>
          </div>

          {failed > 0 && (
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl mb-4">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-500">Email</th>
                    <th className="text-left px-4 py-2 text-gray-500">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {results.filter(r => r.status === 'failed').map((r, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-4 py-2 text-gray-700">{r.email}</td>
                      <td className="px-4 py-2 text-red-600">{r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <a href="/institute-admin/users" className="flex-1 text-center bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition">
              View Members
            </a>
            <button onClick={() => { setRows([]); setResults([]); setStep('upload'); }}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
