import { Router } from "express";

import {
  getPublicPaymentSettings,
  getPublicPlatformSettings,
  getPublicVendorBankDetails,
} from "../controllers/public-settings.controller.js";

const publicSettingsRoutes = Router();

publicSettingsRoutes.get(
  "/payment-methods",
  getPublicPaymentSettings
);

publicSettingsRoutes.get(
  "/platform",
  getPublicPlatformSettings
);

publicSettingsRoutes.get(
  "/vendor-bank-details",
  getPublicVendorBankDetails
);

export default publicSettingsRoutes;
