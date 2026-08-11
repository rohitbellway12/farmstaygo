import { Router } from "express";

import {
  getPlatformSettings,
  getPaymentSettings,
  updatePaymentSettings,
  updatePlatformSettings,
} from "../controllers/settings.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { allowRoles } from "../middleware/role.middleware.js";

import {
  createSettingsImageUpload,
} from "../config/upload.js";

const adminSettingsRoutes = Router();

adminSettingsRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN")
);

const settingsImageUpload = createSettingsImageUpload(2);

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

export { adminSettingsRoutes };
