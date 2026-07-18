import { Router } from "express";

import {
  getAdminProperties,
  getAdminPropertyById,
  updateAdminPropertyFeatured,
  updateAdminPropertyStatus,
} from "../controllers/admin-property.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminPropertyRoutes = Router();

/*
|--------------------------------------------------------------------------
| Admin Property Authentication
|--------------------------------------------------------------------------
|
| All Admin property routes require an authenticated Admin account.
|
*/

adminPropertyRoutes.use(
  authenticate,
  allowRoles("ADMIN")
);

/*
|--------------------------------------------------------------------------
| Get All Properties
|--------------------------------------------------------------------------
|
| Optional query parameters:
|
| ?search=farm
| ?status=ALL
| ?status=APPROVED
| ?categoryId=category-id
| ?featured=true
| ?featured=false
|
*/

adminPropertyRoutes.get(
  "/",
  getAdminProperties
);

/*
|--------------------------------------------------------------------------
| Update Property Status
|--------------------------------------------------------------------------
|
| Request body:
|
| {
|   "status": "INACTIVE"
| }
|
*/

adminPropertyRoutes.patch(
  "/:id/status",
  updateAdminPropertyStatus
);

/*
|--------------------------------------------------------------------------
| Update Featured Property Status
|--------------------------------------------------------------------------
|
| Request body:
|
| {
|   "isFeatured": true
| }
|
*/

adminPropertyRoutes.patch(
  "/:id/featured",
  updateAdminPropertyFeatured
);

/*
|--------------------------------------------------------------------------
| Get Single Property Details
|--------------------------------------------------------------------------
*/

adminPropertyRoutes.get(
  "/:id",
  getAdminPropertyById
);

export {
  adminPropertyRoutes,
};