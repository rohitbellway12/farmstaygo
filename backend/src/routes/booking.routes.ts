import { Router } from "express";

import {
  acceptBooking,
  approvePayment,
  createBookingRequest,
  getAdminBookings,
  getBookingPayments,
  getMyBookings,
  getVendorBookings,
  recordPayment,
  rejectBooking,
  rejectPayment,
} from "../controllers/booking.controller.js";

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayStatus,
} from "../controllers/payment-gateway.controller.js";

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

bookingRoutes.get(
  "/:id/payments",
  authenticate,
  getBookingPayments
);

bookingRoutes.post(
  "/:id/payments",
  authenticate,
  recordPayment
);

// Razorpay payment gateway routes
bookingRoutes.get(
  "/razorpay/status",
  getRazorpayStatus
);

bookingRoutes.post(
  "/:id/razorpay/order",
  authenticate,
  createRazorpayOrder
);

bookingRoutes.post(
  "/:id/razorpay/verify",
  authenticate,
  verifyRazorpayPayment
);

vendorBookingRoutes.get(
  "/",
  authenticate,
  allowRoles("VENDOR"),
  getVendorBookings
);

vendorBookingRoutes.post(
  "/:id/accept",
  authenticate,
  allowRoles("VENDOR"),
  acceptBooking
);

vendorBookingRoutes.post(
  "/:id/reject",
  authenticate,
  allowRoles("VENDOR"),
  rejectBooking
);

vendorBookingRoutes.post(
  "/:id/payments",
  authenticate,
  allowRoles("VENDOR"),
  recordPayment
);

vendorBookingRoutes.post(
  "/:id/payments/:paymentId/approve",
  authenticate,
  allowRoles("VENDOR"),
  approvePayment
);

vendorBookingRoutes.post(
  "/:id/payments/:paymentId/reject",
  authenticate,
  allowRoles("VENDOR"),
  rejectPayment
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
