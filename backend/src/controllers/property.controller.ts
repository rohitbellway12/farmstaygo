import type { Response } from "express";

import {
  PropertyBookingType,
  PropertyStatus,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

/*
|--------------------------------------------------------------------------
| Request Body Types
|--------------------------------------------------------------------------
*/

interface PropertyBasicInfoBody {
  categoryId?: unknown;
  title?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  bookingType?: unknown;
  maxGuests?: unknown;
  bedrooms?: unknown;
  bathrooms?: unknown;
  beds?: unknown;
  totalRooms?: unknown;
}

/*
|--------------------------------------------------------------------------
| Property Location Request Body
|--------------------------------------------------------------------------
*/

interface PropertyLocationBody {
  addressLine1?: unknown;
  addressLine2?: unknown;
  landmark?: unknown;
  locality?: unknown;
  city?: unknown;
  state?: unknown;
  country?: unknown;
  postalCode?: unknown;
  latitude?: unknown;
  longitude?: unknown;
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

const findActiveServiceCity = async (
  city: string,
  state: string,
  country: string
) => {
  return prisma.serviceCity.findFirst({
    where: {
      isActive: true,
      name: {
        equals: city,
        mode: "insensitive",
      },
      state: {
        equals: state,
        mode: "insensitive",
      },
      country: {
        equals: country,
        mode: "insensitive",
      },
    },
  });
};

const isPropertyBookingType = (
  value: unknown
): value is PropertyBookingType => {
  return (
    typeof value === "string" &&
    Object.values(PropertyBookingType).includes(
      value as PropertyBookingType
    )
  );
};

const isPropertyStatus = (
  value: unknown
): value is PropertyStatus => {
  return (
    typeof value === "string" &&
    Object.values(PropertyStatus).includes(
      value as PropertyStatus
    )
  );
};

const parseOptionalInteger = (
  value: unknown
): {
  isValid: boolean;
  value?: number | null;
} => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      isValid: true,
      value: null,
    };
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0
  ) {
    return {
      isValid: false,
    };
  }

  return {
    isValid: true,
    value: parsedValue,
  };
};

/*
|--------------------------------------------------------------------------
| Parse Optional Coordinate
|--------------------------------------------------------------------------
*/

const parseOptionalCoordinate = (
  value: unknown,
  minimum: number,
  maximum: number
): {
  isValid: boolean;
  value: number | null;
} => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      isValid: true,
      value: null,
    };
  }

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    return {
      isValid: false,
      value: null,
    };
  }

  return {
    isValid: true,
    value: parsedValue,
  };
};

/*
|--------------------------------------------------------------------------
| Resolve Vendor From Authenticated User
|--------------------------------------------------------------------------
*/

const getVendorByUserId = async (
  userId: number
) => {
  return prisma.vendor.findUnique({
    where: {
      userId,
    },
  });
};

/*
|--------------------------------------------------------------------------
| Generate Unique Property Slug
|--------------------------------------------------------------------------
*/

const generateUniquePropertySlug = async (
  title: string,
  excludePropertyId?: string
): Promise<string> => {
  const baseSlug = slugify(title) || "property";

  const existingProperty =
    await prisma.property.findFirst({
      where: {
        slug: baseSlug,

        ...(excludePropertyId
          ? {
              id: {
                not: excludePropertyId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

  if (!existingProperty) {
    return baseSlug;
  }

  const uniqueSuffix = `${Date.now()
    .toString()
    .slice(-7)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  return `${baseSlug}-${uniqueSuffix}`;
};

/*
|--------------------------------------------------------------------------
| Validate Property Capacity Fields
|--------------------------------------------------------------------------
*/

const validateCapacityFields = (
  body: PropertyBasicInfoBody
):
  | {
      success: true;
      values: {
        maxGuests: number | null;
        bedrooms: number | null;
        bathrooms: number | null;
        beds: number | null;
        totalRooms: number | null;
      };
    }
  | {
      success: false;
      errors: Record<string, string>;
    } => {
  const parsedFields = {
    maxGuests: parseOptionalInteger(
      body.maxGuests
    ),
    bedrooms: parseOptionalInteger(
      body.bedrooms
    ),
    bathrooms: parseOptionalInteger(
      body.bathrooms
    ),
    beds: parseOptionalInteger(body.beds),
    totalRooms: parseOptionalInteger(
      body.totalRooms
    ),
  };

  const errors: Record<string, string> = {};

  Object.entries(parsedFields).forEach(
    ([fieldName, result]) => {
      if (!result.isValid) {
        errors[fieldName] =
          "Please enter a valid whole number.";
      }
    }
  );

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    values: {
      maxGuests:
        parsedFields.maxGuests.value ?? null,
      bedrooms:
        parsedFields.bedrooms.value ?? null,
      bathrooms:
        parsedFields.bathrooms.value ?? null,
      beds: parsedFields.beds.value ?? null,
      totalRooms:
        parsedFields.totalRooms.value ?? null,
    },
  };
};

/*
|--------------------------------------------------------------------------
| Vendor: Get Property List
|--------------------------------------------------------------------------
*/

export const getVendorProperties = async (
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

    const vendor = await getVendorByUserId(
      req.user.id
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor profile was not found for this account",
      });
    }

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status
            .trim()
            .toUpperCase()
        : "";

    const where: Prisma.PropertyWhereInput = {
      vendorId: vendor.id,
    };

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          city: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          category: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    if (
      status &&
      status !== "ALL" &&
      isPropertyStatus(status)
    ) {
      where.status = status;
    }

    const properties =
      await prisma.property.findMany({
        where,

        orderBy: {
          updatedAt: "desc",
        },

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
            },
          },

          images: {
            where: {
              isCover: true,
            },

            orderBy: {
              sortOrder: "asc",
            },

            take: 1,
          },

          _count: {
            select: {
              images: true,
              amenities: true,
              roomTypes: true,
            },
          },

          roomTypes: {
            orderBy: [
              {
                sortOrder: "asc",
              },
              {
                createdAt: "asc",
              },
            ],
            select: {
              id: true,
              name: true,
              totalRooms: true,
              isActive: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Vendor properties fetched successfully",
      data: properties,
      total: properties.length,
    });
  } catch (error) {
    console.error(
      "Get vendor properties error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch vendor properties",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Get Single Property
|--------------------------------------------------------------------------
*/

export const getVendorPropertyById = async (
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

    if (!propertyId) {
      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const vendor = await getVendorByUserId(
      req.user.id
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor profile was not found for this account",
      });
    }

    const property =
      await prisma.property.findFirst({
        where: {
          id: propertyId,
          vendorId: vendor.id,
        },

        include: {
          category: true,

          images: {
            orderBy: {
              sortOrder: "asc",
            },
          },

          amenities: {
            include: {
              amenity: true,
            },

            orderBy: {
              amenity: {
                sortOrder: "asc",
              },
            },
          },

          ruleAssignments: {
            include: {
              rule: true,
            },

            orderBy: {
              rule: {
                sortOrder: "asc",
              },
            },
          },
        },
      });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Property fetched successfully",
      data: property,
    });
  } catch (error) {
    console.error(
      "Get vendor property error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch property",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Create Property Draft
|--------------------------------------------------------------------------
*/

export const createPropertyDraft = async (
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

    const body =
      req.body as PropertyBasicInfoBody;

    const {
      categoryId,
      title,
      shortDescription,
      description,
      bookingType,
    } = body;

    const errors: Record<string, string> = {};

    if (
      typeof categoryId !== "string" ||
      !categoryId.trim()
    ) {
      errors.categoryId =
        "Please select a property category.";
    }

    if (
      typeof title !== "string" ||
      title.trim().length < 3
    ) {
      errors.title =
        "Property title must contain at least 3 characters.";
    }

    if (
      !isPropertyBookingType(bookingType)
    ) {
      errors.bookingType =
        "Please select a valid booking type.";
    }

    const capacityValidation =
      validateCapacityFields(body);

    if (!capacityValidation.success) {
      Object.assign(
        errors,
        capacityValidation.errors
      );
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message:
          "Please correct the property information",
        errors,
      });
    }

    const vendor = await getVendorByUserId(
      req.user.id
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor profile was not found for this account",
      });
    }

    const cleanedCategoryId = (
      categoryId as string
    ).trim();

    const category =
      await prisma.propertyCategory.findFirst({
        where: {
          id: cleanedCategoryId,
          isActive: true,
        },
      });

    if (!category) {
      return res.status(422).json({
        success: false,
        message:
          "Selected property category is unavailable",
        errors: {
          categoryId:
            "Please select an active property category.",
        },
      });
    }

    const cleanedTitle = (
      title as string
    ).trim();

    const slug =
      await generateUniquePropertySlug(
        cleanedTitle
      );

    const property =
      await prisma.property.create({
        data: {
          vendorId: vendor.id,
          categoryId: category.id,

          title: cleanedTitle,
          slug,

          shortDescription:
            cleanOptionalString(
              shortDescription
            ) ?? null,

          description:
            cleanOptionalString(
              description
            ) ?? null,

          bookingType:
            bookingType as PropertyBookingType,

          status: PropertyStatus.DRAFT,

          maxGuests:
            capacityValidation.success
              ? capacityValidation.values
                  .maxGuests
              : null,

          bedrooms:
            capacityValidation.success
              ? capacityValidation.values
                  .bedrooms
              : null,

          bathrooms:
            capacityValidation.success
              ? capacityValidation.values
                  .bathrooms
              : null,

          beds:
            capacityValidation.success
              ? capacityValidation.values.beds
              : null,

          totalRooms:
            capacityValidation.success
              ? capacityValidation.values
                  .totalRooms
              : null,
        },

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
            },
          },
        },
      });

    return res.status(201).json({
      success: true,
      message:
        "Property draft created successfully",
      data: property,
    });
  } catch (error) {
    console.error(
      "Create property draft error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create property draft",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Update Property Basic Information
|--------------------------------------------------------------------------
*/

export const updatePropertyBasicInfo = async (
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

    if (!propertyId) {
      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const vendor = await getVendorByUserId(
      req.user.id
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor profile was not found for this account",
      });
    }

    const existingProperty =
      await prisma.property.findFirst({
        where: {
          id: propertyId,
          vendorId: vendor.id,
        },
      });

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (
  existingProperty.status ===
    PropertyStatus.APPROVED ||
  existingProperty.status ===
    PropertyStatus.SUSPENDED
){
      return res.status(409).json({
        success: false,
        message:
          "This property cannot currently be edited",
      });
    }

    const body =
      req.body as PropertyBasicInfoBody;

    const {
      categoryId,
      title,
      shortDescription,
      description,
      bookingType,
    } = body;

    const updateData: Prisma.PropertyUpdateInput =
      {};

    const errors: Record<string, string> = {};

    if (categoryId !== undefined) {
      if (
        typeof categoryId !== "string" ||
        !categoryId.trim()
      ) {
        errors.categoryId =
          "Please select a valid property category.";
      } else {
        const category =
          await prisma.propertyCategory.findFirst({
            where: {
              id: categoryId.trim(),
              isActive: true,
            },
          });

        if (!category) {
          errors.categoryId =
            "Selected property category is unavailable.";
        } else {
          updateData.category = {
            connect: {
              id: category.id,
            },
          };
        }
      }
    }

    if (title !== undefined) {
      if (
        typeof title !== "string" ||
        title.trim().length < 3
      ) {
        errors.title =
          "Property title must contain at least 3 characters.";
      } else {
        const cleanedTitle = title.trim();

        updateData.title = cleanedTitle;

        if (
          cleanedTitle !==
          existingProperty.title
        ) {
          updateData.slug =
            await generateUniquePropertySlug(
              cleanedTitle,
              existingProperty.id
            );
        }
      }
    }

    if (bookingType !== undefined) {
      if (
        !isPropertyBookingType(bookingType)
      ) {
        errors.bookingType =
          "Please select a valid booking type.";
      } else {
        updateData.bookingType =
          bookingType;
      }
    }

    if (shortDescription !== undefined) {
      updateData.shortDescription =
        cleanOptionalString(
          shortDescription
        );
    }

    if (description !== undefined) {
      updateData.description =
        cleanOptionalString(description);
    }

    const capacityValidation =
      validateCapacityFields(body);

    if (!capacityValidation.success) {
      Object.assign(
        errors,
        capacityValidation.errors
      );
    } else {
      if (body.maxGuests !== undefined) {
        updateData.maxGuests =
          capacityValidation.values.maxGuests;
      }

      if (body.bedrooms !== undefined) {
        updateData.bedrooms =
          capacityValidation.values.bedrooms;
      }

      if (body.bathrooms !== undefined) {
        updateData.bathrooms =
          capacityValidation.values.bathrooms;
      }

      if (body.beds !== undefined) {
        updateData.beds =
          capacityValidation.values.beds;
      }

      if (body.totalRooms !== undefined) {
        updateData.totalRooms =
          capacityValidation.values
            .totalRooms;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message:
          "Please correct the property information",
        errors,
      });
    }

    if (
      Object.keys(updateData).length === 0
    ) {
      return res.status(422).json({
        success: false,
        message:
          "No valid property fields were provided",
      });
    }

    const updatedProperty =
      await prisma.property.update({
        where: {
          id: propertyId,
        },

        data: updateData,

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Property basic information updated successfully",
      data: updatedProperty,
    });
  } catch (error) {
    console.error(
      "Update property basic information error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update property information",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Update Property Location
|--------------------------------------------------------------------------
*/

export const updatePropertyLocation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Verify Authenticated User
    |--------------------------------------------------------------------------
    */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const propertyId = String(
      req.params.id || ""
    ).trim();

    if (!propertyId) {
      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve Vendor Profile
    |--------------------------------------------------------------------------
    */

    const vendor = await getVendorByUserId(
      req.user.id
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor profile was not found for this account",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Property Ownership
    |--------------------------------------------------------------------------
    */

    const existingProperty =
      await prisma.property.findFirst({
        where: {
          id: propertyId,
          vendorId: vendor.id,
        },
      });

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Editing Locked Properties
    |--------------------------------------------------------------------------
    */

    if (
  existingProperty.status ===
    PropertyStatus.APPROVED ||
  existingProperty.status ===
    PropertyStatus.SUSPENDED
){
      return res.status(409).json({
        success: false,
        message:
          "This property cannot currently be edited",
      });
    }

    const body =
      req.body as PropertyLocationBody;

    const {
      addressLine1,
      addressLine2,
      landmark,
      locality,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
    } = body;

    const errors: Record<string, string> = {};

    /*
    |--------------------------------------------------------------------------
    | Validate Required Address Fields
    |--------------------------------------------------------------------------
    */

    if (
      typeof addressLine1 !== "string" ||
      addressLine1.trim().length < 3
    ) {
      errors.addressLine1 =
        "Please enter a valid property address.";
    }

    if (
      typeof city !== "string" ||
      city.trim().length < 2
    ) {
      errors.city =
        "Please enter a valid city.";
    }

    if (
      typeof state !== "string" ||
      state.trim().length < 2
    ) {
      errors.state =
        "Please enter a valid state.";
    }

    if (
      typeof country !== "string" ||
      country.trim().length < 2
    ) {
      errors.country =
        "Please enter a valid country.";
    }

    if (
      typeof postalCode !== "string" ||
      postalCode.trim().length < 3
    ) {
      errors.postalCode =
        "Please enter a valid postal code.";
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Optional Address Fields
    |--------------------------------------------------------------------------
    */

    const optionalTextFields: Array<{
      fieldName:
        | "addressLine2"
        | "landmark"
        | "locality";
      value: unknown;
    }> = [
      {
        fieldName: "addressLine2",
        value: addressLine2,
      },
      {
        fieldName: "landmark",
        value: landmark,
      },
      {
        fieldName: "locality",
        value: locality,
      },
    ];

    optionalTextFields.forEach(
      ({ fieldName, value }) => {
        if (
          value !== undefined &&
          value !== null &&
          typeof value !== "string"
        ) {
          errors[fieldName] =
            "Please enter a valid text value.";
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Validate Coordinates
    |--------------------------------------------------------------------------
    */

    const parsedLatitude =
      parseOptionalCoordinate(
        latitude,
        -90,
        90
      );

    const parsedLongitude =
      parseOptionalCoordinate(
        longitude,
        -180,
        180
      );

    if (!parsedLatitude.isValid) {
      errors.latitude =
        "Latitude must be between -90 and 90.";
    }

    if (!parsedLongitude.isValid) {
      errors.longitude =
        "Longitude must be between -180 and 180.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message:
          "Please correct the property location information",
        errors,
      });
    }

    const serviceCity =
      await findActiveServiceCity(
        (city as string).trim(),
        (state as string).trim(),
        (country as string).trim()
      );

    if (!serviceCity) {
      return res.status(422).json({
        success: false,
        message:
          "Please select a city currently enabled by admin.",
        errors: {
          city:
            "This city is not enabled for property listings.",
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update Property Location
    |--------------------------------------------------------------------------
    */

    const updatedProperty =
      await prisma.property.update({
        where: {
          id: propertyId,
        },

        data: {
          addressLine1: (
            addressLine1 as string
          ).trim(),

          addressLine2:
            cleanOptionalString(
              addressLine2
            ) ?? null,

          landmark:
            cleanOptionalString(
              landmark
            ) ?? null,

          locality:
            cleanOptionalString(
              locality
            ) ?? null,

          city: serviceCity.name,

          state: serviceCity.state,

          country: serviceCity.country,

          postalCode: (
            postalCode as string
          ).trim(),

          latitude:
            parsedLatitude.value,

          longitude:
            parsedLongitude.value,
        },

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Property location saved successfully",
      data: updatedProperty,
    });
  } catch (error) {
    console.error(
      "Update property location error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update property location",
    });
  }
};

export const deleteProperty = async (
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

    const propertyId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    if (!propertyId) {
      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const property =
      await prisma.property.findFirst({
        where: {
          id: propertyId,
          vendor: {
            userId: req.user.id,
          },
        },
        select: {
          id: true,
          status: true,
          title: true,
        },
      });

    if (!property) {
      return res.status(404).json({
        success: false,
        message:
          "Property not found or you do not have permission to delete it",
      });
    }

    const deletableStatuses: PropertyStatus[] =
      [
        "DRAFT",
        "PENDING_APPROVAL",
        "INACTIVE",
      ] as PropertyStatus[];

    if (
      !deletableStatuses.includes(
        property.status
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          `This property cannot be deleted because its current status is "${property.status}". Only draft, pending approval, or inactive properties can be removed.`,
      });
    }

    await prisma.property.delete({
      where: { id: propertyId },
    });

    return res.status(200).json({
      success: true,
      message:
        `"${property.title}" has been deleted successfully.`,
    });
  } catch (error) {
    console.error(
      "Delete property error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete property. Please try again.",
    });
  }
};
