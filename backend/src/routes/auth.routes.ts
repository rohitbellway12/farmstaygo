import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getProfile,
  login,
  registerUser,
  registerVendor,
  resetPassword,
  updateProfile,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register-user", registerUser);
router.post("/register-vendor", registerVendor);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, getProfile);
router.patch("/profile", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);

export default router;