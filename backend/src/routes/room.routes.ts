import {
  Router,
} from "express";

import {
  createVendorRoomType,
  deleteVendorRoomType,
  getVendorRoomTypeById,
  getVendorRoomTypes,
  updateVendorRoomAmenities,
  updateVendorRoomStatus,
  updateVendorRoomType,
} from "../controllers/room.controller.js";

import {
  deleteRoomImage,
  reorderRoomImages,
  setRoomCoverImage,
  uploadRoomImages,
} from "../controllers/room-image.controller.js";

import {
  createRoomImageUpload,
} from "../config/upload.js";

const vendorRoomRoutes = Router({
  mergeParams: true,
});

const roomImageUpload =
  createRoomImageUpload(8);

/*
|--------------------------------------------------------------------------
| Get Room Inventory
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.get(
  "/",
  getVendorRoomTypes
);

/*
|--------------------------------------------------------------------------
| Create Room Type
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.post(
  "/",
  createVendorRoomType
);

/*
|--------------------------------------------------------------------------
| Update Room Status
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.patch(
  "/:roomTypeId/status",
  updateVendorRoomStatus
);

/*
|--------------------------------------------------------------------------
| Update Room Amenities
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.put(
  "/:roomTypeId/amenities",
  updateVendorRoomAmenities
);

/*
|--------------------------------------------------------------------------
| Upload Room Images
|--------------------------------------------------------------------------
|
| Field name: images
| Maximum files per request: 10
| Maximum file size: 8 MB each
|
*/

vendorRoomRoutes.post(
  "/:roomTypeId/images",
  roomImageUpload.array(
    "images",
    10
  ),
  uploadRoomImages
);

/*
|--------------------------------------------------------------------------
| Reorder Room Images
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.put(
  "/:roomTypeId/images/reorder",
  reorderRoomImages
);

/*
|--------------------------------------------------------------------------
| Set Room Cover Image
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.patch(
  "/:roomTypeId/images/:imageId/cover",
  setRoomCoverImage
);

/*
|--------------------------------------------------------------------------
| Delete Room Image
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.delete(
  "/:roomTypeId/images/:imageId",
  deleteRoomImage
);

/*
|--------------------------------------------------------------------------
| Get Single Room Type
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.get(
  "/:roomTypeId",
  getVendorRoomTypeById
);

/*
|--------------------------------------------------------------------------
| Update Room Type
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.put(
  "/:roomTypeId",
  updateVendorRoomType
);

/*
|--------------------------------------------------------------------------
| Delete Room Type
|--------------------------------------------------------------------------
*/

vendorRoomRoutes.delete(
  "/:roomTypeId",
  deleteVendorRoomType
);

export {
  vendorRoomRoutes,
};