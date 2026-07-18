import { Router } from "express";


import {
  healthCheck,
} from "../controllers/health.controller.js";

import publicCategoryRoutes from "./public-category.routes.js";
import publicPropertyRoutes from "./public-property.routes.js";

import authRoutes from "./auth.routes.js";

import {
  adminPropertyCategoryRoutes,
  vendorPropertyCategoryRoutes,
} from "./property-category.routes.js";

import {
  adminAmenityRoutes,
  vendorAmenityRoutes,
} from "./amenity.routes.js";

import {
  vendorPropertyRoutes,
} from "./property.routes.js";

import {
  adminPropertyApprovalRoutes,
} from "./admin-property-approval.routes.js";

import {
  adminPropertyRoutes,
} from "./admin-property.routes.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| General Routes
|--------------------------------------------------------------------------
*/

router.get(
  "/health",
  healthCheck
);



/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/auth",
  authRoutes
);

/*
|--------------------------------------------------------------------------
| Public Property Category Routes
|--------------------------------------------------------------------------
|
| No authentication required.
|
*/

router.use(
  "/public/property-categories",
  publicCategoryRoutes
);

/*
|--------------------------------------------------------------------------
| Public Property Routes
|--------------------------------------------------------------------------
|
| No authentication required.
|
*/

router.use(
  "/public/properties",
  publicPropertyRoutes
);

/*
|--------------------------------------------------------------------------
| Admin Property Category Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin/property-categories",
  adminPropertyCategoryRoutes
);

/*
|--------------------------------------------------------------------------
| Admin Amenity Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin/amenities",
  adminAmenityRoutes
);

/*
|--------------------------------------------------------------------------
| Admin Property Approval Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin/property-approvals",
  adminPropertyApprovalRoutes
);

/*
|--------------------------------------------------------------------------
| Admin Property Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin/properties",
  adminPropertyRoutes
);

/*
|--------------------------------------------------------------------------
| Vendor Property Category Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/vendor/property-categories",
  vendorPropertyCategoryRoutes
);

/*
|--------------------------------------------------------------------------
| Vendor Amenity Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/vendor/amenities",
  vendorAmenityRoutes
);

/*
|--------------------------------------------------------------------------
| Vendor Property Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/vendor/properties",
  vendorPropertyRoutes
);

export default router;