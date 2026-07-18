import { Router } from "express";

import {
  getVendorKyc,
  submitVendorKyc,
} from "../controllers/vendor-kyc.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const vendorKycRoutes = Router();

vendorKycRoutes.use(
  authenticate,
  allowRoles("VENDOR")
);

vendorKycRoutes.get(
  "/",
  getVendorKyc
);

vendorKycRoutes.put(
  "/",
  submitVendorKyc
);

export {
  vendorKycRoutes,
};
