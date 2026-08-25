import { Router } from "express";

import {
  getAdminPayouts,
  getPayoutReceipt,
  getPayoutSummary,
  processPayout,
} from "../controllers/admin-payouts.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminPayoutsRoutes = Router();

adminPayoutsRoutes.use(
  authenticate,
  allowRoles("ADMIN")
);

adminPayoutsRoutes.get(
  "/",
  getAdminPayouts
);

adminPayoutsRoutes.get(
  "/summary",
  getPayoutSummary
);

adminPayoutsRoutes.post(
  "/:id/pay",
  processPayout
);

adminPayoutsRoutes.get(
  "/:id/receipt",
  getPayoutReceipt
);

export {
  adminPayoutsRoutes,
};
