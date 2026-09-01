import {
  useEffect,
  useState,
} from "react";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Alignment,
  AutoLink,
  BlockQuote,
  Bold,
  ClassicEditor,
  CodeBlock,
  Essentials,
  FindAndReplace,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  Heading,
  Highlight,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageInsert,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  ListProperties,
  MediaEmbed,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  SelectAll,
  SpecialCharacters,
  SpecialCharactersArrows,
  SpecialCharactersCurrency,
  SpecialCharactersText,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TextTransformation,
  Underline,
  Undo,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../../shared/api/api";
import { backendBaseUrl } from "../../shared/config/app";

interface BlogForm {
  title: string;
  slug: string;
  description: string;
  content: string;
  imageUrl: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  isPublished: boolean;
  author: string;
  sortOrder: number;
}

const emptyForm: BlogForm = {
  title: "",
  slug: "",
  description: "",
  content: "",
  imageUrl: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  isPublished: true,
  author: "",
  sortOrder: 0,
};

export default function BlogEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing && id) {
      void loadPost(id);
    }
  }, [isEditing, id]);

  const loadPost = async (postId: string) => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: BlogForm }>(
        `/admin/blog/${postId}`
      );
      setForm(response.data.data);
    } catch (err) {
      setError("Unable to load blog post");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await api.post<{ success: boolean; data: { imageUrl: string } }>(
        "/admin/blog/upload-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setForm((prev) => ({ ...prev, imageUrl: response.data.data.imageUrl }));
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (form.title.trim().length < 2) {
      newErrors.title = "Title is required (at least 2 characters).";
    }

    if (form.slug.trim().length < 2) {
      newErrors.slug = "Slug is required (at least 2 characters).";
    }

    if (form.content.trim().length < 10) {
      newErrors.content = "Content is required (at least 10 characters).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        description: form.description || null,
        content: form.content,
        imageUrl: form.imageUrl || null,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        metaKeywords: form.metaKeywords || null,
        isPublished: form.isPublished,
        author: form.author || null,
        sortOrder: form.sortOrder,
      };

      if (isEditing && id) {
        await api.put(`/admin/blog/${id}`, payload);
      } else {
        await api.post("/admin/blog", payload);
      }

      navigate("/admin/blog");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { message?: string; errors?: Record<string, string> } } };
        if (axiosError.response?.data?.errors) {
          setErrors(axiosError.response.data.errors);
        } else if (axiosError.response?.data?.message) {
          setError(axiosError.response.data.message);
        } else {
          setError("Unable to save blog post");
        }
      } else {
        setError("Unable to save blog post");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-muted rounded" />
          <div className="space-y-3">
            <div className="h-10 bg-surface-muted rounded" />
            <div className="h-10 bg-surface-muted rounded" />
            <div className="h-32 bg-surface-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-text-main">
          {isEditing ? "Edit Blog Post" : "New Blog Post"}
        </h1>
        <button
          type="button"
          onClick={() => navigate("/admin/blog")}
          className="text-sm font-semibold text-text-muted hover:text-text-main"
        >
          ← Back to list
        </button>
      </div>

      {error && (
        <div className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h2 className="text-sm font-extrabold text-text-main mb-4">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full rounded-control border border-border bg-surface-soft px-3 py-2 text-sm text-text-main outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                placeholder="Enter blog post title"
              />
              {errors.title && (
                <p className="mt-1 text-xs font-bold text-danger">{errors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  className="w-full rounded-control border border-border bg-surface-soft px-3 py-2 text-sm text-text-main outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                  placeholder="blog-post-slug"
                />
                {errors.slug && (
                  <p className="mt-1 text-xs font-bold text-danger">{errors.slug}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  value={form.author}
                  onChange={handleChange}
                  className="w-full rounded-control border border-border bg-surface-soft px-3 py-2 text-sm text-text-main outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                  placeholder="Author name"
                />
              </div>
            </div>

             <div>
               <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                 Description
               </label>
               <textarea
                 name="description"
                 value={form.description}
                 onChange={handleChange}
                 rows={3}
                 className="w-full rounded-control border border-border bg-surface-soft px-3 py-2 text-sm text-text-main outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                 placeholder="A brief description of the blog post"
               />
             </div>

             <div>
               <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                 Image
               </label>
               <div className="flex items-center gap-4">
                 <label className="flex cursor-pointer items-center gap-2 rounded-control border border-border bg-surface-soft px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-muted">
                   <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                     <polyline points="17 8 12 3 7 8" />
                     <line x1="12" x2="12" y1="3" y2="15" />
                   </svg>
                   Upload Image
                   <input
                     type="file"
                     accept="image/*"
                     className="hidden"
                     onChange={handleImageChange}
                   />
                 </label>
                  {form.imageUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={form.imageUrl.startsWith("http") ? form.imageUrl : `${backendBaseUrl}${form.imageUrl}`}
                        alt="Preview"
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                        className="text-xs font-bold text-danger hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
               </div>
             </div>
           </div>
         </div>

        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h2 className="text-sm font-extrabold text-text-main mb-4">
            Content
          </h2>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
              Content
            </label>
            <CKEditor
              editor={ClassicEditor}
              data={form.content}
              config={{
                licenseKey: "GPL",
                 plugins: [
                  Alignment,
                  AutoLink,
                  BlockQuote,
                  Bold,
                  CodeBlock,
                  Essentials,
                  FindAndReplace,
                  FontBackgroundColor,
                  FontColor,
                  FontFamily,
                  FontSize,
                  Heading,
                  Highlight,
                  HorizontalLine,
                  Image,
                  ImageCaption,
                  ImageInsert,
                  ImageResize,
                  ImageStyle,
                  ImageToolbar,
                  ImageUpload,
                  Indent,
                  IndentBlock,
                  Italic,
                  Link,
                  List,
                  ListProperties,
                  MediaEmbed,
                  Paragraph,
                  PasteFromOffice,
                  RemoveFormat,
                  SelectAll,
                  SpecialCharacters,
                  SpecialCharactersArrows,
                  SpecialCharactersCurrency,
                  SpecialCharactersText,
                  Strikethrough,
                  Subscript,
                  Superscript,
                  Table,
                  TextTransformation,
                  Underline,
                  Undo,
                ],
                toolbar: {
                  items: [
                    "undo",
                    "redo",
                    "|",
                    "heading",
                    "|",
                    "bold",
                    "italic",
                    "underline",
                    "strikethrough",
                    "subscript",
                    "superscript",
                    "|",
                    "fontFamily",
                    "fontSize",
                    "fontColor",
                    "fontBackgroundColor",
                    "highlight",
                    "|",
                    "alignment",
                    "|",
                    "numberedList",
                    "bulletedList",
                    "indent",
                    "outdent",
                    "|",
                    "link",
                    "imageUpload",
                    "imageInsertViaUrl",
                    "mediaEmbed",
                    "insertTable",
                    "tableColumn",
                    "tableRow",
                    "mergeTableCells",
                    "tableToolbar",
                    "|",
                    "blockQuote",
                    "codeBlock",
                    "horizontalLine",
                    "specialCharacters",
                    "removeFormat",
                    "|",
                    "findAndReplace",
                  ],
                },
                image: {
                  toolbar: [
                    "imageTextAlternative",
                    "imageStyle:inline",
                    "imageStyle:wrapText",
                    "imageStyle:breakText",
                    "|",
                    "toggleImageCaption",
                  ],
                  resizeOptions: [
                    {
                      name: "imageResize:50",
                      label: "50%",
                      value: "50",
                    },
                    {
                      name: "imageResize:75",
                      label: "75%",
                      value: "75",
                    },
                    {
                      name: "imageResize:100",
                      label: "100%",
                      value: "100",
                    },
                  ],
                },
                table: {
                  contentToolbar: [
                    "tableColumn",
                    "tableRow",
                    "mergeTableCells",
                    "tableProperties",
                    "tableCellProperties",
                  ],
                },
                fontFamily: {
                  options: [
                    "default",
                    "Arial, Helvetica, sans-serif",
                    "Georgia, serif",
                    "Courier New, Courier, monospace",
                  ],
                  supportAllValues: true,
                },
                fontSize: {
                  options: ["10", "12", "14", "default", "18", "20", "24"],
                  supportAllValues: true,
                },
                htmlSupport: {
                  allow: [
                    {
                      name: /.*/,
                      attributes: true,
                      classes: true,
                      styles: true,
                    },
                  ],
                },
                placeholder: "Write your blog post content here...",
              }}
              onChange={(_event, editor) => {
                const data = editor.getData();
                setForm((prev) => ({ ...prev, content: data }));
              }}
            />
            {errors.content && (
              <p className="mt-1 text-xs font-bold text-danger">{errors.content}</p>
            )}
          </div>
        </div>

        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h2 className="text-sm font-extrabold text-text-main mb-4">
            SEO Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                Meta Title
              </label>
              <input
                type="text"
                name="metaTitle"
                value={form.metaTitle}
                onChange={handleChange}
                className="w-full rounded-control border border-border bg-surface-soft px-3 py-2 text-sm text-text-main outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                placeholder="SEO meta title (optional)"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                Meta Description
              </label>
              <textarea
                name="metaDescription"
                value={form.metaDescription}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-control border border-border bg-surface-soft px-3 py-2 text-sm text-text-main outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                placeholder="SEO meta description (optional)"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                Meta Keywords
              </label>
              <input
                type="text"
                name="metaKeywords"
                value={form.metaKeywords}
                onChange={handleChange}
                className="w-full rounded-control border border-border bg-surface-soft px-3 py-2 text-sm text-text-main outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </div>
        </div>

        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h2 className="text-sm font-extrabold text-text-main mb-4">
            Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-text-main">
                  Publish
                </span>
                <p className="text-xs text-text-muted">
                  Make this post publicly visible
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.isPublished}
                onClick={() =>
                  setForm((prev) => ({ ...prev, isPublished: !prev.isPublished }))
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  form.isPublished ? "bg-primary-700" : "bg-surface-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    form.isPublished ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted mb-1">
                Sort Order
              </label>
              <input
                type="number"
                name="sortOrder"
                value={form.sortOrder}
                onChange={handleChange}
                className="w-24 rounded-control border border-border bg-surface-soft px-3 py-2 text-sm text-text-main outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/blog")}
            className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-700 px-5 text-sm font-bold text-white shadow-md shadow-primary-200/60 transition-all hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : isEditing ? "Update Post" : "Create Post"}
          </button>
        </div>
      </form>
    </div>
  );
}