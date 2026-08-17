import {
  Router,
} from "express";

import {
  checkPublicPropertyAvailability,
  getPublicProperties,
  getPublicPropertyDetails,
  getRelatedProperties,
} from "../controllers/public-property.controller.js";

const publicPropertyRoutes =
  Router();

/*
|--------------------------------------------------------------------------
| Public Property Listing
|--------------------------------------------------------------------------
|
| GET /api/public/properties
|
*/

publicPropertyRoutes.get(
  "/",
  getPublicProperties
);

/*
|--------------------------------------------------------------------------
| Public Property Availability
|--------------------------------------------------------------------------
|
| This must remain before /:identifier.
|
| GET /api/public/properties/:identifier/availability
|
*/

publicPropertyRoutes.get(
  "/:identifier/availability",
  checkPublicPropertyAvailability
);

/*
|--------------------------------------------------------------------------
| Public Property Details
|--------------------------------------------------------------------------
|
| GET /api/public/properties/:identifier
|
*/

publicPropertyRoutes.get(
  "/:identifier",
  getPublicPropertyDetails
);

/*
|--------------------------------------------------------------------------
| Public Related Properties
|--------------------------------------------------------------------------
|
| GET /api/public/properties/:identifier/related
|
*/

publicPropertyRoutes.get(
  "/:identifier/related",
  getRelatedProperties
);

export default publicPropertyRoutes;