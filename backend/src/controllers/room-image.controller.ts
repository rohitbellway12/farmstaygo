import type { Response } from "express";

import {
  PropertyBookingType,
  PropertyStatus,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import {
  deletePublicStorageFile,
  getRoomImageStoragePath,
} from "../config/upload.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

/*
|--------------------------------------------------------------------------
| Request Types
|--------------------------------------------------------------------------
*/

interface ReorderRoomImagesBody {
  imageIds?: unknown;
}

/*
|--------------------------------------------------------------------------
| Get Uploaded Files
|--------------------------------------------------------------------------
*/

const getUploadedFiles = (
  req: AuthenticatedRequest
): Express.Multer.File[] => {
  if (!Array.isArray(req.files)) {
    return [];
  }

  return req.files as Express.Multer.File[];
};

/*
|--------------------------------------------------------------------------
| Delete Newly Uploaded Files
|--------------------------------------------------------------------------
|
| Used whenever validation or database processing fails after Multer has
| already stored the files.
|
*/

const deleteUploadedFiles = (
  propertyId: string,
  roomTypeId: string,
  files: Express.Multer.File[]
): void => {
  files.forEach((file) => {
    const storagePath =
      getRoomImageStoragePath(
        propertyId,
        roomTypeId,
        file.filename
      );

    deletePublicStorageFile(storagePath);
  });
};

/*
|--------------------------------------------------------------------------
| Property Supports Room Inventory
|--------------------------------------------------------------------------
*/

const propertySupportsRooms = (
  bookingType: PropertyBookingType
): boolean => {
  return (
    bookingType ===
      PropertyBookingType.ROOM_WISE ||
    bookingType ===
      PropertyBookingType.BOTH
  );
};

/*
|--------------------------------------------------------------------------
| Room Management Permission
|--------------------------------------------------------------------------
|
| Allowed property statuses:
|
| DRAFT
| REJECTED
| APPROVED
| INACTIVE
|
| Blocked:
|
| PENDING_APPROVAL
| SUSPENDED
|
*/

const roomManagementIsBlocked = (
  status: PropertyStatus
): boolean => {
  return (
    status ===
      PropertyStatus.PENDING_APPROVAL ||
    status ===
      PropertyStatus.SUSPENDED
  );
};

/*
|--------------------------------------------------------------------------
| Find Vendor-Owned Room Type
|--------------------------------------------------------------------------
*/

const getVendorOwnedRoomType = async (
  userId: number,
  propertyId: string,
  roomTypeId: string
) => {
  return prisma.roomType.findFirst({
    where: {
      id: roomTypeId,
      propertyId,

      property: {
        vendor: {
          userId,
        },
      },
    },

    select: {
      id: true,
      propertyId: true,
      name: true,
      slug: true,
      isActive: true,

      property: {
        select: {
          id: true,
          title: true,
          bookingType: true,
          status: true,
        },
      },
    },
  });
};

/*
|--------------------------------------------------------------------------
| Validate Room Management Access
|--------------------------------------------------------------------------
*/

const validateRoomAccess = (
  roomType: Awaited<
    ReturnType<
      typeof getVendorOwnedRoomType
    >
  >
):
  | {
      success: true;
    }
  | {
      success: false;
      status: number;
      message: string;
    } => {
  if (!roomType) {
    return {
      success: false,
      status: 404,
      message:
        "Room type was not found",
    };
  }

  if (
    !propertySupportsRooms(
      roomType.property.bookingType
    )
  ) {
    return {
      success: false,
      status: 409,
      message:
        "This property does not support room-wise booking",
    };
  }

  if (
    roomManagementIsBlocked(
      roomType.property.status
    )
  ) {
    return {
      success: false,
      status: 409,
      message:
        "Room images cannot currently be edited for this property",
    };
  }

  return {
    success: true,
  };
};

/*
|--------------------------------------------------------------------------
| Vendor: Upload Room Images
|--------------------------------------------------------------------------
*/

export const uploadRoomImages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const propertyId = String(
    req.params.propertyId || ""
  ).trim();

  const roomTypeId = String(
    req.params.roomTypeId || ""
  ).trim();

  const uploadedFiles =
    getUploadedFiles(req);

  try {
    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    if (!req.user) {
      deleteUploadedFiles(
        propertyId,
        roomTypeId,
        uploadedFiles
      );

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate IDs
    |--------------------------------------------------------------------------
    */

    if (!propertyId || !roomTypeId) {
      deleteUploadedFiles(
        propertyId,
        roomTypeId,
        uploadedFiles
      );

      return res.status(422).json({
        success: false,
        message:
          "Property ID and room type ID are required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Files
    |--------------------------------------------------------------------------
    */

    if (uploadedFiles.length === 0) {
      return res.status(422).json({
        success: false,
        message:
          "Please select at least one room image",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Vendor Ownership
    |--------------------------------------------------------------------------
    */

    const roomType =
      await getVendorOwnedRoomType(
        req.user.id,
        propertyId,
        roomTypeId
      );

    const roomAccess =
      validateRoomAccess(roomType);

    if (!roomAccess.success) {
      deleteUploadedFiles(
        propertyId,
        roomTypeId,
        uploadedFiles
      );

      return res
        .status(roomAccess.status)
        .json({
          success: false,
          message:
            roomAccess.message,
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Existing Images
    |--------------------------------------------------------------------------
    */

    const existingImages =
      await prisma.roomImage.findMany({
        where: {
          roomTypeId,
        },

        select: {
          id: true,
          isCover: true,
          sortOrder: true,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Maximum Images
    |--------------------------------------------------------------------------
    */

    const maximumImages = 20;

    if (
      existingImages.length +
        uploadedFiles.length >
      maximumImages
    ) {
      deleteUploadedFiles(
        propertyId,
        roomTypeId,
        uploadedFiles
      );

      return res.status(422).json({
        success: false,
        message:
          `A room type can have a maximum of ${maximumImages} images`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve Cover and Sort Order
    |--------------------------------------------------------------------------
    */

    const hasCoverImage =
      existingImages.some(
        (image) => image.isCover
      );

    const currentHighestSortOrder =
      existingImages.length > 0
        ? Math.max(
            ...existingImages.map(
              (image) => image.sortOrder
            )
          )
        : -1;

    /*
    |--------------------------------------------------------------------------
    | Create Image Records
    |--------------------------------------------------------------------------
    */

    const createQueries =
      uploadedFiles.map(
        (file, index) => {
          return prisma.roomImage.create({
            data: {
              roomTypeId,

              image:
                getRoomImageStoragePath(
                  propertyId,
                  roomTypeId,
                  file.filename
                ),

              altText:
                roomType?.name ||
                "Room image",

              isCover:
                !hasCoverImage &&
                index === 0,

              sortOrder:
                currentHighestSortOrder +
                index +
                1,
            },
          });
        }
      );

    await prisma.$transaction(
      createQueries
    );

    /*
    |--------------------------------------------------------------------------
    | Return Complete Image Gallery
    |--------------------------------------------------------------------------
    */

    const roomImages =
      await prisma.roomImage.findMany({
        where: {
          roomTypeId,
        },

        orderBy: [
          {
            isCover: "desc",
          },
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

    return res.status(201).json({
      success: true,

      message:
        uploadedFiles.length === 1
          ? "Room image uploaded successfully"
          : `${uploadedFiles.length} room images uploaded successfully`,

      data: roomImages,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Delete Files If Database Operation Failed
    |--------------------------------------------------------------------------
    */

    deleteUploadedFiles(
      propertyId,
      roomTypeId,
      uploadedFiles
    );

    console.error(
      "Upload room images error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to upload room images",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Set Room Cover Image
|--------------------------------------------------------------------------
*/

export const setRoomCoverImage =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Authentication
      |--------------------------------------------------------------------------
      */

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Resolve IDs
      |--------------------------------------------------------------------------
      */

      const propertyId = String(
        req.params.propertyId || ""
      ).trim();

      const roomTypeId = String(
        req.params.roomTypeId || ""
      ).trim();

      const imageId = String(
        req.params.imageId || ""
      ).trim();

      if (
        !propertyId ||
        !roomTypeId ||
        !imageId
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID, room type ID and image ID are required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Verify Ownership and Access
      |--------------------------------------------------------------------------
      */

      const roomType =
        await getVendorOwnedRoomType(
          req.user.id,
          propertyId,
          roomTypeId
        );

      const roomAccess =
        validateRoomAccess(roomType);

      if (!roomAccess.success) {
        return res
          .status(roomAccess.status)
          .json({
            success: false,
            message:
              roomAccess.message,
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Find Image
      |--------------------------------------------------------------------------
      */

      const image =
        await prisma.roomImage.findFirst({
          where: {
            id: imageId,
            roomTypeId,
          },
        });

      if (!image) {
        return res.status(404).json({
          success: false,
          message:
            "Room image was not found",
        });
      }

      if (image.isCover) {
        return res.status(409).json({
          success: false,
          message:
            "This image is already the room cover image",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Update Cover Image
      |--------------------------------------------------------------------------
      */

      const updatedImage =
        await prisma.$transaction(
          async (transaction) => {
            await transaction.roomImage.updateMany(
              {
                where: {
                  roomTypeId,
                },

                data: {
                  isCover: false,
                },
              }
            );

            return transaction.roomImage.update(
              {
                where: {
                  id: imageId,
                },

                data: {
                  isCover: true,
                },
              }
            );
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Room cover image updated successfully",
        data: updatedImage,
      });
    } catch (error) {
      console.error(
        "Set room cover image error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update room cover image",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Reorder Room Images
|--------------------------------------------------------------------------
*/

export const reorderRoomImages =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Authentication
      |--------------------------------------------------------------------------
      */

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Resolve IDs and Body
      |--------------------------------------------------------------------------
      */

      const propertyId = String(
        req.params.propertyId || ""
      ).trim();

      const roomTypeId = String(
        req.params.roomTypeId || ""
      ).trim();

      const body =
        req.body as ReorderRoomImagesBody;

      if (!propertyId || !roomTypeId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID and room type ID are required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Image Order
      |--------------------------------------------------------------------------
      */

      if (
        !Array.isArray(body.imageIds) ||
        body.imageIds.length === 0 ||
        !body.imageIds.every(
          (imageId) =>
            typeof imageId === "string" &&
            imageId.trim()
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please provide a valid room image order",
        });
      }

      const imageIds =
        body.imageIds.map(
          (imageId) =>
            String(imageId).trim()
        );

      const uniqueImageIds = [
        ...new Set(imageIds),
      ];

      if (
        uniqueImageIds.length !==
        imageIds.length
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Room image order contains duplicate images",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Verify Ownership and Access
      |--------------------------------------------------------------------------
      */

      const roomType =
        await getVendorOwnedRoomType(
          req.user.id,
          propertyId,
          roomTypeId
        );

      const roomAccess =
        validateRoomAccess(roomType);

      if (!roomAccess.success) {
        return res
          .status(roomAccess.status)
          .json({
            success: false,
            message:
              roomAccess.message,
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Verify All Images Are Included
      |--------------------------------------------------------------------------
      */

      const existingImages =
        await prisma.roomImage.findMany({
          where: {
            roomTypeId,
          },

          select: {
            id: true,
          },
        });

      const existingImageIds =
        existingImages.map(
          (image) => image.id
        );

      const containsEveryImage =
        existingImageIds.length ===
          imageIds.length &&
        existingImageIds.every(
          (imageId) =>
            imageIds.includes(imageId)
        );

      if (!containsEveryImage) {
        return res.status(422).json({
          success: false,
          message:
            "Image order must include every room image exactly once",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Update Sort Order
      |--------------------------------------------------------------------------
      */

      const updateQueries =
        imageIds.map(
          (imageId, index) =>
            prisma.roomImage.update({
              where: {
                id: imageId,
              },

              data: {
                sortOrder: index,
              },
            })
        );

      await prisma.$transaction(
        updateQueries
      );

      const reorderedImages =
        await prisma.roomImage.findMany({
          where: {
            roomTypeId,
          },

          orderBy: [
            {
              isCover: "desc",
            },
            {
              sortOrder: "asc",
            },
          ],
        });

      return res.status(200).json({
        success: true,
        message:
          "Room images reordered successfully",
        data: reorderedImages,
      });
    } catch (error) {
      console.error(
        "Reorder room images error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to reorder room images",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Delete Room Image
|--------------------------------------------------------------------------
*/

export const deleteRoomImage =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Authentication
      |--------------------------------------------------------------------------
      */

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Resolve IDs
      |--------------------------------------------------------------------------
      */

      const propertyId = String(
        req.params.propertyId || ""
      ).trim();

      const roomTypeId = String(
        req.params.roomTypeId || ""
      ).trim();

      const imageId = String(
        req.params.imageId || ""
      ).trim();

      if (
        !propertyId ||
        !roomTypeId ||
        !imageId
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID, room type ID and image ID are required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Verify Ownership and Access
      |--------------------------------------------------------------------------
      */

      const roomType =
        await getVendorOwnedRoomType(
          req.user.id,
          propertyId,
          roomTypeId
        );

      const roomAccess =
        validateRoomAccess(roomType);

      if (!roomAccess.success) {
        return res
          .status(roomAccess.status)
          .json({
            success: false,
            message:
              roomAccess.message,
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Find Image
      |--------------------------------------------------------------------------
      */

      const image =
        await prisma.roomImage.findFirst({
          where: {
            id: imageId,
            roomTypeId,
          },
        });

      if (!image) {
        return res.status(404).json({
          success: false,
          message:
            "Room image was not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Delete Record and Replace Cover When Required
      |--------------------------------------------------------------------------
      */

      await prisma.$transaction(
        async (transaction) => {
          await transaction.roomImage.delete({
            where: {
              id: image.id,
            },
          });

          if (image.isCover) {
            const nextImage =
              await transaction.roomImage.findFirst(
                {
                  where: {
                    roomTypeId,
                  },

                  orderBy: [
                    {
                      sortOrder: "asc",
                    },
                    {
                      createdAt: "asc",
                    },
                  ],
                }
              );

            if (nextImage) {
              await transaction.roomImage.update(
                {
                  where: {
                    id: nextImage.id,
                  },

                  data: {
                    isCover: true,
                  },
                }
              );
            }
          }
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Delete Physical File
      |--------------------------------------------------------------------------
      */

      deletePublicStorageFile(
        image.image
      );

      /*
      |--------------------------------------------------------------------------
      | Return Remaining Images
      |--------------------------------------------------------------------------
      */

      const remainingImages =
        await prisma.roomImage.findMany({
          where: {
            roomTypeId,
          },

          orderBy: [
            {
              isCover: "desc",
            },
            {
              sortOrder: "asc",
            },
          ],
        });

      return res.status(200).json({
        success: true,
        message:
          "Room image deleted successfully",
        data: remainingImages,
      });
    } catch (error) {
      console.error(
        "Delete room image error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete room image",
      });
    }
  };