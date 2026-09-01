import { Router } from "express";
import {
  getPublicReviews,
  createReview,
  getAdminReviews,
  updateReviewStatus,
  deleteReview,
  getPropertyReviews,
} from "../controllers/review.controller.js";

const router = Router();

router.get("/public/properties/:propertyId/reviews", getPublicReviews);
router.post("/public/reviews", createReview);

router.get("/admin/reviews", getAdminReviews);
router.patch("/admin/reviews/:id/status", updateReviewStatus);
router.delete("/admin/reviews/:id", deleteReview);
router.get("/admin/properties/:propertyId/reviews", getPropertyReviews);

export default router;
