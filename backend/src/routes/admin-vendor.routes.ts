import { Router } from "express";

import {
  createAdminVendor,
  deleteAdminVendor,
  deactivateAdminVendor,
  activateAdminVendor,
  getAdminVendors,
  rejectAdminVendor,
  approveAdminVendor,
} from "../controllers/admin-vendor.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminVendorRoutes = Router();

/*
|--------------------------------------------------------------------------
| Admin Vendor Authentication
|--------------------------------------------------------------------------
|
| All Admin vendor routes require an authenticated Admin account.
|
*/

adminVendorRoutes.use(
  authenticate,
  allowRoles("ADMIN")
);

/*
|--------------------------------------------------------------------------
| Get All Vendors
|--------------------------------------------------------------------------
|
| Optional query parameters:
|
| ?search=villa
| ?status=ALL
| ?status=PENDING
| ?status=APPROVED
| ?status=REJECTED
| ?status=NOT_SUBMITTED
|
*/

adminVendorRoutes.get(
  "/",
  getAdminVendors
);

/*
|--------------------------------------------------------------------------
| Create Vendor
|--------------------------------------------------------------------------
|
| Vendors created directly by admin are auto-approved.
|
| Request body:
|
| {
|   "firstName": "John",
|   "lastName": "Doe",
|   "businessName": "Sunset Villas",
|   "email": "john@example.com",
|   "mobile": "9876543210",
|   "password": "securepass123",
|   "commissionRate": "10.5"
| }
|
*/

adminVendorRoutes.post(
  "/",
  createAdminVendor
);

/*
|--------------------------------------------------------------------------
| Approve Vendor
|--------------------------------------------------------------------------
*/

adminVendorRoutes.patch(
  "/:id/approve",
  approveAdminVendor
);

/*
|--------------------------------------------------------------------------
| Reject Vendor
|--------------------------------------------------------------------------
|
| Request body:
|
| {
|   "reason": "Invalid business documents"
| }
|
*/

adminVendorRoutes.patch(
  "/:id/reject",
  rejectAdminVendor
);

/*
|--------------------------------------------------------------------------
| Activate / Deactivate Vendor
|--------------------------------------------------------------------------
*/

adminVendorRoutes.patch(
  "/:id/deactivate",
  deactivateAdminVendor
);

adminVendorRoutes.patch(
  "/:id/activate",
  activateAdminVendor
);

/*
|--------------------------------------------------------------------------
| Delete Vendor
|--------------------------------------------------------------------------
*/

adminVendorRoutes.delete(
  "/:id",
  deleteAdminVendor
);

export {
  adminVendorRoutes,
};
