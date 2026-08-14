import { Router } from "express";

import {
  createPropertyRule,
  deletePropertyRule,
  getActivePropertyRules,
  getPropertyRuleById,
  getPropertyRules,
  updatePropertyRule,
} from "../controllers/property-rule.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminPropertyRuleRoutes =
  Router();
const vendorPropertyRuleRoutes = Router();

/*
|--------------------------------------------------------------------------
| Admin Property Rule Routes
|--------------------------------------------------------------------------
|
| Only ADMIN and STAFF_ADMIN users can manage property rules.
|
*/

adminPropertyRuleRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN")
);

/*
|--------------------------------------------------------------------------
| Get All Property Rules
|--------------------------------------------------------------------------
|
| GET /api/admin/property-rules
|
| Supported query parameters:
| ?search=smoking
| ?status=active|inactive
|
*/

adminPropertyRuleRoutes.get(
  "/",
  getPropertyRules
);

/*
|--------------------------------------------------------------------------
| Get Property Rule By ID
|--------------------------------------------------------------------------
|
| GET /api/admin/property-rules/:id
|
*/

adminPropertyRuleRoutes.get(
  "/:id",
  getPropertyRuleById
);

/*
|--------------------------------------------------------------------------
| Create Property Rule
|--------------------------------------------------------------------------
|
| POST /api/admin/property-rules
|
*/

adminPropertyRuleRoutes.post(
  "/",
  createPropertyRule
);

/*
|--------------------------------------------------------------------------
| Update Property Rule
|--------------------------------------------------------------------------
|
| PUT /api/admin/property-rules/:id
|
*/

adminPropertyRuleRoutes.put(
  "/:id",
  updatePropertyRule
);

/*
|--------------------------------------------------------------------------
| Delete Property Rule
|--------------------------------------------------------------------------
|
| DELETE /api/admin/property-rules/:id
|
*/

adminPropertyRuleRoutes.delete(
  "/:id",
  deletePropertyRule
);

/*
|--------------------------------------------------------------------------
| Vendor Property Rule Routes
|--------------------------------------------------------------------------
|
| Vendors can fetch active rules to select for their properties.
|
*/

vendorPropertyRuleRoutes.use(
  authenticate,
  allowRoles("VENDOR")
);

/*
|--------------------------------------------------------------------------
| Get Active Property Rules
|--------------------------------------------------------------------------
|
| GET /api/vendor/property-rules
|
*/

vendorPropertyRuleRoutes.get(
  "/",
  getActivePropertyRules
);

export {
  adminPropertyRuleRoutes,
  vendorPropertyRuleRoutes,
};
