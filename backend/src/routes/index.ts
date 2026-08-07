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

import {
  adminBlogRoutes,
  blogRoutes,
} from "./blog.routes.js";

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
  vendorDashboardRoutes,
} from "./vendor-dashboard.routes.js";

import {
  wishlistRoutes,
} from "./wishlist.routes.js";

import {
  adminBookingRoutes,
  bookingRoutes,
  vendorBookingRoutes,
} from "./booking.routes.js";

import invoiceRoutes from "./invoice.routes.js";

import {
  adminDashboardRoutes,
} from "./admin-dashboard.routes.js";

import {
  adminReportsRoutes,
} from "./admin-reports.routes.js";

import {
  adminAnalyticsRoutes,
} from "./admin-analytics.routes.js";

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

import notificationRoutes from "./notification.routes.js";

import contactRoutes from "./contact.routes.js";

import {
  adminContactRoutes,
} from "./admin-contact.routes.js";

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
| Public Blog Routes
|--------------------------------------------------------------------------
|
| No authentication required.
|
*/

router.use(
  "/public/blog",
  blogRoutes
);

/*
|--------------------------------------------------------------------------
| Admin Blog Routes
|--------------------------------------------------------------------------
|
| Requires admin authentication.
|
*/

router.use(
  "/admin/blog",
  adminBlogRoutes
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
| Admin Dashboard Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin",
  adminDashboardRoutes
);

/*
|--------------------------------------------------------------------------
| Admin Reports Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin",
  adminReportsRoutes
);

/*
|--------------------------------------------------------------------------
| Admin Analytics Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/admin",
  adminAnalyticsRoutes
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
| Vendor Dashboard Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/vendor",
  vendorDashboardRoutes
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

/*
|--------------------------------------------------------------------------
| Invoice Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/invoices",
  invoiceRoutes
);

/*
|--------------------------------------------------------------------------
| Notification Routes
|--------------------------------------------------------------------------
*/

router.use(
  "/notifications",
  notificationRoutes
);

/*
|--------------------------------------------------------------------------
| Contact Routes
|--------------------------------------------------------------------------
|
| Public: submit a contact message or fetch contact info.
| Admin: manage contact messages and contact settings.
|
*/

router.use(
  "/contact",
  contactRoutes
);

router.use(
  "/admin",
  adminContactRoutes
);

export default router;
