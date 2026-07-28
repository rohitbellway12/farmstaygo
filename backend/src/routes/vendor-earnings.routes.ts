import { Router } from "express";

import {
  getVendorEarnings,
  getVendorPayouts,
} from "../controllers/vendor-earnings.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const vendorEarningsRoutes = Router();

vendorEarningsRoutes.get(
  "/earnings",
  authenticate,
  allowRoles("VENDOR"),
  getVendorEarnings
);

vendorEarningsRoutes.get(
  "/payouts",
  authenticate,
  allowRoles("VENDOR"),
  getVendorPayouts
);

export { vendorEarningsRoutes };
