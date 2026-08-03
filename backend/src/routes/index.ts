import { Router } from "express";


import {
  healthCheck,
} from "../controllers/health.controller.js";

import publicCategoryRoutes from "./public-category.routes.js";
import publicPropertyRoutes from "./public-property.routes.js";
import {
  adminCmsPageRoutes,
  publicCmsPageRoutes,
} from "./cms-page.routes.js";

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
  vendorKycRoutes,
} from "./vendor-kyc.routes.js";

import {
  vendorEarningsRoutes,
} from "./vendor-earnings.routes.js";

import {
  wishlistRoutes,
} from "./wishlist.routes.js";

import {
  adminBookingRoutes,
  bookingRoutes,
  vendorBookingRoutes,
} from "./booking.routes.js";

import {
  adminPropertyApprovalRoutes,
} from "./admin-property-approval.routes.js";

import {
  adminVendorRoutes,
} from "./admin-vendor.routes.js";

import {
  adminUserRoutes,
} from "./admin-user.routes.js";

import {
  adminPropertyRoutes,
} from "./admin-property.routes.js";

import {
  adminServiceCityRoutes,
  publicServiceCityRoutes,
  vendorServiceCityRoutes,
} from "./service-city.routes.js";

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

router.use(
  "/public/service-cities",
  publicServiceCityRoutes
);

router.use(
  "/public/cms-pages",
  publicCmsPageRoutes
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
| Admin Service City Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin/service-cities",
  adminServiceCityRoutes
);

router.use(
  "/admin/cms-pages",
  adminCmsPageRoutes
);

/*
|--------------------------------------------------------------------------
| Admin Vendor Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin/vendors",
  adminVendorRoutes
);

/*
|--------------------------------------------------------------------------
| Admin User Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin/users",
  adminUserRoutes
);

/*
|--------------------------------------------------------------------------
| Admin Booking Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin/bookings",
  adminBookingRoutes
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
| Vendor Service City Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/vendor/service-cities",
  vendorServiceCityRoutes
);

/*
|--------------------------------------------------------------------------
| Vendor KYC Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/vendor/kyc",
  vendorKycRoutes
);

/*
|--------------------------------------------------------------------------
| Vendor Earnings Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/vendor",
  vendorEarningsRoutes
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

/*
|--------------------------------------------------------------------------
| Vendor Booking Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/vendor/bookings",
  vendorBookingRoutes
);

/*
|--------------------------------------------------------------------------
| Wishlist Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/wishlist",
  wishlistRoutes
);

/*
|--------------------------------------------------------------------------
| Booking Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/bookings",
  bookingRoutes
);

export default router;
