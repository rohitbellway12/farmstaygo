import { Router } from "express";

import {
  addSupportTicketReply,
  createSupportTicket,
  deleteSupportTicket,
  getMySupportTickets,
  getPublicSupportTicketById,
  getPublicSupportTicketsByEmail,
  getSupportTicketById,
  getSupportTickets,
  getSupportTicketStats,
  updateSupportTicket,
} from "../controllers/support-ticket.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  allowRoles,
} from "../middleware/role.middleware.js";

const supportTicketRoutes = Router();
const adminSupportTicketRoutes = Router();
const publicSupportTicketRoutes = Router();

supportTicketRoutes.post(
  "/",
  authenticate,
  createSupportTicket
);

supportTicketRoutes.get(
  "/my",
  authenticate,
  getMySupportTickets
);

supportTicketRoutes.post(
  "/:id/replies",
  authenticate,
  addSupportTicketReply
);

publicSupportTicketRoutes.post(
  "/public",
  createSupportTicket
);

publicSupportTicketRoutes.get(
  "/lookup",
  getPublicSupportTicketsByEmail
);

publicSupportTicketRoutes.get(
  "/lookup/:id",
  getPublicSupportTicketById
);

adminSupportTicketRoutes.use(
  authenticate,
  allowRoles("ADMIN", "STAFF_ADMIN", "SUPPORT")
);

adminSupportTicketRoutes.get(
  "/stats",
  getSupportTicketStats
);

adminSupportTicketRoutes.get(
  "/",
  getSupportTickets
);

adminSupportTicketRoutes.get(
  "/:id",
  getSupportTicketById
);

adminSupportTicketRoutes.patch(
  "/:id",
  updateSupportTicket
);

adminSupportTicketRoutes.delete(
  "/:id",
  deleteSupportTicket
);

export {
  adminSupportTicketRoutes,
  publicSupportTicketRoutes,
  supportTicketRoutes,
};
