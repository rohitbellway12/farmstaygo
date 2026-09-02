import { Router } from "express";

import {
  createCalendarImport,
  deleteCalendarImport,
  getCalendarImports,
  triggerCalendarImportSync,
  updateCalendarImport,
} from "../controllers/calendar.controller.js";

/*
|--------------------------------------------------------------------------
| Vendor Calendar Sync Routes
|--------------------------------------------------------------------------
|
| Base URL:
| /api/vendor/properties/:propertyId/calendar-imports
|
| This router is mounted under vendorPropertyRoutes in property.routes.ts,
| so authentication and VENDOR role checks are already applied by the
| parent router.
|
| These endpoints allow vendors to manage external iCal URLs
| (Airbnb, Booking.com, etc.) that FarmStayGo syncs from.
|
*/

const vendorCalendarRoutes = Router({
  mergeParams: true,
});

/*
|--------------------------------------------------------------------------
| List & Create Calendar Imports
|--------------------------------------------------------------------------
|
| GET  /api/vendor/properties/:propertyId/calendar-imports
| POST /api/vendor/properties/:propertyId/calendar-imports
|
*/

vendorCalendarRoutes.route("/")
  .get(getCalendarImports)
  .post(createCalendarImport);

/*
|--------------------------------------------------------------------------
| Update, Delete & Manual Sync for a Single Import
|--------------------------------------------------------------------------
|
| PUT    /api/vendor/properties/:propertyId/calendar-imports/:id
| DELETE /api/vendor/properties/:propertyId/calendar-imports/:id
| POST   /api/vendor/properties/:propertyId/calendar-imports/:id/sync
|
*/

vendorCalendarRoutes.route("/:id")
  .put(updateCalendarImport)
  .delete(deleteCalendarImport);

vendorCalendarRoutes.post(
  "/:id/sync",
  triggerCalendarImportSync
);

export { vendorCalendarRoutes };
