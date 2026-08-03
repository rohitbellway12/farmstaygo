import type { Request, Response } from "express";

import prisma from "../config/database.js";

interface CmsPageBody {
  title?: unknown;
  slug?: unknown;
  pageType?: unknown;
  excerpt?: unknown;
  content?: unknown;
  metaTitle?: unknown;
  metaDescription?: unknown;
  isPublished?: unknown;
  showInFooter?: unknown;
  footerGroup?: unknown;
  sortOrder?: unknown;
}

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const cleanOptionalText = (
  value: unknown
): string | null =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseBoolean = (
  value: unknown,
  fallback: boolean
): boolean =>
  typeof value === "boolean" ? value : fallback;

const parseSortOrder = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : 0;
};

const validateCmsBody = (body: CmsPageBody) => {
  const title = cleanText(body.title);
  const content = cleanText(body.content);
  const pageType =
    cleanText(body.pageType) || "custom";
  const slug = slugify(
    cleanText(body.slug) || title
  );

  const errors: Record<string, string> = {};

  if (title.length < 2) {
    errors.title = "Please enter a page title.";
  }

  if (slug.length < 2) {
    errors.slug = "Please enter a valid slug.";
  }

  if (content.length < 5) {
    errors.content = "Please enter page content.";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
    values: {
      title,
      slug,
      pageType,
      content,
      excerpt: cleanOptionalText(body.excerpt),
      metaTitle: cleanOptionalText(body.metaTitle),
      metaDescription: cleanOptionalText(
        body.metaDescription
      ),
      isPublished: parseBoolean(
        body.isPublished,
        false
      ),
      showInFooter: parseBoolean(
        body.showInFooter,
        true
      ),
      footerGroup:
        cleanText(body.footerGroup) || "company",
      sortOrder: parseSortOrder(body.sortOrder),
    },
  };
};

export const getAdminCmsPages = async (
  _req: Request,
  res: Response
) => {
  const pages = await prisma.cmsPage.findMany({
    orderBy: [
      { footerGroup: "asc" },
      { sortOrder: "asc" },
      { title: "asc" },
    ],
  });

  return res.json({
    success: true,
    message: "CMS pages fetched successfully",
    data: pages,
    total: pages.length,
  });
};

export const createCmsPage = async (
  req: Request,
  res: Response
) => {
  const validation = validateCmsBody(
    req.body as CmsPageBody
  );

  if (!validation.success) {
    return res.status(422).json({
      success: false,
      message: "Please correct the CMS page",
      errors: validation.errors,
    });
  }

  const existing =
    await prisma.cmsPage.findUnique({
      where: { slug: validation.values.slug },
    });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "This page slug is already used.",
    });
  }

  const page = await prisma.cmsPage.create({
    data: validation.values,
  });

  return res.status(201).json({
    success: true,
    message: "CMS page created successfully",
    data: page,
  });
};

export const updateCmsPage = async (
  req: Request,
  res: Response
) => {
  const pageId = cleanText(req.params.id);
  const validation = validateCmsBody(
    req.body as CmsPageBody
  );

  if (!validation.success) {
    return res.status(422).json({
      success: false,
      message: "Please correct the CMS page",
      errors: validation.errors,
    });
  }

  const duplicate =
    await prisma.cmsPage.findFirst({
      where: {
        slug: validation.values.slug,
        id: { not: pageId },
      },
    });

  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: "This page slug is already used.",
    });
  }

  const page = await prisma.cmsPage.update({
    where: { id: pageId },
    data: validation.values,
  });

  return res.json({
    success: true,
    message: "CMS page updated successfully",
    data: page,
  });
};

export const deleteCmsPage = async (
  req: Request,
  res: Response
) => {
  await prisma.cmsPage.delete({
    where: { id: cleanText(req.params.id) },
  });

  return res.json({
    success: true,
    message: "CMS page deleted successfully",
  });
};

export const getPublicCmsPages = async (
  _req: Request,
  res: Response
) => {
  const pages = await prisma.cmsPage.findMany({
    where: { isPublished: true },
    orderBy: [
      { footerGroup: "asc" },
      { sortOrder: "asc" },
      { title: "asc" },
    ],
  });

  return res.json({
    success: true,
    message: "CMS pages fetched successfully",
    data: pages,
    total: pages.length,
  });
};

export const getPublicCmsPageBySlug = async (
  req: Request,
  res: Response
) => {
  const page =
    await prisma.cmsPage.findFirst({
      where: {
        slug: cleanText(req.params.slug),
        isPublished: true,
      },
    });

  if (!page) {
    return res.status(404).json({
      success: false,
      message: "CMS page not found",
    });
  }

  return res.json({
    success: true,
    message: "CMS page fetched successfully",
    data: page,
  });
};
