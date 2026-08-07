import { Router } from "express";

import {
  getAdminReports,
} from "../controllers/admin-reports.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminReportsRoutes = Router();

adminReportsRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN", "SUPPORT")
);

adminReportsRoutes.get(
  "/reports",
  getAdminReports
);

export { adminReportsRoutes };