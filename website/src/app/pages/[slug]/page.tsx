import { notFound } from "next/navigation";

import { apiFetch } from "@/lib/api";
import type {
  PublicCmsPageResponse,
} from "@/types/public";

interface CmsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function sanitizeCmsHtml(content: string) {
  return content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/href=["']javascript:[^"']*["']/gi, 'href="#"');
}

export default async function CmsPage({
  params,
}: CmsPageProps) {
  const { slug } = await params;

  let page;

  try {
    const response =
      await apiFetch<PublicCmsPageResponse>(
        `/public/cms-pages/${slug}`
      );

    page = response.data;
  } catch {
    notFound();
  }

  return (
    <div className="bg-[#f8faf8]">
      <section className="border-b border-ink-100 bg-white">
        <div className="site-container py-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
            FarmStayGo
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink-900 sm:text-4xl">
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500">
              {page.excerpt}
            </p>
          )}
        </div>
      </section>

      <section className="site-container py-10">
        <article
          className="space-y-5 rounded-2xl border border-ink-100 bg-white p-6 text-sm leading-7 text-ink-700 shadow-sm sm:p-8 [&_a]:font-bold [&_a]:text-brand-700 [&_h2]:pt-2 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.02em] [&_h2]:text-ink-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-4 [&_strong]:font-extrabold"
          dangerouslySetInnerHTML={{
            __html: sanitizeCmsHtml(page.content),
          }}
        />
      </section>
    </div>
  );
}
