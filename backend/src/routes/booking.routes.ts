import { Router } from "express";

import {
  createBookingRequest,
  getAdminBookings,
  getMyBookings,
  getVendorBookings,
} from "../controllers/booking.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const bookingRoutes = Router();
const vendorBookingRoutes = Router();
const adminBookingRoutes = Router();

bookingRoutes.get(
  "/my",
  authenticate,
  getMyBookings
);

bookingRoutes.post(
  "/",
  authenticate,
  createBookingRequest
);

vendorBookingRoutes.get(
  "/",
  authenticate,
  allowRoles("VENDOR"),
  getVendorBookings
);

adminBookingRoutes.get(
  "/",
  authenticate,
  allowRoles(
    "ADMIN",
    "STAFF_ADMIN",
    "SUPPORT"
  ),
  getAdminBookings
);

export {
  adminBookingRoutes,
  bookingRoutes,
  vendorBookingRoutes,
};
