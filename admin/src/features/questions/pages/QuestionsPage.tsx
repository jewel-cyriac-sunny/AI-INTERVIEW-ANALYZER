import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Pencil, Trash2, Search, CheckCircle2, AlertCircle, X, Clock } from 'lucide-react';
import { EmptyState, Modal, LoadingSkeleton } from '@/shared/components/UIComponents';
import questionService, { Question } from '@/features/questions/services/questionService';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /* Toast state */
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  /* Form state */
  const [form, setForm] = useState({ text: '', keywords: [] as string[], time_limit: 120 });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [keywordInput, setKeywordInput] = useState('');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  /* ── Fetch questions ──────────────────────────────── */
  const fetchQuestions = useCallback(async () => {
    try {
      const data = await questionService.getAll();
      setQuestions(data);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  /* ── Filtered questions ───────────────────────────── */
  const filtered = questions.filter((q) => {
    const query = search.toLowerCase();
    return (
      q.text.toLowerCase().includes(query) ||
      (q.keywords || []).some(k => k.toLowerCase().includes(query))
    );
  });

  /* ── Keyword Input Handlers ───────────────────────── */
  const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = keywordInput.trim();
      if (val && !form.keywords.includes(val)) {
        setForm(prev => ({ ...prev, keywords: [...prev.keywords, val] }));
      }
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setForm(prev => ({
      ...prev,
      keywords: prev.keywords.filter(kw => kw !== kwToRemove)
    }));
  };

  /* ── Form validation ───────────────────────────────── */
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.text.trim()) errors.text = 'Question text is required';
    if (!form.time_limit || form.time_limit < 15) errors.time_limit = 'Time limit must be at least 15 seconds';
    if (form.time_limit > 300) errors.time_limit = 'Time limit cannot exceed 300 seconds (5 minutes)';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Add question ─────────────────────────────────── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setActionLoading(true);
    try {
      await questionService.create({
        text: form.text,
        keywords: form.keywords,
        time_limit: form.time_limit
      });
      showToast('success', 'Question added successfully');
      setShowAdd(false);
      setForm({ text: '', keywords: [], time_limit: 120 });
      setKeywordInput('');
      setFormErrors({});
      await fetchQuestions();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add question');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Edit question ────────────────────────────────── */
  const openEdit = (q: Question) => {
    setEditingId(q.question_id);
    setForm({
      text: q.text,
      keywords: q.keywords || [],
      time_limit: q.time_limit || 120,
    });
    setKeywordInput('');
    setFormErrors({});
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !validateForm()) return;
    setActionLoading(true);
    try {
      await questionService.update(editingId, {
        text: form.text,
        keywords: form.keywords,
        time_limit: form.time_limit
      });
      showToast('success', 'Question updated successfully');
      setShowEdit(false);
      setEditingId(null);
      setForm({ text: '', keywords: [], time_limit: 120 });
      setKeywordInput('');
      await fetchQuestions();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update question');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Delete question ──────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await questionService.delete(id);
      showToast('success', 'Question deleted');
      await fetchQuestions();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete question');
    }
  };

  const closeModal = () => {
    setShowAdd(false);
    setShowEdit(false);
  };

  if (loading) return <LoadingSkeleton rows={6} columns={3} />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Question Datasets</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage interview questions, expected keywords, and time limits</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setForm({ text: '', keywords: [], time_limit: 120 }); setFormErrors({}); setKeywordInput(''); }}
          className="btn-gradient text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by text or keywords..."
          className="w-full h-9 pl-10 pr-4 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No questions yet"
          description="Create interview questions that will be used by the AI analyzer."
          action={
            <button onClick={() => setShowAdd(true)} className="btn-gradient text-sm">
              Create Your First Question
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-sm text-muted-foreground">No questions match your search.</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium w-1/2">Question</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Keywords</th>
                <th className="text-center p-4 text-muted-foreground font-medium">Time Limit</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.question_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 align-top">
                    <p className="font-medium text-foreground line-clamp-2">{q.text}</p>
                  </td>
                  <td className="p-4 align-top">
                    {q.keywords && q.keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {q.keywords.map((kw, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border">
                            {kw}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">No keywords</span>
                    )}
                  </td>
                  <td className="p-4 align-top text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {q.time_limit}s
                    </div>
                  </td>
                  <td className="p-4 text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      <button
                         onClick={() => openEdit(q)}
                         className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                         title="Edit"
                       >
                         <Pencil className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => handleDelete(q.question_id)}
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

      {/* Add/Edit Modal */}
      <Modal
        open={showAdd || showEdit}
        onClose={closeModal}
        title={showAdd ? "Add Question" : "Edit Question"}
      >
        <form onSubmit={showAdd ? handleAdd : handleEdit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Question Text</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              placeholder="Enter the interview question..."
            />
            {formErrors.text && <p className="text-xs text-destructive">{formErrors.text}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Expected Keywords</label>
            <p className="text-xs text-muted-foreground mb-2">Type a keyword and press Enter or comma to add.</p>
            <div className="p-2 rounded-lg bg-secondary border border-border min-h-[42px] focus-within:ring-2 focus-within:ring-primary/50 transition-all">
              <div className="flex flex-wrap gap-2">
                {form.keywords.map((kw, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    {kw}
                    <button type="button" onClick={() => handleRemoveKeyword(kw)} className="hover:text-primary/70 focus:outline-none ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleAddKeyword}
                  placeholder={form.keywords.length === 0 ? "e.g. JavaScript, Performance" : ""}
                  className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Time Limit (seconds)</label>
            <input
              type="number"
              min={15}
              max={300}
              value={form.time_limit}
              onChange={(e) => setForm({ ...form, time_limit: parseInt(e.target.value, 10) || 15 })}
              className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            {formErrors.time_limit && <p className="text-xs text-destructive">{formErrors.time_limit}</p>}
            <p className="text-xs text-muted-foreground mt-1">Limits: 15 seconds to 5 minutes (300 seconds).</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn-gradient text-sm disabled:opacity-50">
              {actionLoading ? 'Saving...' : showAdd ? 'Add Question' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
