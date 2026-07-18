import { Router } from "express";

import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../controllers/wishlist.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

const wishlistRoutes = Router();

wishlistRoutes.use(authenticate);

wishlistRoutes.get("/", getWishlist);

wishlistRoutes.post("/", addToWishlist);

wishlistRoutes.delete("/", removeFromWishlist);

export { wishlistRoutes };
