import type { Response } from "express";

import {
  PropertyStatus,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import {
  deletePublicStorageFile,
  getPropertyImageStoragePath,
} from "../config/upload.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

/*
|--------------------------------------------------------------------------
| Request Types
|--------------------------------------------------------------------------
*/

interface ReorderPropertyImagesBody {
  imageIds?: unknown;
}

/*
|--------------------------------------------------------------------------
| Helper: Get Uploaded Files
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
| Helper: Delete Newly Uploaded Files
|--------------------------------------------------------------------------
*/

const deleteUploadedFiles = (
  propertyId: string,
  files: Express.Multer.File[]
): void => {
  files.forEach((file) => {
    const storagePath =
      getPropertyImageStoragePath(
        propertyId,
        file.filename
      );

    deletePublicStorageFile(storagePath);
  });
};

/*
|--------------------------------------------------------------------------
| Helper: Find Vendor-Owned Property
|--------------------------------------------------------------------------
*/

const getVendorOwnedProperty = async (
  userId: number,
  propertyId: string
) => {
  return prisma.property.findFirst({
    where: {
      id: propertyId,

      vendor: {
        userId,
      },
    },
  });
};

/*
|--------------------------------------------------------------------------
| Helper: Check Property Editing Permission
|--------------------------------------------------------------------------
*/

const propertyEditingIsBlocked = (
  status: PropertyStatus
): boolean => {
  return (
    status ===
      PropertyStatus.PENDING_APPROVAL ||
    status === PropertyStatus.APPROVED ||
    status === PropertyStatus.SUSPENDED
  );
};

/*
|--------------------------------------------------------------------------
| Vendor: Upload Property Images
|--------------------------------------------------------------------------
*/

export const uploadPropertyImages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const propertyId = String(
    req.params.id || ""
  ).trim();

  const uploadedFiles =
    getUploadedFiles(req);

  try {
    if (!req.user) {
      deleteUploadedFiles(
        propertyId,
        uploadedFiles
      );

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!propertyId) {
      deleteUploadedFiles(
        propertyId,
        uploadedFiles
      );

      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

    if (uploadedFiles.length === 0) {
      return res.status(422).json({
        success: false,
        message:
          "Please select at least one property image",
      });
    }

    const property =
      await getVendorOwnedProperty(
        req.user.id,
        propertyId
      );

    if (!property) {
      deleteUploadedFiles(
        propertyId,
        uploadedFiles
      );

      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (
      propertyEditingIsBlocked(
        property.status
      )
    ) {
      deleteUploadedFiles(
        propertyId,
        uploadedFiles
      );

      return res.status(409).json({
        success: false,
        message:
          "This property cannot currently be edited",
      });
    }

    const existingImages =
      await prisma.propertyImage.findMany({
        where: {
          propertyId,
        },

        select: {
          id: true,
          isCover: true,
          sortOrder: true,
        },
      });

    const maximumImages = 20;

    if (
      existingImages.length +
        uploadedFiles.length >
      maximumImages
    ) {
      deleteUploadedFiles(
        propertyId,
        uploadedFiles
      );

      return res.status(422).json({
        success: false,
        message:
          `A property can have a maximum of ${maximumImages} images`,
      });
    }

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

    const createQueries =
      uploadedFiles.map(
        (file, index) => {
          return prisma.propertyImage.create({
            data: {
              propertyId,

              image:
                getPropertyImageStoragePath(
                  propertyId,
                  file.filename
                ),

              altText: property.title,

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

    const propertyImages =
      await prisma.propertyImage.findMany({
        where: {
          propertyId,
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

    return res.status(201).json({
      success: true,
      message:
        uploadedFiles.length === 1
          ? "Property image uploaded successfully"
          : `${uploadedFiles.length} property images uploaded successfully`,
      data: propertyImages,
    });
  } catch (error) {
    deleteUploadedFiles(
      propertyId,
      uploadedFiles
    );

    console.error(
      "Upload property images error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to upload property images",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Set Property Cover Image
|--------------------------------------------------------------------------
*/

export const setPropertyCoverImage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const propertyId = String(
      req.params.id || ""
    ).trim();

    const imageId = String(
      req.params.imageId || ""
    ).trim();

    if (!propertyId || !imageId) {
      return res.status(422).json({
        success: false,
        message:
          "Property ID and image ID are required",
      });
    }

    const property =
      await getVendorOwnedProperty(
        req.user.id,
        propertyId
      );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (
      propertyEditingIsBlocked(
        property.status
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This property cannot currently be edited",
      });
    }

    const image =
      await prisma.propertyImage.findFirst({
        where: {
          id: imageId,
          propertyId,
        },
      });

    if (!image) {
      return res.status(404).json({
        success: false,
        message:
          "Property image was not found",
      });
    }

    const updatedImage =
      await prisma.$transaction(
        async (transaction) => {
          await transaction.propertyImage.updateMany(
            {
              where: {
                propertyId,
              },

              data: {
                isCover: false,
              },
            }
          );

          return transaction.propertyImage.update(
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
        "Cover image updated successfully",
      data: updatedImage,
    });
  } catch (error) {
    console.error(
      "Set property cover image error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update cover image",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Reorder Property Images
|--------------------------------------------------------------------------
*/

export const reorderPropertyImages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const propertyId = String(
      req.params.id || ""
    ).trim();

    const body =
      req.body as ReorderPropertyImagesBody;

    if (!propertyId) {
      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

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
          "Please provide a valid image order",
      });
    }

    const imageIds = body.imageIds.map(
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
          "Image order contains duplicate images",
      });
    }

    const property =
      await getVendorOwnedProperty(
        req.user.id,
        propertyId
      );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (
      propertyEditingIsBlocked(
        property.status
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This property cannot currently be edited",
      });
    }

    const existingImages =
      await prisma.propertyImage.findMany({
        where: {
          propertyId,
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
      existingImageIds.every((id) =>
        imageIds.includes(id)
      );

    if (!containsEveryImage) {
      return res.status(422).json({
        success: false,
        message:
          "Image order must include every property image exactly once",
      });
    }

    const updateQueries =
      imageIds.map((imageId, index) =>
        prisma.propertyImage.update({
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
      await prisma.propertyImage.findMany({
        where: {
          propertyId,
        },

        orderBy: {
          sortOrder: "asc",
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Property images reordered successfully",
      data: reorderedImages,
    });
  } catch (error) {
    console.error(
      "Reorder property images error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reorder property images",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Delete Property Image
|--------------------------------------------------------------------------
*/

export const deletePropertyImage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const propertyId = String(
      req.params.id || ""
    ).trim();

    const imageId = String(
      req.params.imageId || ""
    ).trim();

    if (!propertyId || !imageId) {
      return res.status(422).json({
        success: false,
        message:
          "Property ID and image ID are required",
      });
    }

    const property =
      await getVendorOwnedProperty(
        req.user.id,
        propertyId
      );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (
      propertyEditingIsBlocked(
        property.status
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This property cannot currently be edited",
      });
    }

    const image =
      await prisma.propertyImage.findFirst({
        where: {
          id: imageId,
          propertyId,
        },
      });

    if (!image) {
      return res.status(404).json({
        success: false,
        message:
          "Property image was not found",
      });
    }

    await prisma.$transaction(
      async (transaction) => {
        await transaction.propertyImage.delete({
          where: {
            id: image.id,
          },
        });

        if (image.isCover) {
          const nextImage =
            await transaction.propertyImage.findFirst(
              {
                where: {
                  propertyId,
                },

                orderBy: {
                  sortOrder: "asc",
                },
              }
            );

          if (nextImage) {
            await transaction.propertyImage.update(
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

    deletePublicStorageFile(image.image);

    const remainingImages =
      await prisma.propertyImage.findMany({
        where: {
          propertyId,
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
        "Property image deleted successfully",
      data: remainingImages,
    });
  } catch (error) {
    console.error(
      "Delete property image error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete property image",
    });
  }
};