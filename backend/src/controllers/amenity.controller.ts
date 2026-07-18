import type { Request, Response } from "express";

import {
  AmenityGroup,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import {
  deletePublicStorageFile,
  getPublicStoragePath,
} from "../config/upload.js";

/*
|--------------------------------------------------------------------------
| Request Body Types
|--------------------------------------------------------------------------
*/


interface AmenityBody {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  icon?: unknown;
  group?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
  removeImage?: unknown;
}

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const isNullableString = (
  value: unknown
): boolean => {
  return (
    value === undefined ||
    value === null ||
    typeof value === "string"
  );
};

const cleanOptionalString = (
  value: unknown
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const cleanedValue = value.trim();

  return cleanedValue || null;
};

const isAmenityGroup = (
  value: unknown
): value is AmenityGroup => {
  return (
    typeof value === "string" &&
    Object.values(AmenityGroup).includes(
      value as AmenityGroup
    )
  );
};

const isPrismaError = (
  error: unknown,
  code: string
): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
};

/*
|--------------------------------------------------------------------------
| Parse Boolean Form Field
|--------------------------------------------------------------------------
|
| JSON requests provide actual boolean values.
| Multipart form-data provides boolean values as strings.
|
*/

const parseBooleanField = (
  value: unknown
): {
  isValid: boolean;
  value?: boolean;
} => {
  if (value === undefined) {
    return {
      isValid: true,
      value: undefined,
    };
  }

  if (typeof value === "boolean") {
    return {
      isValid: true,
      value,
    };
  }

  if (typeof value === "string") {
    const normalizedValue = value
      .trim()
      .toLowerCase();

    if (
      normalizedValue === "true" ||
      normalizedValue === "1"
    ) {
      return {
        isValid: true,
        value: true,
      };
    }

    if (
      normalizedValue === "false" ||
      normalizedValue === "0"
    ) {
      return {
        isValid: true,
        value: false,
      };
    }
  }

  return {
    isValid: false,
  };
};

/*
|--------------------------------------------------------------------------
| Build Uploaded Amenity Image Path
|--------------------------------------------------------------------------
*/

const getUploadedAmenityImagePath = (
  file?: Express.Multer.File
): string | null => {
  if (!file) {
    return null;
  }

  return getPublicStoragePath(
    "amenities",
    file.filename
  );
};

/*
|--------------------------------------------------------------------------
| Admin: Get All Amenities
|--------------------------------------------------------------------------
*/

export const getAmenities = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status.trim().toLowerCase()
        : "all";

    const group =
      typeof req.query.group === "string"
        ? req.query.group.trim().toUpperCase()
        : "all";

    const where: Prisma.AmenityWhereInput = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          icon: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (status === "active") {
      where.isActive = true;
    }

    if (status === "inactive") {
      where.isActive = false;
    }

    if (
      group !== "ALL" &&
      isAmenityGroup(group)
    ) {
      where.group = group;
    }

    const amenities = await prisma.amenity.findMany({
      where,
      orderBy: [
        {
          group: "asc",
        },
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Amenities fetched successfully",
      data: amenities,
      total: amenities.length,
    });
  } catch (error) {
    console.error("Get amenities error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch amenities",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Get Active Amenities
|--------------------------------------------------------------------------
*/

export const getActiveAmenities = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const amenities = await prisma.amenity.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          group: "asc",
        },
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
  id: true,
  name: true,
  slug: true,
  description: true,
  icon: true,
  image: true,
  group: true,
  sortOrder: true,
},
    });

    return res.status(200).json({
      success: true,
      message:
        "Active amenities fetched successfully",
      data: amenities,
    });
  } catch (error) {
    console.error(
      "Get active amenities error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch amenities",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Get Single Amenity
|--------------------------------------------------------------------------
*/

export const getAmenityById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = String(
      req.params.id || ""
    ).trim();

    if (!id) {
      return res.status(422).json({
        success: false,
        message: "Amenity ID is required",
      });
    }

    const amenity = await prisma.amenity.findUnique({
      where: {
        id,
      },
    });

    if (!amenity) {
      return res.status(404).json({
        success: false,
        message: "Amenity not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Amenity fetched successfully",
      data: amenity,
    });
  } catch (error) {
    console.error("Get amenity error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch amenity",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Create Amenity
|--------------------------------------------------------------------------
*/



export const createAmenity = async (
  req: Request<
    Record<string, never>,
    unknown,
    AmenityBody
  >,
  res: Response
): Promise<Response> => {
  const uploadedImagePath =
    getUploadedAmenityImagePath(req.file);

  /*
  |--------------------------------------------------------------------------
  | Remove Uploaded File When Validation Fails
  |--------------------------------------------------------------------------
  */

  const rejectRequest = (
    statusCode: number,
    responseBody: Record<string, unknown>
  ): Response => {
    deletePublicStorageFile(uploadedImagePath);

    return res.status(statusCode).json(responseBody);
  };

  try {
    const {
      name,
      slug,
      description,
      icon,
      group,
      isActive,
      sortOrder,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return rejectRequest(422, {
        success: false,
        message: "Amenity name is required",
        errors: {
          name: "Please enter a valid amenity name",
        },
      });
    }

    if (
      slug !== undefined &&
      typeof slug !== "string"
    ) {
      return rejectRequest(422, {
        success: false,
        message: "Slug must be a valid string",
        errors: {
          slug: "Please enter a valid slug",
        },
      });
    }

    if (
      !isNullableString(description) ||
      !isNullableString(icon)
    ) {
      return rejectRequest(422, {
        success: false,
        message:
          "Description and icon must contain valid text values",
      });
    }

    const selectedGroup =
      group === undefined
        ? AmenityGroup.BASIC
        : group;

    if (!isAmenityGroup(selectedGroup)) {
      return rejectRequest(422, {
        success: false,
        message:
          "Please select a valid amenity group",
        errors: {
          group:
            "Selected amenity group is not valid",
        },
      });
    }

    const parsedIsActive =
      parseBooleanField(isActive);

    if (!parsedIsActive.isValid) {
      return rejectRequest(422, {
        success: false,
        message:
          "Active status must be true or false",
        errors: {
          isActive:
            "Please select a valid status",
        },
      });
    }

    const parsedSortOrder =
      sortOrder === undefined
        ? 0
        : Number(sortOrder);

    if (
      !Number.isInteger(parsedSortOrder) ||
      parsedSortOrder < 0
    ) {
      return rejectRequest(422, {
        success: false,
        message:
          "Sort order must be zero or greater",
        errors: {
          sortOrder:
            "Please enter a valid sort order",
        },
      });
    }

    const cleanedName = name.trim();

    const cleanedSlug = slugify(
      typeof slug === "string" && slug.trim()
        ? slug
        : cleanedName
    );

    if (!cleanedSlug) {
      return rejectRequest(422, {
        success: false,
        message:
          "Unable to generate amenity slug",
        errors: {
          slug:
            "Please enter a valid amenity name or slug",
        },
      });
    }

    const existingAmenityByName =
      await prisma.amenity.findFirst({
        where: {
          name: {
            equals: cleanedName,
            mode: "insensitive",
          },
        },
      });

    if (existingAmenityByName) {
      return rejectRequest(409, {
        success: false,
        message:
          "An amenity with this name already exists",
        errors: {
          name: "Amenity name already exists",
        },
      });
    }

    const existingAmenityBySlug =
      await prisma.amenity.findUnique({
        where: {
          slug: cleanedSlug,
        },
      });

    if (existingAmenityBySlug) {
      return rejectRequest(409, {
        success: false,
        message:
          "An amenity with this slug already exists",
        errors: {
          slug: "Amenity slug already exists",
        },
      });
    }

    const amenity = await prisma.amenity.create({
      data: {
        name: cleanedName,
        slug: cleanedSlug,
        description:
          cleanOptionalString(description) ?? null,
        icon: cleanOptionalString(icon) ?? null,
        image: uploadedImagePath,
        group: selectedGroup,
        isActive:
          parsedIsActive.value ?? true,
        sortOrder: parsedSortOrder,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Amenity created successfully",
      data: amenity,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Remove Orphaned Uploaded File
    |--------------------------------------------------------------------------
    */

    deletePublicStorageFile(uploadedImagePath);

    console.error(
      "Create amenity error:",
      error
    );

    if (isPrismaError(error, "P2002")) {
      return res.status(409).json({
        success: false,
        message:
          "An amenity with the same value already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create amenity",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Update Amenity
|--------------------------------------------------------------------------
*/

export const updateAmenity = async (
  req: Request<
    { id: string },
    unknown,
    AmenityBody
  >,
  res: Response
): Promise<Response> => {
  const uploadedImagePath =
    getUploadedAmenityImagePath(req.file);

  /*
  |--------------------------------------------------------------------------
  | Remove Newly Uploaded File When Update Fails
  |--------------------------------------------------------------------------
  */

  const rejectRequest = (
    statusCode: number,
    responseBody: Record<string, unknown>
  ): Response => {
    deletePublicStorageFile(uploadedImagePath);

    return res.status(statusCode).json(responseBody);
  };

  try {
    const id = String(
      req.params.id || ""
    ).trim();

    if (!id) {
      return rejectRequest(422, {
        success: false,
        message: "Amenity ID is required",
      });
    }

    const existingAmenity =
      await prisma.amenity.findUnique({
        where: {
          id,
        },
      });

    if (!existingAmenity) {
      return rejectRequest(404, {
        success: false,
        message: "Amenity not found",
      });
    }

    const {
      name,
      slug,
      description,
      icon,
      group,
      isActive,
      sortOrder,
      removeImage,
    } = req.body;

    const updateData: Prisma.AmenityUpdateInput =
      {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return rejectRequest(422, {
          success: false,
          message:
            "Please enter a valid amenity name",
          errors: {
            name:
              "Amenity name cannot be empty",
          },
        });
      }

      const cleanedName = name.trim();

      const duplicateName =
        await prisma.amenity.findFirst({
          where: {
            id: {
              not: id,
            },
            name: {
              equals: cleanedName,
              mode: "insensitive",
            },
          },
        });

      if (duplicateName) {
        return rejectRequest(409, {
          success: false,
          message:
            "An amenity with this name already exists",
          errors: {
            name:
              "Amenity name already exists",
          },
        });
      }

      updateData.name = cleanedName;
    }

    if (slug !== undefined) {
      if (
        typeof slug !== "string" ||
        !slug.trim()
      ) {
        return rejectRequest(422, {
          success: false,
          message:
            "Please enter a valid amenity slug",
          errors: {
            slug:
              "Amenity slug cannot be empty",
          },
        });
      }

      const cleanedSlug = slugify(slug);

      if (!cleanedSlug) {
        return rejectRequest(422, {
          success: false,
          message:
            "Please enter a valid amenity slug",
          errors: {
            slug: "Amenity slug is invalid",
          },
        });
      }

      const duplicateSlug =
        await prisma.amenity.findFirst({
          where: {
            id: {
              not: id,
            },
            slug: cleanedSlug,
          },
        });

      if (duplicateSlug) {
        return rejectRequest(409, {
          success: false,
          message:
            "An amenity with this slug already exists",
          errors: {
            slug:
              "Amenity slug already exists",
          },
        });
      }

      updateData.slug = cleanedSlug;
    }

    if (description !== undefined) {
      if (!isNullableString(description)) {
        return rejectRequest(422, {
          success: false,
          message:
            "Description must be a valid text value",
        });
      }

      updateData.description =
        cleanOptionalString(description);
    }

    if (icon !== undefined) {
      if (!isNullableString(icon)) {
        return rejectRequest(422, {
          success: false,
          message:
            "Icon must be a valid text value",
        });
      }

      updateData.icon =
        cleanOptionalString(icon);
    }

    if (group !== undefined) {
      if (!isAmenityGroup(group)) {
        return rejectRequest(422, {
          success: false,
          message:
            "Please select a valid amenity group",
          errors: {
            group:
              "Selected amenity group is not valid",
          },
        });
      }

      updateData.group = group;
    }

    const parsedIsActive =
      parseBooleanField(isActive);

    if (!parsedIsActive.isValid) {
      return rejectRequest(422, {
        success: false,
        message:
          "Active status must be true or false",
        errors: {
          isActive:
            "Please select a valid status",
        },
      });
    }

    if (parsedIsActive.value !== undefined) {
      updateData.isActive =
        parsedIsActive.value;
    }

    if (sortOrder !== undefined) {
      const parsedSortOrder =
        Number(sortOrder);

      if (
        !Number.isInteger(parsedSortOrder) ||
        parsedSortOrder < 0
      ) {
        return rejectRequest(422, {
          success: false,
          message:
            "Sort order must be zero or greater",
          errors: {
            sortOrder:
              "Please enter a valid sort order",
          },
        });
      }

      updateData.sortOrder =
        parsedSortOrder;
    }

    const parsedRemoveImage =
      parseBooleanField(removeImage);

    if (!parsedRemoveImage.isValid) {
      return rejectRequest(422, {
        success: false,
        message:
          "Remove image value must be true or false",
        errors: {
          removeImage:
            "Please provide a valid remove image value",
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update Amenity Image
    |--------------------------------------------------------------------------
    |
    | A newly uploaded image takes priority over removeImage.
    |
    */

    if (uploadedImagePath) {
      updateData.image = uploadedImagePath;
    } else if (
      parsedRemoveImage.value === true
    ) {
      updateData.image = null;
    }

    if (
      Object.keys(updateData).length === 0
    ) {
      return rejectRequest(422, {
        success: false,
        message:
          "No valid fields were provided for update",
      });
    }

    const updatedAmenity =
      await prisma.amenity.update({
        where: {
          id,
        },
        data: updateData,
      });

    /*
    |--------------------------------------------------------------------------
    | Delete Previous Amenity Image
    |--------------------------------------------------------------------------
    */

    const imageWasChanged =
      Boolean(uploadedImagePath) ||
      parsedRemoveImage.value === true;

    if (
      imageWasChanged &&
      existingAmenity.image &&
      existingAmenity.image !==
        uploadedImagePath
    ) {
      deletePublicStorageFile(
        existingAmenity.image
      );
    }

    return res.status(200).json({
      success: true,
      message: "Amenity updated successfully",
      data: updatedAmenity,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Remove Newly Uploaded File When Database Update Fails
    |--------------------------------------------------------------------------
    */

    deletePublicStorageFile(uploadedImagePath);

    console.error(
      "Update amenity error:",
      error
    );

    if (isPrismaError(error, "P2002")) {
      return res.status(409).json({
        success: false,
        message:
          "An amenity with the same value already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update amenity",
    });
  }
};
/*
|--------------------------------------------------------------------------
| Admin: Update Amenity Status
|--------------------------------------------------------------------------
*/

export const updateAmenityStatus = async (
  req: Request<
    { id: string },
    unknown,
    { isActive?: unknown }
  >,
  res: Response
): Promise<Response> => {
  try {
    const id = String(
      req.params.id || ""
    ).trim();

    const { isActive } = req.body;

    if (!id) {
      return res.status(422).json({
        success: false,
        message: "Amenity ID is required",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(422).json({
        success: false,
        message:
          "Active status must be true or false",
        errors: {
          isActive: "Please select a valid status",
        },
      });
    }

    const amenity = await prisma.amenity.findUnique({
      where: {
        id,
      },
    });

    if (!amenity) {
      return res.status(404).json({
        success: false,
        message: "Amenity not found",
      });
    }

    const updatedAmenity =
      await prisma.amenity.update({
        where: {
          id,
        },
        data: {
          isActive,
        },
      });

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Amenity activated successfully"
        : "Amenity deactivated successfully",
      data: updatedAmenity,
    });
  } catch (error) {
    console.error(
      "Update amenity status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update amenity status",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Delete Amenity
|--------------------------------------------------------------------------
*/

export const deleteAmenity = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = String(
      req.params.id || ""
    ).trim();

    if (!id) {
      return res.status(422).json({
        success: false,
        message: "Amenity ID is required",
      });
    }

    const amenity =
      await prisma.amenity.findUnique({
        where: {
          id,
        },
      });

    if (!amenity) {
      return res.status(404).json({
        success: false,
        message: "Amenity not found",
      });
    }

    await prisma.amenity.delete({
      where: {
        id,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Delete Associated Amenity Image
    |--------------------------------------------------------------------------
    */

    deletePublicStorageFile(amenity.image);

    return res.status(200).json({
      success: true,
      message: "Amenity deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete amenity error:",
      error
    );

    if (isPrismaError(error, "P2003")) {
      return res.status(409).json({
        success: false,
        message:
          "This amenity is being used by a property and cannot be deleted",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to delete amenity",
    });
  }
};