import type { Request, Response } from "express";
import type { Prisma } from "../generated/prisma/client.js";

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

interface PropertyCategoryBody {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  icon?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
  removeImage?: unknown;
}

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const isNullableString = (value: unknown): boolean => {
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
| JSON requests provide real boolean values.
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
| Build Uploaded Category Image Path
|--------------------------------------------------------------------------
*/

const getUploadedCategoryImagePath = (
  file?: Express.Multer.File
): string | null => {
  if (!file) {
    return null;
  }

  return getPublicStoragePath(
    "property-categories",
    file.filename
  );
};


/*
|--------------------------------------------------------------------------
| Admin: Get all property categories
|--------------------------------------------------------------------------
*/

export const getPropertyCategories = async (
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

    const where: Prisma.PropertyCategoryWhereInput = {};

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
      ];
    }

    if (status === "active") {
      where.isActive = true;
    }

    if (status === "inactive") {
      where.isActive = false;
    }

    const categories =
      await prisma.propertyCategory.findMany({
        where,
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    return res.status(200).json({
      success: true,
      message: "Property categories fetched successfully",
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    console.error(
      "Get property categories error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch property categories",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Get active property categories
|--------------------------------------------------------------------------
*/

export const getActivePropertyCategories = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const categories =
      await prisma.propertyCategory.findMany({
        where: {
          isActive: true,
        },
        orderBy: [
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
        },
      });

    return res.status(200).json({
      success: true,
      message: "Active property categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error(
      "Get active property categories error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch property categories",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Get single category
|--------------------------------------------------------------------------
*/

export const getPropertyCategoryById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(422).json({
        success: false,
        message: "Property category ID is required",
      });
    }

    const category =
      await prisma.propertyCategory.findUnique({
        where: {
          id,
        },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Property category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property category fetched successfully",
      data: category,
    });
  } catch (error) {
    console.error(
      "Get property category error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch property category",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Create category
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Admin: Create Property Category
|--------------------------------------------------------------------------
*/

export const createPropertyCategory = async (
  req: Request<
    Record<string, never>,
    unknown,
    PropertyCategoryBody
  >,
  res: Response
): Promise<Response> => {
  const uploadedImagePath =
    getUploadedCategoryImagePath(req.file);

  /*
  |--------------------------------------------------------------------------
  | Remove Uploaded File When Request Fails
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
      isActive,
      sortOrder,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return rejectRequest(422, {
        success: false,
        message: "Category name is required",
        errors: {
          name: "Please enter a valid category name",
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

    const parsedIsActive =
      parseBooleanField(isActive);

    if (!parsedIsActive.isValid) {
      return rejectRequest(422, {
        success: false,
        message: "Active status must be true or false",
        errors: {
          isActive: "Please select a valid status",
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
          "Sort order must be a positive whole number",
        errors: {
          sortOrder:
            "Sort order must be zero or greater",
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
        message: "Unable to generate category slug",
        errors: {
          slug:
            "Please enter a valid category name or slug",
        },
      });
    }

    const existingCategoryByName =
      await prisma.propertyCategory.findFirst({
        where: {
          name: {
            equals: cleanedName,
            mode: "insensitive",
          },
        },
      });

    if (existingCategoryByName) {
      return rejectRequest(409, {
        success: false,
        message:
          "A property category with this name already exists",
        errors: {
          name: "Category name already exists",
        },
      });
    }

    const existingCategoryBySlug =
      await prisma.propertyCategory.findUnique({
        where: {
          slug: cleanedSlug,
        },
      });

    if (existingCategoryBySlug) {
      return rejectRequest(409, {
        success: false,
        message:
          "A property category with this slug already exists",
        errors: {
          slug: "Category slug already exists",
        },
      });
    }

    const category =
      await prisma.propertyCategory.create({
        data: {
          name: cleanedName,
          slug: cleanedSlug,
          description:
            cleanOptionalString(description) ?? null,
          icon: cleanOptionalString(icon) ?? null,
          image: uploadedImagePath,
          isActive:
            parsedIsActive.value ?? true,
          sortOrder: parsedSortOrder,
        },
      });

    return res.status(201).json({
      success: true,
      message:
        "Property category created successfully",
      data: category,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Remove Orphaned Uploaded File
    |--------------------------------------------------------------------------
    */

    deletePublicStorageFile(uploadedImagePath);

    console.error(
      "Create property category error:",
      error
    );

    if (isPrismaError(error, "P2002")) {
      return res.status(409).json({
        success: false,
        message:
          "A property category with the same value already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create property category",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Update Property Category
|--------------------------------------------------------------------------
*/

export const updatePropertyCategory = async (
  req: Request<
    { id: string },
    unknown,
    PropertyCategoryBody
  >,
  res: Response
): Promise<Response> => {
  const uploadedImagePath =
    getUploadedCategoryImagePath(req.file);

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
        message:
          "Property category ID is required",
      });
    }

    const existingCategory =
      await prisma.propertyCategory.findUnique({
        where: {
          id,
        },
      });

    if (!existingCategory) {
      return rejectRequest(404, {
        success: false,
        message: "Property category not found",
      });
    }

    const {
      name,
      slug,
      description,
      icon,
      isActive,
      sortOrder,
      removeImage,
    } = req.body;

    const updateData: Prisma.PropertyCategoryUpdateInput =
      {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return rejectRequest(422, {
          success: false,
          message:
            "Please enter a valid category name",
          errors: {
            name:
              "Category name cannot be empty",
          },
        });
      }

      const cleanedName = name.trim();

      const duplicateName =
        await prisma.propertyCategory.findFirst({
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
            "A property category with this name already exists",
          errors: {
            name: "Category name already exists",
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
            "Please enter a valid category slug",
          errors: {
            slug:
              "Category slug cannot be empty",
          },
        });
      }

      const cleanedSlug = slugify(slug);

      if (!cleanedSlug) {
        return rejectRequest(422, {
          success: false,
          message:
            "Please enter a valid category slug",
          errors: {
            slug: "Category slug is invalid",
          },
        });
      }

      const duplicateSlug =
        await prisma.propertyCategory.findFirst({
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
            "A property category with this slug already exists",
          errors: {
            slug: "Category slug already exists",
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

    const parsedIsActive =
      parseBooleanField(isActive);

    if (!parsedIsActive.isValid) {
      return rejectRequest(422, {
        success: false,
        message:
          "Active status must be true or false",
        errors: {
          isActive: "Please select a valid status",
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
    | Update Category Image
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

    const updatedCategory =
      await prisma.propertyCategory.update({
        where: {
          id,
        },
        data: updateData,
      });

    /*
    |--------------------------------------------------------------------------
    | Delete Previous Category Image
    |--------------------------------------------------------------------------
    */

    const imageWasChanged =
      Boolean(uploadedImagePath) ||
      parsedRemoveImage.value === true;

    if (
      imageWasChanged &&
      existingCategory.image &&
      existingCategory.image !==
        uploadedImagePath
    ) {
      deletePublicStorageFile(
        existingCategory.image
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Property category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Remove Newly Uploaded File When Database Update Fails
    |--------------------------------------------------------------------------
    */

    deletePublicStorageFile(uploadedImagePath);

    console.error(
      "Update property category error:",
      error
    );

    if (isPrismaError(error, "P2002")) {
      return res.status(409).json({
        success: false,
        message:
          "A property category with the same value already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update property category",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Change active status
|--------------------------------------------------------------------------
*/

export const updatePropertyCategoryStatus = async (
  req: Request<
    { id: string },
    unknown,
    { isActive?: unknown }
  >,
  res: Response
): Promise<Response> => {
  try {
    const id = String(req.params.id || "").trim();
    const { isActive } = req.body;

    if (!id) {
      return res.status(422).json({
        success: false,
        message: "Property category ID is required",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(422).json({
        success: false,
        message: "Active status must be true or false",
        errors: {
          isActive: "Please select a valid status",
        },
      });
    }

    const category =
      await prisma.propertyCategory.findUnique({
        where: {
          id,
        },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Property category not found",
      });
    }

    const updatedCategory =
      await prisma.propertyCategory.update({
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
        ? "Property category activated successfully"
        : "Property category deactivated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error(
      "Update property category status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update property category status",
    });
  }
};



/*
|--------------------------------------------------------------------------
| Admin: Delete Property Category
|--------------------------------------------------------------------------
*/

export const deletePropertyCategory = async (
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
        message:
          "Property category ID is required",
      });
    }

    const category =
      await prisma.propertyCategory.findUnique({
        where: {
          id,
        },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Property category not found",
      });
    }

    await prisma.propertyCategory.delete({
      where: {
        id,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Delete Associated Category Image
    |--------------------------------------------------------------------------
    */

    deletePublicStorageFile(category.image);

    return res.status(200).json({
      success: true,
      message:
        "Property category deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete property category error:",
      error
    );

    if (isPrismaError(error, "P2003")) {
      return res.status(409).json({
        success: false,
        message:
          "This category is being used by a property and cannot be deleted",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete property category",
    });
  }
};