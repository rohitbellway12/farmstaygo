import { Router } from "express";

import {
  getPublicPaymentSettings,
  getPublicPlatformSettings,
  getPublicVendorBankDetails,
  getPublicMapSettings,
} from "../controllers/public-settings.controller.js";

import {
  getPublicHomeSettings,
} from "../controllers/settings.controller.js";

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
  "/map",
  getPublicMapSettings
);

publicSettingsRoutes.get(
  "/home",
  getPublicHomeSettings
);

publicSettingsRoutes.get(
  "/vendor-bank-details",
  getPublicVendorBankDetails
);

export default publicSettingsRoutes;
