import { Router } from "express";

import {
  getVendorDashboardStats,
} from "../controllers/vendor-dashboard.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const vendorDashboardRoutes = Router();

vendorDashboardRoutes.get(
  "/dashboard/stats",
  authenticate,
  allowRoles("VENDOR"),
  getVendorDashboardStats
);

export { vendorDashboardRoutes };