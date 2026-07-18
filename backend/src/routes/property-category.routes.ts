import { Router } from "express";

import {
  createPropertyCategory,
  deletePropertyCategory,
  getActivePropertyCategories,
  getPropertyCategories,
  getPropertyCategoryById,
  updatePropertyCategory,
  updatePropertyCategoryStatus,
} from "../controllers/property-category.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

import {
  createPublicImageUpload,
} from "../config/upload.js";

const adminPropertyCategoryRoutes = Router();
const vendorPropertyCategoryRoutes = Router();

/*
|--------------------------------------------------------------------------
| Property Category Image Upload
|--------------------------------------------------------------------------
|
| Category images are stored inside:
| storage/public/property-categories
|
| Maximum allowed image size: 5 MB
| Form field name: image
|
*/

const categoryImageUpload =
  createPublicImageUpload(
    "property-categories",
    5
  );

/*
|--------------------------------------------------------------------------
| Admin Property Category Routes
|--------------------------------------------------------------------------
|
| Only ADMIN and STAFF_ADMIN users can manage property categories.
|
*/

adminPropertyCategoryRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN")
);

/*
|--------------------------------------------------------------------------
| Get All Property Categories
|--------------------------------------------------------------------------
*/

adminPropertyCategoryRoutes.get(
  "/",
  getPropertyCategories
);

/*
|--------------------------------------------------------------------------
| Create Property Category
|--------------------------------------------------------------------------
|
| This route accepts multipart/form-data.
| The uploaded image is available through req.file.
|
*/

adminPropertyCategoryRoutes.post(
  "/",
  categoryImageUpload.single("image"),
  createPropertyCategory
);

/*
|--------------------------------------------------------------------------
| Get Single Property Category
|--------------------------------------------------------------------------
*/

adminPropertyCategoryRoutes.get(
  "/:id",
  getPropertyCategoryById
);

/*
|--------------------------------------------------------------------------
| Update Property Category
|--------------------------------------------------------------------------
|
| A new image is optional while updating the category.
|
*/

adminPropertyCategoryRoutes.put(
  "/:id",
  categoryImageUpload.single("image"),
  updatePropertyCategory
);

/*
|--------------------------------------------------------------------------
| Update Property Category Status
|--------------------------------------------------------------------------
|
| Status updates continue using application/json.
|
*/

adminPropertyCategoryRoutes.patch(
  "/:id/status",
  updatePropertyCategoryStatus
);

/*
|--------------------------------------------------------------------------
| Delete Property Category
|--------------------------------------------------------------------------
*/

adminPropertyCategoryRoutes.delete(
  "/:id",
  deletePropertyCategory
);

/*
|--------------------------------------------------------------------------
| Vendor Property Category Routes
|--------------------------------------------------------------------------
|
| Vendors can only fetch active property categories.
|
*/

vendorPropertyCategoryRoutes.use(
  authenticate,
  allowRoles("VENDOR")
);

vendorPropertyCategoryRoutes.get(
  "/",
  getActivePropertyCategories
);

export {
  adminPropertyCategoryRoutes,
  vendorPropertyCategoryRoutes,
};