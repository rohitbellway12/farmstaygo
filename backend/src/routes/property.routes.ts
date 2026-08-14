import { Router } from "express";

import {
  createPropertyDraft,
  deleteProperty,
  getVendorProperties,
  getVendorPropertyById,
  updatePropertyBasicInfo,
  updatePropertyLocation,
} from "../controllers/property.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

import {
  createPropertyImageUpload,
} from "../config/upload.js";

import {
  deletePropertyImage,
  reorderPropertyImages,
  setPropertyCoverImage,
  uploadPropertyImages,
} from "../controllers/property-image.controller.js";

import {
  submitPropertyForApproval,
  updatePropertyAmenities,
  updatePropertyPricing,
  updatePropertyRules,
} from "../controllers/property-wizard.controller.js";

import {
  vendorRoomRoutes,
} from "./room.routes.js";

import {
  vendorAvailabilityRoutes,
} from "./availability.routes.js";

const vendorPropertyRoutes = Router();

const propertyImageUpload =
  createPropertyImageUpload(8);

/*
|--------------------------------------------------------------------------
| Vendor Property Authentication
|--------------------------------------------------------------------------
|
| All property routes require an authenticated Vendor account.
|
*/

vendorPropertyRoutes.use(
  authenticate,
  allowRoles("VENDOR")
);

/*
|--------------------------------------------------------------------------
| Vendor Availability Calendar Routes
|--------------------------------------------------------------------------
|
| Base URL:
| /api/vendor/properties/:propertyId/availability
|
*/

vendorPropertyRoutes.use(
  "/:propertyId/availability",
  vendorAvailabilityRoutes
);

/*
|--------------------------------------------------------------------------
| Vendor Room Inventory Routes
|--------------------------------------------------------------------------
|
| Base URL:
| /api/vendor/properties/:propertyId/rooms
|
*/

vendorPropertyRoutes.use(
  "/:propertyId/rooms",
  vendorRoomRoutes
);

/*
|--------------------------------------------------------------------------
| Get Vendor Properties
|--------------------------------------------------------------------------
|
| Optional query parameters:
| ?search=villa
| ?status=DRAFT
|
*/

vendorPropertyRoutes.get(
  "/",
  getVendorProperties
);

/*
|--------------------------------------------------------------------------
| Create Property Draft
|--------------------------------------------------------------------------
|
| Creates a new property in DRAFT status using Basic Information.
|
*/

vendorPropertyRoutes.post(
  "/draft",
  createPropertyDraft
);

/*
|--------------------------------------------------------------------------
| Get Single Vendor Property
|--------------------------------------------------------------------------
|
| Vendors can only access properties owned by their account.
|
*/

vendorPropertyRoutes.get(
  "/:id",
  getVendorPropertyById
);

/*
|--------------------------------------------------------------------------
| Update Property Basic Information
|--------------------------------------------------------------------------
|
| Updates the Basic Information section of the property wizard.
|
*/

vendorPropertyRoutes.put(
  "/:id/basic-info",
  updatePropertyBasicInfo
);

/*
|--------------------------------------------------------------------------
| Update Property Location
|--------------------------------------------------------------------------
*/

vendorPropertyRoutes.put(
  "/:id/location",
  updatePropertyLocation
);

/*
|--------------------------------------------------------------------------
| Upload Property Images
|--------------------------------------------------------------------------
|
| Field name: images
| Maximum files per request: 10
| Maximum file size: 8 MB each
|
*/

vendorPropertyRoutes.post(
  "/:id/images",
  propertyImageUpload.array(
    "images",
    10
  ),
  uploadPropertyImages
);

/*
|--------------------------------------------------------------------------
| Reorder Property Images
|--------------------------------------------------------------------------
*/

vendorPropertyRoutes.put(
  "/:id/images/reorder",
  reorderPropertyImages
);

/*
|--------------------------------------------------------------------------
| Set Property Cover Image
|--------------------------------------------------------------------------
*/

vendorPropertyRoutes.patch(
  "/:id/images/:imageId/cover",
  setPropertyCoverImage
);

/*
|--------------------------------------------------------------------------
| Delete Property Image
|--------------------------------------------------------------------------
*/

vendorPropertyRoutes.delete(
  "/:id/images/:imageId",
  deletePropertyImage
);

/*
|--------------------------------------------------------------------------
| Update Pricing and Stay Rules
|--------------------------------------------------------------------------
*/

vendorPropertyRoutes.put(
  "/:id/pricing",
  updatePropertyPricing
);

/*
|--------------------------------------------------------------------------
| Update Property Amenities
|--------------------------------------------------------------------------
*/

vendorPropertyRoutes.put(
  "/:id/amenities",
  updatePropertyAmenities
);

/*
|--------------------------------------------------------------------------
| Update Property Rules
|--------------------------------------------------------------------------
*/

vendorPropertyRoutes.put(
  "/:id/rules",
  updatePropertyRules
);

/*
|--------------------------------------------------------------------------
| Submit Property For Approval
|--------------------------------------------------------------------------
*/

vendorPropertyRoutes.post(
  "/:id/submit",
  submitPropertyForApproval
);

/*
|--------------------------------------------------------------------------
| Delete Property
|--------------------------------------------------------------------------
*/

vendorPropertyRoutes.delete(
  "/:id",
  deleteProperty
);

export {
  vendorPropertyRoutes,
};
