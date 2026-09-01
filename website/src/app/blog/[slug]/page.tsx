import Link from "next/link";
import type { Metadata } from "next";

import { apiFetch } from "@/lib/api";
import { getAssetUrl } from "@/lib/assets";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  description: string | null;
  content: string;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  isPublished: boolean;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const response = await apiFetch<{ success: boolean; data: BlogPost }>(
      `/public/blog/${slug}`
    );

    const post = response.data;

    return {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.description || undefined,
    };
  } catch {
    return {
      title: "Blog Post",
      description: undefined,
    };
  }
}

async function getBlogPost(slug: string) {
  const data = await apiFetch<{ success: boolean; data: BlogPost }>(
    `/public/blog/${slug}`
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

export default async function BlogPostPage({
  params,
}: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post || !post.isPublished) {
    return (
      <main className="min-h-screen bg-white">
        <section className="site-container py-12 text-center">
          <h1 className="text-2xl font-extrabold text-ink-900">
            Post not found
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            The blog post you&apos;re looking for doesn&apos;t exist or has
            been unpublished.
          </p>
          <Link
            href="/blog"
            className="mt-4 inline-block text-sm font-bold text-brand-700 hover:text-brand-800"
          >
            ← Back to blog
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <article>
        {post.imageUrl && (
          <div className="mx-auto max-w-3xl h-64 overflow-hidden lg:h-80">
            <img
              src={getAssetUrl(post.imageUrl)}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <section className="site-container py-8">
          <header className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-extrabold text-ink-900 lg:text-4xl">
              {post.title}
            </h1>

            <div className="mt-4 flex items-center gap-4 text-sm text-ink-500">
              {post.author && (
                <span className="font-semibold text-ink-700">
                  {post.author}
                </span>
              )}
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </header>

          <div className="mx-auto mt-8 max-w-3xl prose prose-ink max-w-none">
            {post.description && (
              <p className="text-lg text-ink-600">{post.description}</p>
            )}

            <div
              dangerouslySetInnerHTML={{ __html: post.content }}
              className="mt-6 space-y-4 text-ink-800"
            />
          </div>

          <div className="mx-auto mt-12 max-w-3xl border-t border-ink-100 pt-8">
            <Link
              href="/blog"
              className="text-sm font-bold text-brand-700 hover:text-brand-800"
            >
              ← Back to all posts
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}