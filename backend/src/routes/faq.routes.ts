import { Router } from "express";

import {
  createFaq,
  deleteFaq,
  getAdminFaqs,
  getPublicFaqs,
  updateFaq,
} from "../controllers/faq.controller.js";

const adminFaqRoutes = Router();
const publicFaqRoutes = Router();

publicFaqRoutes.get("/", getPublicFaqs);

adminFaqRoutes.get("/", getAdminFaqs);
adminFaqRoutes.post("/", createFaq);
adminFaqRoutes.put("/:id", updateFaq);
adminFaqRoutes.delete("/:id", deleteFaq);

export { adminFaqRoutes, publicFaqRoutes };
