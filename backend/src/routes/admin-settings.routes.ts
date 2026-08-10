import { Router } from "express";

import {
  getPlatformSettings,
  getPaymentSettings,
  updatePaymentSettings,
  updatePlatformSettings,
} from "../controllers/settings.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { allowRoles } from "../middleware/role.middleware.js";

const adminSettingsRoutes = Router();

adminSettingsRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN")
);

adminSettingsRoutes.get(
  "/platform",
  getPlatformSettings
);

adminSettingsRoutes.put(
  "/platform",
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
