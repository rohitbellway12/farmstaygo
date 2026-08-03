import { Router } from "express";

import {
  getBlogPosts,
  getBlogPostBySlug,
  getBlogPostById,
  getAdminBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  toggleBlogPostPublish,
} from "../controllers/blog.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const blogRoutes = Router();

const adminBlogRoutes = Router();

blogRoutes.get(
  "/",
  getBlogPosts
);

blogRoutes.get(
  "/:slug",
  getBlogPostBySlug
);

adminBlogRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN", "SUPPORT")
);

adminBlogRoutes.get(
  "/",
  getAdminBlogPosts
);

adminBlogRoutes.get(
  "/:id",
  getBlogPostById
);

adminBlogRoutes.post(
  "/",
  createBlogPost
);

adminBlogRoutes.put(
  "/:id",
  updateBlogPost
);

adminBlogRoutes.delete(
  "/:id",
  deleteBlogPost
);

adminBlogRoutes.patch(
  "/:id/publish",
  toggleBlogPostPublish
);

export {
  blogRoutes,
  adminBlogRoutes,
};