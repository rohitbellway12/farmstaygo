import { Router } from "express";

import {
  approveProperty,
  getAdminPropertyApprovalById,
  getAdminPropertyApprovals,
  rejectProperty,
} from "../controllers/admin-property-approval.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const adminPropertyApprovalRoutes =
  Router();

/*
|--------------------------------------------------------------------------
| Admin Property Approval Authentication
|--------------------------------------------------------------------------
|
| All property approval routes require an authenticated Admin account.
|
*/

adminPropertyApprovalRoutes.use(
  authenticate,
  allowRoles("ADMIN")
);

/*
|--------------------------------------------------------------------------
| Get Property Approval List
|--------------------------------------------------------------------------
|
| Default:
| ?status=PENDING_APPROVAL
|
| Optional query parameters:
| ?search=farm
| ?status=ALL
| ?status=PENDING_APPROVAL
| ?status=APPROVED
| ?status=REJECTED
|
*/

adminPropertyApprovalRoutes.get(
  "/",
  getAdminPropertyApprovals
);

/*
|--------------------------------------------------------------------------
| Get Single Property Review Details
|--------------------------------------------------------------------------
*/

adminPropertyApprovalRoutes.get(
  "/:id",
  getAdminPropertyApprovalById
);

/*
|--------------------------------------------------------------------------
| Approve Property
|--------------------------------------------------------------------------
*/

adminPropertyApprovalRoutes.patch(
  "/:id/approve",
  approveProperty
);

/*
|--------------------------------------------------------------------------
| Reject Property
|--------------------------------------------------------------------------
|
| Request body:
|
| {
|   "reason": "Please upload clearer property photos."
| }
|
*/

adminPropertyApprovalRoutes.patch(
  "/:id/reject",
  rejectProperty
);

export {
  adminPropertyApprovalRoutes,
};