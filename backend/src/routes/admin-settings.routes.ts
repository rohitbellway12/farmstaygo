import { Router } from "express";

import {
  getPlatformSettings,
  getPaymentSettings,
  getMapSettings,
  getHomeSettings,
  getSmtpSettings,
  updatePaymentSettings,
  updatePlatformSettings,
  updateMapSettings,
  updateHomeSettings,
  updateSmtpSettings,
  syncEnvSmtpSettings,
} from "../controllers/settings.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { allowRoles } from "../middleware/role.middleware.js";

import {
  createSettingsImageUpload,
  createHomeImageUpload,
} from "../config/upload.js";

const adminSettingsRoutes = Router();

adminSettingsRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN")
);

const settingsImageUpload = createSettingsImageUpload(2);
const homeImageUpload = createHomeImageUpload(5);

adminSettingsRoutes.get(
  "/platform",
  getPlatformSettings
);

adminSettingsRoutes.put(
  "/platform",
  settingsImageUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  updatePlatformSettings
);

adminSettingsRoutes.get(
  "/payment",
  getPaymentSettings
);

adminSettingsRoutes.put(
  "/payment",
  updatePaymentSettings
);

adminSettingsRoutes.get(
  "/map",
  getMapSettings
);

adminSettingsRoutes.put(
  "/map",
  updateMapSettings
);

adminSettingsRoutes.get(
  "/home",
  getHomeSettings
);

adminSettingsRoutes.put(
  "/home",
  homeImageUpload.fields([
    { name: "hero", maxCount: 1 },
    { name: "grow", maxCount: 1 },
  ]),
  updateHomeSettings
);

adminSettingsRoutes.get(
  "/smtp",
  getSmtpSettings
);

adminSettingsRoutes.put(
  "/smtp",
  updateSmtpSettings
);

adminSettingsRoutes.post(
  "/smtp/sync-env",
  syncEnvSmtpSettings
);

export { adminSettingsRoutes };
