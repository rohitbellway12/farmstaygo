import type { Request, Response } from "express";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

interface BlogPostBody {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  description?: unknown;
  content?: unknown;
  imageUrl?: unknown;
  metaTitle?: unknown;
  metaDescription?: unknown;
  metaKeywords?: unknown;
  isPublished?: unknown;
  author?: unknown;
  sortOrder?: unknown;
}

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : Array.isArray(value) ? value[0]?.trim() ?? "" : "";
const cleanOptionalText = (
  value: unknown
): string | null =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : Array.isArray(value) && value[0]?.trim()
      ? value[0].trim()
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
  typeof value === "boolean"
    ? value
    : typeof value === "string"
      ? value.toLowerCase() === "true" || value === "1"
      : typeof value === "number"
        ? value === 1
        : fallback;

const parseSortOrder = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const validateBlogBody = (body: BlogPostBody) => {
  const title: string = cleanText(body.title);
  const content: string = cleanText(body.content);
  const slug: string = slugify(cleanText(body.slug) || title);

  const errors: Record<string, string> = {};

  if (title.length < 2) {
    errors.title = "Please enter a blog post title.";
  }

  if (slug.length < 2) {
    errors.slug = "Please enter a valid slug.";
  }

  if (content.length < 10) {
    errors.content = "Please enter blog post content (at least 10 characters).";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
    values: {
      title,
      slug,
      excerpt: cleanOptionalText(body.excerpt),
      description: cleanOptionalText(body.description),
      content,
      imageUrl: cleanOptionalText(body.imageUrl),
      metaTitle: cleanOptionalText(body.metaTitle),
      metaDescription: cleanOptionalText(body.metaDescription),
      metaKeywords: cleanOptionalText(body.metaKeywords),
      isPublished: parseBoolean(body.isPublished, false),
      author: cleanOptionalText(body.author),
      sortOrder: parseSortOrder(body.sortOrder),
    },
  };
};

export const getBlogPosts = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        description: true,
        content: true,
        imageUrl: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        isPublished: true,
        author: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Blog posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.error("Get blog posts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch blog posts",
    });
  }
};

export const getBlogPostBySlug = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const slug = req.params.slug as string;

    const post = await prisma.blogPost.findFirst({
      where: { slug, isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        description: true,
        content: true,
        imageUrl: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        isPublished: true,
        author: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog post fetched successfully",
      data: post,
    });
  } catch (error) {
    console.error("Get blog post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch blog post",
    });
  }
};

export const getBlogPostById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = req.params.id as string;

    const post = await prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        description: true,
        content: true,
        imageUrl: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        isPublished: true,
        author: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog post fetched successfully",
      data: post,
    });
  } catch (error) {
    console.error("Get blog post by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch blog post",
    });
  }
};

export const getAdminBlogPosts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        description: true,
        imageUrl: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        isPublished: true,
        author: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Blog posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.error("Get admin blog posts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch blog posts",
    });
  }
};

export const createBlogPost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const validation = validateBlogBody(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Please correct the blog post information",
        errors: validation.errors,
      });
    }

    const existingPost = await prisma.blogPost.findUnique({
      where: { slug: validation.values.slug },
    });

    if (existingPost) {
      return res.status(409).json({
        success: false,
        message: "A blog post with this slug already exists",
      });
    }

    const post = await prisma.blogPost.create({
      data: {
        ...validation.values,
        author: validation.values.author || "Admin",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        description: true,
        content: true,
        imageUrl: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        isPublished: true,
        author: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: post,
    });
  } catch (error) {
    console.error("Create blog post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create blog post",
    });
  }
};

export const updateBlogPost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = req.params.id as string;

    const existingPost = await prisma.blogPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    const validation = validateBlogBody(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Please correct the blog post information",
        errors: validation.errors,
      });
    }

    const slug =
      validation.values.slug !== existingPost.slug
        ? validation.values.slug
        : existingPost.slug;

    const slugConflict = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (slugConflict && slugConflict.id !== id) {
      return res.status(409).json({
        success: false,
        message: "A blog post with this slug already exists",
      });
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...validation.values,
        slug,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        description: true,
        content: true,
        imageUrl: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        isPublished: true,
        author: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Blog post updated successfully",
      data: post,
    });
  } catch (error) {
    console.error("Update blog post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update blog post",
    });
  }
};

export const deleteBlogPost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = req.params.id as string;

    const existingPost = await prisma.blogPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    await prisma.blogPost.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Blog post deleted successfully",
    });
  } catch (error) {
    console.error("Delete blog post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete blog post",
    });
  }
};

export const toggleBlogPostPublish = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = req.params.id as string;

    const existingPost = await prisma.blogPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: !existingPost.isPublished,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: post.isPublished
        ? "Blog post published successfully"
        : "Blog post unpublished successfully",
      data: post,
    });
  } catch (error) {
    console.error("Toggle blog post publish error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to toggle blog post publish status",
    });
  }
};