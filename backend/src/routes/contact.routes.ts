import { Router } from "express";

import {
  createContactMessage,
  getPublicContactInfo,
} from "../controllers/contact.controller.js";

const contactRoutes = Router();

/*
|--------------------------------------------------------------------------
| Public Contact Info & Form
|--------------------------------------------------------------------------
|
| GET /api/contact — contact info (email, phone, social links)
| POST /api/contact — submit a contact message (no auth required)
|
*/

contactRoutes.get("/info", getPublicContactInfo);
contactRoutes.post("/", createContactMessage);

export default contactRoutes;
