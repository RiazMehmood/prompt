'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface SlotDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  max_length?: number;
  options?: string[];
  source: 'user_input' | 'rag_retrieval' | 'either';
}

interface FormattingRules {
  paper_size: string;
  font_family: string;
  rtl_supported: boolean;
  output_languages: string[];
}

interface TemplateForm {
  name: string;
  description: string;
  category: string;
  domain_id: string;
  template_content: string;
  slot_definitions: SlotDefinition[];
  formatting_rules: FormattingRules;
  is_active: boolean;
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

const defaultSlot = (): SlotDefinition => ({
  name: '',
  label: '',
  type: 'text',
  required: true,
  source: 'user_input',
});

const defaultFormatting = (): FormattingRules => ({
  paper_size: 'A4',
  font_family: 'Helvetica',
  rtl_supported: false,
  output_languages: ['english'],
});

export default function TemplateEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';

  const [form, setForm] = useState<TemplateForm>({
    name: '',
    description: '',
    category: '',
    domain_id: '',
    template_content: '',
    slot_definitions: [defaultSlot()],
    formatting_rules: defaultFormatting(),
    is_active: true,
  });
  const [domains, setDomains] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDomains();
    if (!isNew) loadTemplate();
  }, [params.id]);

  const loadDomains = async () => {
    try {
      const data = await apiFetch<{ id: string; name: string }[]>('/domains');
      setDomains(data);
    } catch {}
  };

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<TemplateForm & { slot_definitions: SlotDefinition[] }>(
        `/templates/${params.id}`
      );
      setForm(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotChange = (index: number, field: keyof SlotDefinition, value: string | boolean) => {
    setForm((prev) => {
      const slots = [...prev.slot_definitions];
      slots[index] = { ...slots[index], [field]: value };
      return { ...prev, slot_definitions: slots };
    });
  };

  const addSlot = () => {
    setForm((prev) => ({
      ...prev,
      slot_definitions: [...prev.slot_definitions, defaultSlot()],
    }));
  };

  const removeSlot = (index: number) => {
    setForm((prev) => ({
      ...prev,
      slot_definitions: prev.slot_definitions.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      if (isNew) {
        await apiFetch('/templates', { method: 'POST', body: JSON.stringify(form) });
        setSuccess('Template created successfully');
        router.push('/admin/templates');
      } else {
        await apiFetch(`/templates/${params.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        setSuccess('Template saved successfully');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading template…</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/admin/templates')}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Create Template' : 'Edit Template'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm mb-4">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="e.g., Bail Application"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={form.domain_id}
                onChange={(e) => setForm((p) => ({ ...p, domain_id: e.target.value }))}
              >
                <option value="">Select domain…</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Template Content */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Template Content</h2>
          <p className="text-xs text-gray-500 mb-3">
            Use <code className="bg-gray-100 px-1 rounded">{`{{slot_name}}`}</code> syntax for dynamic slots
          </p>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows={10}
            value={form.template_content}
            onChange={(e) => setForm((p) => ({ ...p, template_content: e.target.value }))}
            placeholder="IN THE COURT OF...\n\nRe: Bail Application for {{accused_name}}\nFIR No: {{fir_number}}\n..."
          />
        </div>

        {/* Slot Definitions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Slot Definitions</h2>
            <button
              onClick={addSlot}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Slot
            </button>
          </div>

          <div className="space-y-3">
            {form.slot_definitions.map((slot, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Slot Name
                    </label>
                    <input
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={slot.name}
                      onChange={(e) => handleSlotChange(i, 'name', e.target.value)}
                      placeholder="accused_name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                    <input
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={slot.label}
                      onChange={(e) => handleSlotChange(i, 'label', e.target.value)}
                      placeholder="Accused Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={slot.type}
                      onChange={(e) => handleSlotChange(i, 'type', e.target.value)}
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="date">Date</option>
                      <option value="number">Number</option>
                      <option value="select">Select</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                    <select
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={slot.source}
                      onChange={(e) => handleSlotChange(i, 'source', e.target.value)}
                    >
                      <option value="user_input">User Input</option>
                      <option value="rag_retrieval">RAG Retrieval</option>
                      <option value="either">Either</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      checked={slot.required}
                      onChange={(e) => handleSlotChange(i, 'required', e.target.checked)}
                      className="rounded"
                      id={`req-${i}`}
                    />
                    <label htmlFor={`req-${i}`} className="text-xs text-gray-600">Required</label>
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      onClick={() => removeSlot(i)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formatting Rules */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Formatting Rules</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.formatting_rules.paper_size}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    formatting_rules: { ...p.formatting_rules, paper_size: e.target.value },
                  }))
                }
              >
                <option value="A4">A4</option>
                <option value="Legal">Legal (8.5×14)</option>
                <option value="Letter">Letter</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="rtl"
                checked={form.formatting_rules.rtl_supported}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    formatting_rules: { ...p.formatting_rules, rtl_supported: e.target.checked },
                  }))
                }
              />
              <label htmlFor="rtl" className="text-sm text-gray-700">RTL (Urdu/Sindhi) Support</label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : isNew ? 'Create Template' : 'Save Changes'}
          </button>
          <button
            onClick={() => router.push('/admin/templates')}
            className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
