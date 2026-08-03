import { Router } from "express";

import {
  createServiceCity,
  deleteServiceCity,
  getActiveServiceCities,
  getServiceCities,
  updateServiceCity,
  updateServiceCityStatus,
} from "../controllers/service-city.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminServiceCityRoutes = Router();
const vendorServiceCityRoutes = Router();
const publicServiceCityRoutes = Router();

adminServiceCityRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN")
);

adminServiceCityRoutes.get(
  "/",
  getServiceCities
);

adminServiceCityRoutes.post(
  "/",
  createServiceCity
);

adminServiceCityRoutes.put(
  "/:id",
  updateServiceCity
);

adminServiceCityRoutes.patch(
  "/:id/status",
  updateServiceCityStatus
);

adminServiceCityRoutes.delete(
  "/:id",
  deleteServiceCity
);

vendorServiceCityRoutes.use(
  authenticate,
  allowRoles("VENDOR")
);

vendorServiceCityRoutes.get(
  "/",
  getActiveServiceCities
);

publicServiceCityRoutes.get(
  "/",
  getActiveServiceCities
);

export {
  adminServiceCityRoutes,
  publicServiceCityRoutes,
  vendorServiceCityRoutes,
};
