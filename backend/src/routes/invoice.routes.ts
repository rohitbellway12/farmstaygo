import { Router } from "express";

import {
  generateInvoice,
  downloadInvoice,
} from "../controllers/invoice.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

const invoiceRoutes = Router();

invoiceRoutes.post(
  "/:id/generate",
  authenticate,
  generateInvoice
);

invoiceRoutes.get(
  "/:id/download",
  authenticate,
  downloadInvoice
);

export default invoiceRoutes;