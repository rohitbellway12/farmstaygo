import { Router } from "express";

import {
  getPublicPaymentSettings,
  getPublicVendorBankDetails,
} from "../controllers/public-settings.controller.js";

const publicSettingsRoutes = Router();

publicSettingsRoutes.get(
  "/payment-methods",
  getPublicPaymentSettings
);

publicSettingsRoutes.get(
  "/vendor-bank-details",
  getPublicVendorBankDetails
);

export default publicSettingsRoutes;
