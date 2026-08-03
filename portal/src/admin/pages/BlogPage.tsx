import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../../shared/api/api";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  author: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function BlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: BlogPost[] }>(
        "/admin/blog"
      );
      setPosts(response.data.data);
    } catch (err) {
      setError("Unable to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) {
      return;
    }

    try {
      await api.delete(`/admin/blog/${id}`);
      setPosts(posts.filter((post) => post.id !== id));
    } catch (err) {
      setError("Unable to delete blog post");
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      await api.patch(`/admin/blog/${id}/publish`);
      loadPosts();
    } catch (err) {
      setError("Unable to update publish status");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-muted rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 bg-surface-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-text-main">Blog Posts</h1>
        <Link
          to="/admin/blog/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-bold text-white shadow-md shadow-primary-200/60 transition-all hover:bg-primary-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          New Post
        </Link>
      </div>

      {error && (
        <div className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-dashboard-card border border-border bg-surface p-8 text-center shadow-dashboard-card">
          <p className="text-sm text-text-muted">No blog posts yet.</p>
        </div>
      ) : (
        <div className="rounded-dashboard-card border border-border bg-surface shadow-dashboard-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-soft">
                  <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    Author
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-surface-soft transition">
                    <td className="px-4 py-3 font-semibold text-text-main">
                      {post.title}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {post.author || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                          post.isPublished
                            ? "bg-success-soft text-success"
                            : "bg-warning-soft text-warning"
                        }`}
                      >
                        {post.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(post.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/blog/${post.id}/edit`)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(post.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-success hover:bg-success-soft"
                        >
                          {post.isPublished ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger-soft"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}