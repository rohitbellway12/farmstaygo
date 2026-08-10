import { Router } from "express";

import {
  getVendorBankDetails,
  updateVendorBankDetails,
} from "../controllers/vendor-bank.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const vendorBankRoutes = Router();

vendorBankRoutes.use(
  authenticate,
  allowRoles("VENDOR")
);

vendorBankRoutes.get(
  "/",
  getVendorBankDetails
);

vendorBankRoutes.put(
  "/",
  updateVendorBankDetails
);

export { vendorBankRoutes };
