import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import api from "../../shared/api/api";

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface FaqsResponse {
  success: boolean;
  message: string;
  data: Faq[];
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

interface FaqFormState {
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  sortOrder: string;
}

type FormErrors = Partial<
  Record<keyof FaqFormState, string>
>;

interface ToastState {
  type: "success" | "error";
  message: string;
}

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const emptyForm: FaqFormState = {
  question: "",
  answer: "",
  category: "",
  isActive: true,
  sortOrder: "0",
};

const inputClass =
  "h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100";

const textareaClass =
  "min-h-28 w-full resize-y rounded-control border border-border bg-surface px-3.5 py-3 text-sm leading-6 text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100";

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      fallbackMessage
    );
  }

  return fallbackMessage;
};

/*
|--------------------------------------------------------------------------
| Icons
|--------------------------------------------------------------------------
*/

function FaqPageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
      <path d="M8 14a4 4 0 0 0 8 0" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8" />
      <path d="M5.5 15A7 7 0 0 0 17.8 17.8L20 16" />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| API Calls
|--------------------------------------------------------------------------
*/

const getFaqs = async (): Promise<Faq[]> => {
  const response =
    await api.get<FaqsResponse>("/admin/faqs");
  return response.data.data;
};

const createFaq = async (
  payload: FaqFormState
): Promise<Faq> => {
  const response = await api.post<{
    success: boolean;
    data: Faq;
  }>("/admin/faqs", payload);
  return response.data.data;
};

const updateFaq = async (
  id: string,
  payload: FaqFormState
): Promise<Faq> => {
  const response = await api.put<{
    success: boolean;
    data: Faq;
  }>(`/admin/faqs/${id}`, payload);
  return response.data.data;
};

const deleteFaq = async (id: string): Promise<void> => {
  await api.delete(`/admin/faqs/${id}`);
};

/*
|--------------------------------------------------------------------------
| Main Page
|--------------------------------------------------------------------------
*/

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] =
    useState<Faq | null>(null);
  const [form, setForm] = useState<FaqFormState>(
    emptyForm
  );
  const [formErrors, setFormErrors] =
    useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] =
    useState<ToastState | null>(null);

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return faqs;
    }

    return faqs.filter((faq) => {
      const questionMatch =
        faq.question.toLowerCase().includes(
          query
        );
      const answerMatch =
        faq.answer.toLowerCase().includes(query);
      const categoryMatch =
        (faq.category || "")
          .toLowerCase()
          .includes(query);

      return (
        questionMatch ||
        answerMatch ||
        categoryMatch
      );
    });
  }, [faqs, searchQuery]);

  const showToast = (
    type: ToastState["type"],
    message: string
  ) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const loadFaqs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getFaqs();
      setFaqs(data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load FAQs."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  const openCreateForm = () => {
    setEditingFaq(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEditForm = (faq: Faq) => {
    setEditingFaq(faq);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "",
      isActive: faq.isActive,
      sortOrder: String(faq.sortOrder),
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingFaq(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};

    if (!form.question.trim()) {
      errors.question =
        "Please enter a question.";
    } else if (form.question.trim().length < 3) {
      errors.question =
        "Question must be at least 3 characters.";
    }

    if (!form.answer.trim()) {
      errors.answer = "Please enter an answer.";
    } else if (form.answer.trim().length < 5) {
      errors.answer =
        "Answer must be at least 5 characters.";
    }

    const parsedSortOrder = Number(form.sortOrder);

    if (
      !Number.isInteger(parsedSortOrder) ||
      parsedSortOrder < 0
    ) {
      errors.sortOrder =
        "Please enter a valid non-negative sort order.";
    }

    return errors;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const validationErrors = validateForm();
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category.trim() || null,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (editingFaq) {
        await updateFaq(editingFaq.id, payload);
        showToast(
          "success",
          "FAQ updated successfully."
        );
      } else {
        await createFaq(payload);
        showToast(
          "success",
          "FAQ created successfully."
        );
      }

      await loadFaqs();
      closeForm();
    } catch (requestError) {
      showToast(
        "error",
        getApiErrorMessage(
          requestError,
          "Unable to save FAQ."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (faq: Faq) => {
    if (
      !window.confirm(
        `Delete this FAQ? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteFaq(faq.id);
      showToast(
        "success",
        "FAQ deleted successfully."
      );
      await loadFaqs();
    } catch (requestError) {
      showToast(
        "error",
        getApiErrorMessage(
          requestError,
          "Unable to delete FAQ."
        )
      );
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-ui-xl font-extrabold text-text-main">
              FAQs
            </h1>
            <p className="mt-1 text-ui-sm text-text-muted">
              Manage frequently asked questions shown
              on the contact page.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-10 items-center gap-2 rounded-control bg-primary-700 px-4 text-xs font-extrabold text-white transition hover:bg-primary-800"
          >
            <PlusIcon />
            Add FAQ
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search questions, answers or categories..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <button
            type="button"
            onClick={loadFaqs}
            className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-4 text-xs font-extrabold text-text-secondary transition hover:bg-surface-muted"
          >
            <RefreshIcon />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </div>
      )}

      {toast && (
        <div
          className={`rounded-control border px-4 py-3 text-sm font-bold ${
            toast.type === "success"
              ? "border-success/30 bg-success-soft text-success"
              : "border-danger/30 bg-danger-soft text-danger"
          }`}
        >
          {toast.message}
        </div>
      )}

      {formOpen && (
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-ui-lg font-extrabold text-text-main">
                {editingFaq ? "Edit FAQ" : "Add FAQ"}
              </h2>
              <p className="mt-1 text-ui-sm text-text-muted">
                {editingFaq
                  ? "Update the question, answer and settings below."
                  : "Fill in the details to add a new FAQ entry."}
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-text-muted transition hover:bg-surface-muted"
            >
              <CloseIcon />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-5 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-text-secondary">
                Question *
              </label>
              <input
                type="text"
                value={form.question}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    question: event.target.value,
                  }))
                }
                className={`${inputClass} mt-1`}
                placeholder="Enter the frequently asked question"
              />
              {formErrors.question && (
                <p className="mt-1 text-xs font-semibold text-danger">
                  {formErrors.question}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-text-secondary">
                Answer *
              </label>
              <textarea
                value={form.answer}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    answer: event.target.value,
                  }))
                }
                rows={5}
                className={`${textareaClass} mt-1`}
                placeholder="Enter the answer"
              />
              {formErrors.answer && (
                <p className="mt-1 text-xs font-semibold text-danger">
                  {formErrors.answer}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-extrabold text-text-secondary">
                Category
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className={`${inputClass} mt-1`}
                placeholder="e.g. Booking, Payments, Property"
              />
              <p className="mt-1 text-[11px] text-text-soft">
                Optional grouping label for FAQs.
              </p>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-text-secondary">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
                className={`${inputClass} mt-1`}
                placeholder="0"
                min="0"
              />
              {formErrors.sortOrder && (
                <p className="mt-1 text-xs font-semibold text-danger">
                  {formErrors.sortOrder}
                </p>
              )}
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-extrabold text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-primary-700"
                />
                Active
              </label>
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-control bg-primary-700 px-5 text-xs font-extrabold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingFaq
                  ? "Update FAQ"
                  : "Create FAQ"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="h-10 rounded-control border border-border bg-surface px-5 text-xs font-extrabold text-text-secondary transition hover:bg-surface-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60">
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wide text-text-muted">
                  Question
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wide text-text-muted">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wide text-text-muted">
                  Sort
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wide text-text-muted">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-extrabold uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-xs font-semibold text-text-muted"
                  >
                    Loading FAQs...
                  </td>
                </tr>
              ) : filteredFaqs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-xs font-semibold text-text-muted"
                  >
                    {searchQuery
                      ? "No FAQs match your search."
                      : "No FAQs yet. Add your first question using the button above."}
                  </td>
                </tr>
              ) : (
                filteredFaqs.map((faq) => (
                  <tr
                    key={faq.id}
                    className="transition hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3">
                      <div className="max-w-md">
                        <p className="truncate font-semibold text-text-main">
                          {faq.question}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                          {faq.answer}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {faq.category || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                          faq.isActive
                            ? "bg-success-soft text-success"
                            : "bg-surface-muted text-text-muted"
                        }`}
                      >
                        {faq.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {faq.sortOrder}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatDate(faq.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(faq)
                          }
                          className="rounded-lg p-2 text-text-muted transition hover:bg-surface-muted hover:text-primary-700"
                          title="Edit FAQ"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(faq)
                          }
                          className="rounded-lg p-2 text-text-muted transition hover:bg-danger-soft hover:text-danger"
                          title="Delete FAQ"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
