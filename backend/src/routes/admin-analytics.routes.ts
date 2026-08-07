import { Router } from "express";

import {
  getAdminAnalytics,
} from "../controllers/admin-analytics.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminAnalyticsRoutes = Router();

adminAnalyticsRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN", "SUPPORT")
);

adminAnalyticsRoutes.get(
  "/analytics",
  getAdminAnalytics
);

export { adminAnalyticsRoutes };