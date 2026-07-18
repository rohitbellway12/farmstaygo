import { Router } from "express";
import {
  getProfile,
  login,
  registerUser,
  registerVendor,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register-user", registerUser);
router.post("/register-vendor", registerVendor);
router.post("/login", login);
router.get("/me", authenticate, getProfile);

export default router;