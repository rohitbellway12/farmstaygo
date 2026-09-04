import { Router } from "express";

import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUserStatus,
} from "../controllers/admin-user.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminUserRoutes = Router();

adminUserRoutes.use(
  authenticate,
  allowRoles("ADMIN")
);

adminUserRoutes.get("/", getAdminUsers);
adminUserRoutes.patch("/:id/status", updateAdminUserStatus);
adminUserRoutes.delete("/:id", deleteAdminUser);

export { adminUserRoutes };
