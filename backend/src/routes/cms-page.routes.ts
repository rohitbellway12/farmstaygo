import { Router } from "express";

import {
  createCmsPage,
  deleteCmsPage,
  getAdminCmsPages,
  getPublicCmsPageBySlug,
  getPublicCmsPages,
  updateCmsPage,
} from "../controllers/cms-page.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminCmsPageRoutes = Router();
const publicCmsPageRoutes = Router();

adminCmsPageRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN")
);

adminCmsPageRoutes.get("/", getAdminCmsPages);
adminCmsPageRoutes.post("/", createCmsPage);
adminCmsPageRoutes.put("/:id", updateCmsPage);
adminCmsPageRoutes.delete("/:id", deleteCmsPage);

publicCmsPageRoutes.get("/", getPublicCmsPages);
publicCmsPageRoutes.get("/:slug", getPublicCmsPageBySlug);

export {
  adminCmsPageRoutes,
  publicCmsPageRoutes,
};
