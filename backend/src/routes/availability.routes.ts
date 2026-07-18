import { Router } from "express";

import {
  getVendorAvailability,
  updatePropertyAvailability,
  updateRoomAvailability,
} from "../controllers/availability.controller.js";

/*
|--------------------------------------------------------------------------
| Vendor Availability Routes
|--------------------------------------------------------------------------
|
| Parent route:
| /api/vendor/properties/:propertyId/availability
|
| mergeParams is required to receive propertyId from property.routes.ts.
|
*/

const vendorAvailabilityRoutes = Router({
  mergeParams: true,
});

/*
|--------------------------------------------------------------------------
| Get Property Availability Calendar
|--------------------------------------------------------------------------
|
| GET:
| /api/vendor/properties/:propertyId/availability
|
| Optional query parameters:
| ?startDate=2026-07-01
| &endDate=2026-07-31
|
*/

vendorAvailabilityRoutes.get(
  "/",
  getVendorAvailability
);

/*
|--------------------------------------------------------------------------
| Block or Unblock Entire Property
|--------------------------------------------------------------------------
|
| PUT:
| /api/vendor/properties/:propertyId/availability/property-blocks
|
*/

vendorAvailabilityRoutes.put(
  "/property-blocks",
  updatePropertyAvailability
);

/*
|--------------------------------------------------------------------------
| Block or Unblock Room Inventory
|--------------------------------------------------------------------------
|
| PUT:
| /api/vendor/properties/:propertyId/availability/rooms/:roomTypeId/blocks
|
*/

vendorAvailabilityRoutes.put(
  "/rooms/:roomTypeId/blocks",
  updateRoomAvailability
);

export { vendorAvailabilityRoutes };