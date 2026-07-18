import { Router } from "express";

import {
  createAmenity,
  deleteAmenity,
  getActiveAmenities,
  getAmenities,
  getAmenityById,
  updateAmenity,
  updateAmenityStatus,
} from "../controllers/amenity.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

import {
  createPublicImageUpload,
} from "../config/upload.js";

const adminAmenityRoutes = Router();
const vendorAmenityRoutes = Router();

/*
|--------------------------------------------------------------------------
| Amenity Image Upload
|--------------------------------------------------------------------------
|
| Amenity images are stored inside:
| storage/public/amenities
|
| Maximum allowed image size: 1 MB
| Multipart form field name: image
|
*/

const amenityImageUpload =
  createPublicImageUpload(
    "amenities",
    1
  );

/*
|--------------------------------------------------------------------------
| Admin Amenity Routes
|--------------------------------------------------------------------------
|
| Only ADMIN and STAFF_ADMIN users can manage amenity master data.
|
*/

adminAmenityRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN")
);

/*
|--------------------------------------------------------------------------
| Get All Amenities
|--------------------------------------------------------------------------
|
| Supported query parameters:
| ?search=wifi
| ?status=active
| ?group=POPULAR
|
*/

adminAmenityRoutes.get(
  "/",
  getAmenities
);

/*
|--------------------------------------------------------------------------
| Create Amenity
|--------------------------------------------------------------------------
|
| This route supports multipart/form-data.
| The uploaded image will be available through req.file.
|
*/

adminAmenityRoutes.post(
  "/",
  amenityImageUpload.single("image"),
  createAmenity
);

/*
|--------------------------------------------------------------------------
| Get Single Amenity
|--------------------------------------------------------------------------
*/

adminAmenityRoutes.get(
  "/:id",
  getAmenityById
);

/*
|--------------------------------------------------------------------------
| Update Amenity
|--------------------------------------------------------------------------
|
| Uploading a new image is optional while editing.
|
*/

adminAmenityRoutes.put(
  "/:id",
  amenityImageUpload.single("image"),
  updateAmenity
);

/*
|--------------------------------------------------------------------------
| Update Amenity Status
|--------------------------------------------------------------------------
|
| Status updates continue using application/json.
|
*/

adminAmenityRoutes.patch(
  "/:id/status",
  updateAmenityStatus
);

/*
|--------------------------------------------------------------------------
| Delete Amenity
|--------------------------------------------------------------------------
*/

adminAmenityRoutes.delete(
  "/:id",
  deleteAmenity
);

/*
|--------------------------------------------------------------------------
| Vendor Amenity Routes
|--------------------------------------------------------------------------
|
| Vendors can only fetch active amenities for property forms.
|
*/

vendorAmenityRoutes.use(
  authenticate,
  allowRoles("VENDOR")
);

/*
|--------------------------------------------------------------------------
| Get Active Amenities
|--------------------------------------------------------------------------
*/

vendorAmenityRoutes.get(
  "/",
  getActiveAmenities
);

export {
  adminAmenityRoutes,
  vendorAmenityRoutes,
};