import Link from "next/link";
import type { Metadata } from "next";

import { apiFetch } from "@/lib/api";
import { getAssetUrl } from "@/lib/assets";

export const metadata: Metadata = {
  title: "FarmStayGo Blog | Farmhouses, Getaways & Travel Tips in Indore",
  description:
    "Explore FarmStayGo's blog for farmhouse recommendations, weekend getaways, travel tips, party ideas and places to visit around Indore and nearby destinations.",
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  author: string | null;
  createdAt: string;
}

async function getBlogPosts() {
  const data = await apiFetch<{ success: boolean; data: BlogPost[] }>(
    "/public/blog"
  );
  return data.data;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-ink-100 bg-white">
        <div className="site-container py-12">
          <h1 className="text-3xl font-extrabold text-ink-900">Blog</h1>
          <p className="mt-2 text-sm text-ink-500">
            Tips, guides, and stories about farm stays and weekend getaways.
          </p>
        </div>
      </section>

      <section className="site-container py-8">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-ink-400">No blog posts yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition hover:shadow-md"
              >
                {post.imageUrl && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={getAssetUrl(post.imageUrl)}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="p-5">
                  <h2 className="text-lg font-extrabold text-ink-900">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-brand-700"
                    >
                      {post.title}
                    </Link>
                  </h2>

                   {post.description && (
                     <p className="mt-2 line-clamp-2 text-sm text-ink-500">
                       {post.description}
                     </p>
                   )}

                  <div className="mt-4 flex items-center justify-between text-xs text-ink-400">
                    <span>
                      {post.author && `${post.author} `}
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}