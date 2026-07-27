import { useState, useEffect, useCallback } from 'react';
import { Users, Upload, Plus, Pencil, Trash2, Search, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { EmptyState, Modal, LoadingSkeleton } from '@/shared/components/UIComponents';
import candidateService, { Candidate } from '@/features/candidates/services/candidateService';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /* Toast state */
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  /* Form state */
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* CSV state */
  const [csvError, setCsvError] = useState('');
  const [csvUploading, setCsvUploading] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  /* ── Fetch candidates ──────────────────────────────── */
  const fetchCandidates = useCallback(async () => {
    try {
      const data = await candidateService.getAll();
      setCandidates(data);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  /* ── Filtered candidates ───────────────────────────── */
  const filtered = candidates.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  });

  /* ── Form validation ───────────────────────────────── */
  const validateForm = (isEdit = false) => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Invalid email';
    if (!isEdit && !form.password.trim()) errors.password = 'Password is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Add candidate ─────────────────────────────────── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setActionLoading(true);
    try {
      await candidateService.create({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      showToast('success', 'Candidate added successfully');
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', password: '' });
      setFormErrors({});
      await fetchCandidates();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add candidate');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Edit candidate ────────────────────────────────── */
  const openEdit = (c: Candidate) => {
    setEditingId(c.candidate_id);
    setForm({ name: c.name, email: c.email, phone: c.phone || '', password: '' });
    setFormErrors({});
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !validateForm(true)) return;
    setActionLoading(true);
    try {
      await candidateService.update(editingId, {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
      });
      showToast('success', 'Candidate updated successfully');
      setShowEdit(false);
      setEditingId(null);
      setForm({ name: '', email: '', phone: '', password: '' });
      await fetchCandidates();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update candidate');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Delete candidate ──────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      await candidateService.delete(id);
      showToast('success', 'Candidate deleted');
      await fetchCandidates();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete candidate');
    }
  };

  /* ── CSV Upload ────────────────────────────────────── */
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    /* Client-side check */
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Please select a .csv file.');
      return;
    }

    setCsvError('');
    setCsvUploading(true);
    try {
      const result = await candidateService.uploadCSV(file);
      showToast('success', result.message || `Imported ${result.count} candidate(s)`);
      setShowUpload(false);
      setCsvError('');
      await fetchCandidates();
    } catch (err: any) {
      const detail = err.message || 'CSV upload failed';
      setCsvError(detail);
    } finally {
      setCsvUploading(false);
      /* Reset file input */
      e.target.value = '';
    }
  };

  if (loading) return <LoadingSkeleton rows={8} columns={4} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in ${toast.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-destructive/10 border border-destructive/30 text-destructive'
            }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="max-w-xs">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage interview candidates · {candidates.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowUpload(true); setCsvError(''); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-muted transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload CSV
          </button>
          <button
            onClick={() => { setShowAdd(true); setForm({ name: '', email: '', phone: '', password: '' }); setFormErrors({}); }}
            className="btn-gradient text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Candidate
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search candidates..."
          className="w-full h-9 pl-10 pr-4 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Table or Empty State */}
      {candidates.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates yet"
          description="Upload a CSV file or add candidates manually to get started."
          action={
            <button onClick={() => setShowAdd(true)} className="btn-gradient text-sm">
              Add Your First Candidate
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-sm text-muted-foreground">No candidates match your search.</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Phone</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.candidate_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-foreground font-medium">{c.name}</td>
                  <td className="p-4 text-muted-foreground">{c.email}</td>
                  <td className="p-4 text-muted-foreground">{c.phone || '—'}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.candidate_id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload CSV Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload CSV">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV with columns: <strong>name</strong>, <strong>email</strong> (required),
            <strong> phone</strong>, <strong>password</strong> (optional).
          </p>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Example CSV format:</p>
            <pre className="text-xs text-foreground font-mono">name,email,phone,password{'\n'}John Doe,john@example.com,1234567890,pass123{'\n'}Jane Smith,jane@example.com,,</pre>
          </div>

          {csvError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <pre className="whitespace-pre-wrap text-xs font-mono">{csvError}</pre>
            </div>
          )}

          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            disabled={csvUploading}
            className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer disabled:opacity-50"
          />

          {csvUploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Uploading and processing...
            </div>
          )}
        </div>
      </Modal>

      {/* Add Candidate Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Candidate">
        <form onSubmit={handleAdd} className="space-y-4">
          {(['name', 'email', 'phone', 'password'] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground capitalize">
                {field}{field === 'phone' ? ' (optional)' : ''}
              </label>
              <input
                type={field === 'email' ? 'email' : field === 'password' ? 'password' : 'text'}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder={`Enter ${field}`}
              />
              {formErrors[field] && <p className="text-xs text-destructive">{formErrors[field]}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn-gradient text-sm disabled:opacity-50">
              {actionLoading ? 'Adding...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Candidate Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Candidate">
        <form onSubmit={handleEdit} className="space-y-4">
          {(['name', 'email', 'phone'] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground capitalize">
                {field}{field === 'phone' ? ' (optional)' : ''}
              </label>
              <input
                type={field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder={`Enter ${field}`}
              />
              {formErrors[field] && <p className="text-xs text-destructive">{formErrors[field]}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn-gradient text-sm disabled:opacity-50">
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
