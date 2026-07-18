import {
  Router,
} from "express";

import {
  getPublicPropertyCategories,
} from "../controllers/public-category.controller.js";

const publicCategoryRoutes =
  Router();

/*
|--------------------------------------------------------------------------
| Public Property Categories
|--------------------------------------------------------------------------
|
| GET /api/public/property-categories
|
*/

publicCategoryRoutes.get(
  "/",
  getPublicPropertyCategories
);

export default publicCategoryRoutes;