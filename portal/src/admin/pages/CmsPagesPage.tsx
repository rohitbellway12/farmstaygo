import axios from "axios";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Alignment,
  AutoLink,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Italic,
  Link as CkLink,
  List,
  MediaEmbed,
  Paragraph,
  Table,
  TableToolbar,
  Underline,
  Undo,
} from "ckeditor5";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../../shared/api/api";
import "ckeditor5/ckeditor5.css";

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  excerpt: string | null;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
  showInFooter: boolean;
  footerGroup: string;
  sortOrder: number;
}

interface CmsResponse {
  success: boolean;
  message: string;
  data: CmsPage[];
}

interface ApiErrorResponse {
  message?: string;
}

const emptyForm = {
  title: "",
  slug: "",
  pageType: "custom",
  excerpt: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
  isPublished: true,
  showInFooter: true,
  footerGroup: "company",
  sortOrder: "0",
};

const inputClass =
  "h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100";

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return (
      error.response?.data?.message ||
      error.message
    );
  }
  return "Unable to save CMS page.";
};

const getCmsPages = async () => {
  const response =
    await api.get<CmsResponse>(
      "/admin/cms-pages"
    );
  return response.data.data;
};

function CmsContentEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={{
          licenseKey: "GPL",
          plugins: [
            Alignment,
            AutoLink,
            BlockQuote,
            Bold,
            CkLink,
            Essentials,
            Heading,
            Italic,
            List,
            MediaEmbed,
            Paragraph,
            Table,
            TableToolbar,
            Underline,
            Undo,
          ],
          toolbar: [
            "undo",
            "redo",
            "|",
            "heading",
            "|",
            "bold",
            "italic",
            "underline",
            "|",
            "alignment",
            "link",
            "bulletedList",
            "numberedList",
            "blockQuote",
            "|",
            "insertTable",
            "mediaEmbed",
          ],
          heading: {
            options: [
              {
                model: "paragraph",
                title: "Paragraph",
                class: "ck-heading_paragraph",
              },
              {
                model: "heading2",
                view: "h2",
                title: "Heading 2",
                class: "ck-heading_heading2",
              },
              {
                model: "heading3",
                view: "h3",
                title: "Heading 3",
                class: "ck-heading_heading3",
              },
            ],
          },
          table: {
            contentToolbar: [
              "tableColumn",
              "tableRow",
              "mergeTableCells",
            ],
          },
        }}
        onChange={(
          _event,
          editor: { getData: () => string }
        ) => {
          onChange(editor.getData());
        }}
      />
    </div>
  );
}

export default function CmsPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setPages(await getCmsPages());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const deletePage = async (page: CmsPage) => {
    if (!window.confirm(`Delete ${page.title}?`)) {
      return;
    }

    await api.delete(`/admin/cms-pages/${page.id}`);
    await loadPages();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary-700">
              Website Content
            </p>
            <h1 className="mt-1 text-ui-xl font-extrabold text-text-main">
              CMS Pages
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Manage footer and website information
              pages.
            </p>
          </div>

          <Link
            to="/admin/cms/new"
            className="inline-flex h-11 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800"
          >
            Create Page
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-extrabold text-text-main">
            All Pages
          </h2>
        </div>

        {loading ? (
          <div className="p-5 text-sm font-bold text-text-muted">
            Loading CMS pages...
          </div>
        ) : pages.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-base font-extrabold text-text-main">
              No CMS pages yet
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Create your first website content page.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pages.map((page) => (
              <div
                key={page.id}
                className="grid gap-4 p-4 md:grid-cols-[1.4fr_0.7fr_0.7fr_auto] md:items-center"
              >
                <div>
                  <h3 className="font-extrabold text-text-main">
                    {page.title}
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    /pages/{page.slug}
                  </p>
                </div>

                <span className="text-xs font-bold capitalize text-text-secondary">
                  {page.footerGroup}
                </span>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={
                      page.isPublished
                        ? "rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-extrabold text-success"
                        : "rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-extrabold text-text-muted"
                    }
                  >
                    {page.isPublished
                      ? "Published"
                      : "Draft"}
                  </span>
                  {page.showInFooter && (
                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-extrabold text-primary-700">
                      Footer
                    </span>
                  )}
                </div>

                <div className="flex gap-2 md:justify-end">
                  <Link
                    to={`/admin/cms/${page.id}/edit`}
                    className="inline-flex h-9 items-center rounded-control border border-border px-3 text-xs font-bold text-text-secondary hover:bg-surface-muted"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void deletePage(page)}
                    className="h-9 rounded-control border border-danger/30 px-3 text-xs font-bold text-danger hover:bg-danger-soft"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function CmsPageFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPage = async () => {
      if (!id) {
        return;
      }

      try {
        setLoading(true);
        const pages = await getCmsPages();
        const page = pages.find(
          (item) => item.id === id
        );

        if (!page) {
          setError("CMS page not found.");
          return;
        }

        setForm({
          title: page.title,
          slug: page.slug,
          pageType: page.pageType,
          excerpt: page.excerpt || "",
          content: page.content,
          metaTitle: page.metaTitle || "",
          metaDescription:
            page.metaDescription || "",
          isPublished: page.isPublished,
          showInFooter: page.showInFooter,
          footerGroup: page.footerGroup,
          sortOrder: String(page.sortOrder),
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    void loadPage();
  }, [id]);

  const pageTitle = useMemo(
    () => (isEditing ? "Edit CMS Page" : "Create CMS Page"),
    [isEditing]
  );

  const updateForm = (
    field: keyof typeof emptyForm,
    value: string | boolean
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const savePage = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder) || 0,
    };

    try {
      if (id) {
        await api.put(
          `/admin/cms-pages/${id}`,
          payload
        );
      } else {
        await api.post("/admin/cms-pages", payload);
      }

      navigate("/admin/cms");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary-700">
              Website Content
            </p>
            <h1 className="mt-1 text-ui-xl font-extrabold text-text-main">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Add page content that will appear on
              the website.
            </p>
          </div>

          <Link
            to="/admin/cms"
            className="inline-flex h-11 items-center justify-center rounded-control border border-border px-5 text-sm font-bold text-text-secondary hover:bg-surface-muted"
          >
            Back to List
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <section className="rounded-dashboard-card border border-border bg-surface p-5 text-sm font-bold text-text-muted shadow-dashboard-card">
          Loading CMS page...
        </section>
      ) : (
        <form
          onSubmit={savePage}
          className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
              Page title
              <input
                value={form.title}
                onChange={(event) =>
                  updateForm(
                    "title",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
              Slug
              <input
                value={form.slug}
                onChange={(event) =>
                  updateForm(
                    "slug",
                    event.target.value
                  )
                }
                placeholder="page-slug"
                className={inputClass}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
              Footer group
              <select
                value={form.footerGroup}
                onChange={(event) =>
                  updateForm(
                    "footerGroup",
                    event.target.value
                  )
                }
                className={inputClass}
              >
                <option value="company">Company</option>
                <option value="policies">Policies</option>
                <option value="support">Support</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
              Sort order
              <input
                value={form.sortOrder}
                onChange={(event) =>
                  updateForm(
                    "sortOrder",
                    event.target.value
                  )
                }
                type="number"
                min="0"
                className={inputClass}
              />
            </label>
          </div>

          <label className="mt-4 grid gap-1.5 text-xs font-extrabold text-text-secondary">
            Short excerpt
            <textarea
              value={form.excerpt}
              onChange={(event) =>
                updateForm(
                  "excerpt",
                  event.target.value
                )
              }
              className="min-h-20 w-full rounded-control border border-border bg-surface px-3.5 py-3 text-sm font-medium text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            />
          </label>

          <div className="mt-4">
            <p className="text-xs font-extrabold text-text-secondary">
              Page content
            </p>
            <CmsContentEditor
              value={form.content}
              onChange={(value) =>
                updateForm("content", value)
              }
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
              Meta title
              <input
                value={form.metaTitle}
                onChange={(event) =>
                  updateForm(
                    "metaTitle",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
              Meta description
              <input
                value={form.metaDescription}
                onChange={(event) =>
                  updateForm(
                    "metaDescription",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-bold text-text-secondary">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) =>
                  updateForm(
                    "isPublished",
                    event.target.checked
                  )
                }
              />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-text-secondary">
              <input
                type="checkbox"
                checked={form.showInFooter}
                onChange={(event) =>
                  updateForm(
                    "showInFooter",
                    event.target.checked
                  )
                }
              />
              Show in footer
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              disabled={saving}
              className="h-11 rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Update Page"
                  : "Create Page"}
            </button>
            <Link
              to="/admin/cms"
              className="inline-flex h-11 items-center rounded-control border border-border px-5 text-sm font-bold text-text-secondary hover:bg-surface-muted"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
