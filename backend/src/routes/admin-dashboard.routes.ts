import { Router } from "express";

import {
  getAdminDashboardStats,
} from "../controllers/admin-dashboard.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminDashboardRoutes = Router();

adminDashboardRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN", "SUPPORT")
);

adminDashboardRoutes.get(
  "/dashboard/stats",
  getAdminDashboardStats
);

export { adminDashboardRoutes };