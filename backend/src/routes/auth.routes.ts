import { Router } from "express";
import {
  changePassword,
  getProfile,
  login,
  registerUser,
  registerVendor,
  updateProfile,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register-user", registerUser);
router.post("/register-vendor", registerVendor);
router.post("/login", login);
router.get("/me", authenticate, getProfile);
router.patch("/profile", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);

export default router;