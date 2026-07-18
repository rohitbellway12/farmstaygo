import { Router } from "express";

import { getAdminUsers } from "../controllers/admin-user.controller.js";

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

export { adminUserRoutes };
