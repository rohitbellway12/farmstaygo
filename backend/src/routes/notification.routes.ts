import { Router } from "express";

import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const notificationRoutes = Router();

notificationRoutes.get(
  "/",
  authenticate,
  getNotifications
);

notificationRoutes.get(
  "/unread-count",
  authenticate,
  getUnreadCount
);

notificationRoutes.patch(
  "/:id/read",
  authenticate,
  markAsRead
);

notificationRoutes.patch(
  "/read-all",
  authenticate,
  markAllAsRead
);

notificationRoutes.post(
  "/",
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN"),
  createNotification
);

export default notificationRoutes;