import { Router } from "express";

import {
  getContactMessages,
  getContactMessageById,
  markContactMessageRead,
  markAllContactMessagesRead,
  deleteContactMessage,
  getUnreadContactMessageCount,
} from "../controllers/contact-message.controller.js";

import {
  getContactSettings,
  updateContactSettings,
} from "../controllers/contact-setting.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { allowRoles } from "../middleware/role.middleware.js";

const adminContactRoutes = Router();

adminContactRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN", "SUPPORT")
);

/*
|--------------------------------------------------------------------------
| Contact Messages
|--------------------------------------------------------------------------
*/

adminContactRoutes.get(
  "/contact-messages",
  getContactMessages
);

adminContactRoutes.get(
  "/contact-messages/unread-count",
  getUnreadContactMessageCount
);

adminContactRoutes.get(
  "/contact-messages/:id",
  getContactMessageById
);

adminContactRoutes.patch(
  "/contact-messages/:id/read",
  markContactMessageRead
);

adminContactRoutes.patch(
  "/contact-messages/read-all",
  markAllContactMessagesRead
);

adminContactRoutes.delete(
  "/contact-messages/:id",
  deleteContactMessage
);

/*
|--------------------------------------------------------------------------
| Contact Settings
|--------------------------------------------------------------------------
*/

adminContactRoutes.get(
  "/contact-settings",
  getContactSettings
);

adminContactRoutes.put(
  "/contact-settings",
  updateContactSettings
);

export { adminContactRoutes };
