import type { MetadataRoute } from "next";
import { apiFetch } from "@/lib/api";
import type {
  PublicPropertiesResponse,
  PublicCmsPagesResponse,
} from "@/types/public";

export const revalidate = 3600; // Auto re-generate every 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://www.farmstaygo.com"
  ).replace(/\/+$/, "");

  // 1. Static Main Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/properties`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // 2. Dynamic Properties (All Active Farmstays)
  let propertyRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await apiFetch<PublicPropertiesResponse>(
      "/public/properties?limit=1000"
    );
    if (res?.data && Array.isArray(res.data)) {
      propertyRoutes = res.data.map((property) => ({
        url: `${baseUrl}/properties/${property.publicId}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Graceful fallback if backend is unavailable during build
  }

  // 3. Dynamic Blog Posts
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await apiFetch<{
      success: boolean;
      data: Array<{ slug: string; createdAt?: string }>;
    }>("/public/blog");
    if (res?.data && Array.isArray(res.data)) {
      blogRoutes = res.data.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.createdAt ? new Date(post.createdAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Graceful fallback
  }

  // 4. Dynamic CMS Pages (Terms of Service, Privacy Policy, etc.)
  let cmsRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await apiFetch<PublicCmsPagesResponse>("/public/cms-pages");
    if (res?.data && Array.isArray(res.data)) {
      cmsRoutes = res.data
        .filter((page) => page.isPublished)
        .map((page) => ({
          url: `${baseUrl}/pages/${page.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.5,
        }));
    }
  } catch {
    // Graceful fallback
  }

  return [
    ...staticRoutes,
    ...propertyRoutes,
    ...blogRoutes,
    ...cmsRoutes,
  ];
}
