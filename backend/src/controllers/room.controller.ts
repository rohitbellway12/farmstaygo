import type { Response } from "express";

import {
  PropertyBookingType,
  PropertyStatus,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import {
  deletePublicStorageFile,
} from "../config/upload.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

/*
|--------------------------------------------------------------------------
| Request Types
|--------------------------------------------------------------------------
*/

interface RoomTypeBody {
  name?: unknown;
  slug?: unknown;
  description?: unknown;

  totalRooms?: unknown;

  maxAdults?: unknown;
  maxChildren?: unknown;
  maxGuests?: unknown;
  beds?: unknown;
  bathrooms?: unknown;

  basePrice?: unknown;
  weekendPrice?: unknown;

  isActive?: unknown;
  sortOrder?: unknown;

  amenityIds?: unknown;
}

interface RoomStatusBody {
  isActive?: unknown;
}

interface RoomAmenitiesBody {
  amenityIds?: unknown;
}

interface RoomTypeDefaults {
  name: string;
  slug: string;
  description: string | null;

  totalRooms: number;

  maxAdults: number;
  maxChildren: number;
  maxGuests: number;
  beds: number;
  bathrooms: number;

  basePrice: string;
  weekendPrice: string | null;

  isActive: boolean;
  sortOrder: number;
}

interface ValidatedRoomTypeValues {
  name: string;
  slugSource: string;
  description: string | null;

  totalRooms: number;

  maxAdults: number;
  maxChildren: number;
  maxGuests: number;
  beds: number;
  bathrooms: number;

  basePrice: string;
  weekendPrice: string | null;

  isActive: boolean;
  sortOrder: number;

  amenityIds?: string[];
}

/*
|--------------------------------------------------------------------------
| Include Definitions
|--------------------------------------------------------------------------
*/

const roomTypeDetailsInclude: Prisma.RoomTypeInclude = {
  images: {
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

  _count: {
    select: {
      images: true,
      amenities: true,
    },
  },
};

/*
|--------------------------------------------------------------------------
| Basic Helpers
|--------------------------------------------------------------------------
*/

const slugify = (
  value: string
): string => {
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

/*
|--------------------------------------------------------------------------
| Parse Integer
|--------------------------------------------------------------------------
*/

const parseInteger = (
  value: unknown,
  minimum: number
): {
  isValid: boolean;
  value?: number;
} => {
  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < minimum
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
| Parse Money
|--------------------------------------------------------------------------
*/

const parseMoney = (
  value: unknown,
  optional = false
): {
  isValid: boolean;
  value?: string | null;
} => {
  if (
    optional &&
    (
      value === undefined ||
      value === null ||
      value === ""
    )
  ) {
    return {
      isValid: true,
      value: null,
    };
  }

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue <= 0
  ) {
    return {
      isValid: false,
    };
  }

  return {
    isValid: true,
    value: parsedValue.toFixed(2),
  };
};

/*
|--------------------------------------------------------------------------
| Parse Boolean
|--------------------------------------------------------------------------
*/

const parseBoolean = (
  value: unknown,
  fallback: boolean
): {
  isValid: boolean;
  value: boolean;
} => {
  if (value === undefined) {
    return {
      isValid: true,
      value: fallback,
    };
  }

  if (
    value === true ||
    value === "true" ||
    value === "1"
  ) {
    return {
      isValid: true,
      value: true,
    };
  }

  if (
    value === false ||
    value === "false" ||
    value === "0"
  ) {
    return {
      isValid: true,
      value: false,
    };
  }

  return {
    isValid: false,
    value: fallback,
  };
};

/*
|--------------------------------------------------------------------------
| Parse Amenity IDs
|--------------------------------------------------------------------------
*/

const parseAmenityIds = (
  value: unknown
): {
  isValid: boolean;
  value?: string[];
  message?: string;
} => {
  if (value === undefined) {
    return {
      isValid: true,
      value: undefined,
    };
  }

  if (!Array.isArray(value)) {
    return {
      isValid: false,
      message:
        "Amenities must be provided as an array.",
    };
  }

  const amenityIds = value
    .filter(
      (amenityId): amenityId is string =>
        typeof amenityId === "string"
    )
    .map((amenityId) =>
      amenityId.trim()
    )
    .filter(Boolean);

  if (
    amenityIds.length !== value.length
  ) {
    return {
      isValid: false,
      message:
        "Please provide valid amenity IDs.",
    };
  }

  const uniqueAmenityIds = [
    ...new Set(amenityIds),
  ];

  if (
    uniqueAmenityIds.length !==
    amenityIds.length
  ) {
    return {
      isValid: false,
      message:
        "Duplicate amenities are not allowed.",
    };
  }

  return {
    isValid: true,
    value: uniqueAmenityIds,
  };
};

/*
|--------------------------------------------------------------------------
| Resolve Vendor-Owned Property
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

    select: {
      id: true,
      title: true,
      bookingType: true,
      status: true,
      totalRooms: true,

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
    },
  });
};

/*
|--------------------------------------------------------------------------
| Room Booking Support
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
| Room inventory is operational data.
|
| Allowed:
| DRAFT
| REJECTED
| APPROVED
| INACTIVE
|
| Blocked:
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
| Generate Unique Room Slug
|--------------------------------------------------------------------------
*/

const generateUniqueRoomSlug = async (
  propertyId: string,
  source: string,
  excludeRoomTypeId?: string
): Promise<string> => {
  const baseSlug =
    slugify(source) || "room";

  let candidateSlug = baseSlug;
  let suffix = 2;

  while (true) {
    const existingRoom =
      await prisma.roomType.findFirst({
        where: {
          propertyId,
          slug: candidateSlug,

          ...(excludeRoomTypeId
            ? {
                id: {
                  not: excludeRoomTypeId,
                },
              }
            : {}),
        },

        select: {
          id: true,
        },
      });

    if (!existingRoom) {
      return candidateSlug;
    }

    candidateSlug =
      `${baseSlug}-${suffix}`;

    suffix += 1;
  }
};

/*
|--------------------------------------------------------------------------
| Validate Active Amenities
|--------------------------------------------------------------------------
*/

const activeAmenitiesExist = async (
  amenityIds: string[]
): Promise<boolean> => {
  if (amenityIds.length === 0) {
    return true;
  }

  const activeAmenities =
    await prisma.amenity.findMany({
      where: {
        id: {
          in: amenityIds,
        },

        isActive: true,
      },

      select: {
        id: true,
      },
    });

  return (
    activeAmenities.length ===
    amenityIds.length
  );
};

/*
|--------------------------------------------------------------------------
| Synchronize Property Total Rooms
|--------------------------------------------------------------------------
|
| ROOM_WISE and BOTH properties use the total quantity of active Room Types.
|
*/

const syncPropertyTotalRooms = async (
  transaction: Prisma.TransactionClient,
  propertyId: string
): Promise<void> => {
  const roomInventory =
    await transaction.roomType.aggregate({
      where: {
        propertyId,
        isActive: true,
      },

      _sum: {
        totalRooms: true,
      },
    });

  await transaction.property.update({
    where: {
      id: propertyId,
    },

    data: {
      totalRooms:
        roomInventory._sum.totalRooms ??
        0,
    },
  });
};

/*
|--------------------------------------------------------------------------
| Replace Room Amenities
|--------------------------------------------------------------------------
*/

const replaceRoomAmenities = async (
  transaction: Prisma.TransactionClient,
  roomTypeId: string,
  amenityIds: string[]
): Promise<void> => {
  await transaction.roomAmenity.deleteMany({
    where: {
      roomTypeId,
    },
  });

  if (amenityIds.length > 0) {
    await transaction.roomAmenity.createMany({
      data: amenityIds.map(
        (amenityId) => ({
          roomTypeId,
          amenityId,
        })
      ),
    });
  }
};

/*
|--------------------------------------------------------------------------
| Validate Room Type Body
|--------------------------------------------------------------------------
*/

const validateRoomTypeBody = (
  body: RoomTypeBody,
  defaults?: RoomTypeDefaults
):
  | {
      success: true;
      values: ValidatedRoomTypeValues;
    }
  | {
      success: false;
      errors: Record<string, string>;
    } => {
  const errors: Record<string, string> =
    {};

  /*
  |--------------------------------------------------------------------------
  | Resolve Values With Update Defaults
  |--------------------------------------------------------------------------
  */

  const rawName =
    body.name !== undefined
      ? body.name
      : defaults?.name;

  const rawDescription =
    body.description !== undefined
      ? body.description
      : defaults?.description;

  const rawTotalRooms =
    body.totalRooms !== undefined
      ? body.totalRooms
      : defaults?.totalRooms;

  const rawMaxAdults =
    body.maxAdults !== undefined
      ? body.maxAdults
      : defaults?.maxAdults;

  const rawMaxChildren =
    body.maxChildren !== undefined
      ? body.maxChildren
      : defaults?.maxChildren;

  const rawMaxGuests =
    body.maxGuests !== undefined
      ? body.maxGuests
      : defaults?.maxGuests;

  const rawBeds =
    body.beds !== undefined
      ? body.beds
      : defaults?.beds;

  const rawBathrooms =
    body.bathrooms !== undefined
      ? body.bathrooms
      : defaults?.bathrooms;

  const rawBasePrice =
    body.basePrice !== undefined
      ? body.basePrice
      : defaults?.basePrice;

  const rawWeekendPrice =
    body.weekendPrice !== undefined
      ? body.weekendPrice
      : defaults?.weekendPrice;

  const rawSortOrder =
    body.sortOrder !== undefined
      ? body.sortOrder
      : defaults?.sortOrder ?? 0;

  /*
  |--------------------------------------------------------------------------
  | Name
  |--------------------------------------------------------------------------
  */

  if (
    typeof rawName !== "string" ||
    rawName.trim().length < 2
  ) {
    errors.name =
      "Room name must contain at least 2 characters.";
  }

  const cleanedName =
    typeof rawName === "string"
      ? rawName.trim()
      : "";

  /*
  |--------------------------------------------------------------------------
  | Description
  |--------------------------------------------------------------------------
  */

  if (
    rawDescription !== undefined &&
    rawDescription !== null &&
    typeof rawDescription !== "string"
  ) {
    errors.description =
      "Please enter a valid room description.";
  }

  const cleanedDescription =
    cleanOptionalString(
      rawDescription
    ) ?? null;

  /*
  |--------------------------------------------------------------------------
  | Inventory and Capacity
  |--------------------------------------------------------------------------
  */

  const parsedTotalRooms =
    parseInteger(rawTotalRooms, 1);

  const parsedMaxAdults =
    parseInteger(rawMaxAdults, 1);

  const parsedMaxChildren =
    parseInteger(rawMaxChildren, 0);

  const parsedMaxGuests =
    parseInteger(rawMaxGuests, 1);

  const parsedBeds =
    parseInteger(rawBeds, 1);

  const parsedBathrooms =
    parseInteger(rawBathrooms, 0);

  const parsedSortOrder =
    parseInteger(rawSortOrder, 0);

  if (!parsedTotalRooms.isValid) {
    errors.totalRooms =
      "Total rooms must be at least 1.";
  }

  if (!parsedMaxAdults.isValid) {
    errors.maxAdults =
      "Maximum adults must be at least 1.";
  }

  if (!parsedMaxChildren.isValid) {
    errors.maxChildren =
      "Maximum children must be zero or greater.";
  }

  if (!parsedMaxGuests.isValid) {
    errors.maxGuests =
      "Maximum guests must be at least 1.";
  }

  if (!parsedBeds.isValid) {
    errors.beds =
      "Beds must be at least 1.";
  }

  if (!parsedBathrooms.isValid) {
    errors.bathrooms =
      "Bathrooms must be zero or greater.";
  }

  if (!parsedSortOrder.isValid) {
    errors.sortOrder =
      "Sort order must be zero or greater.";
  }

  if (
    parsedMaxGuests.isValid &&
    parsedMaxAdults.isValid &&
    Number(parsedMaxGuests.value) <
      Number(parsedMaxAdults.value)
  ) {
    errors.maxGuests =
      "Maximum guests cannot be less than maximum adults.";
  }

  /*
  |--------------------------------------------------------------------------
  | Pricing
  |--------------------------------------------------------------------------
  */

  const parsedBasePrice =
    parseMoney(rawBasePrice);

  const parsedWeekendPrice =
    parseMoney(
      rawWeekendPrice,
      true
    );

  if (!parsedBasePrice.isValid) {
    errors.basePrice =
      "Base price must be greater than zero.";
  }

  if (!parsedWeekendPrice.isValid) {
    errors.weekendPrice =
      "Weekend price must be greater than zero.";
  }

  /*
  |--------------------------------------------------------------------------
  | Status
  |--------------------------------------------------------------------------
  */

  const parsedIsActive =
    parseBoolean(
      body.isActive,
      defaults?.isActive ?? true
    );

  if (!parsedIsActive.isValid) {
    errors.isActive =
      "Active status must be true or false.";
  }

  /*
  |--------------------------------------------------------------------------
  | Amenities
  |--------------------------------------------------------------------------
  */

  const parsedAmenityIds =
    parseAmenityIds(
      body.amenityIds
    );

  if (!parsedAmenityIds.isValid) {
    errors.amenityIds =
      parsedAmenityIds.message ||
      "Please provide valid amenities.";
  }

  /*
  |--------------------------------------------------------------------------
  | Validation Result
  |--------------------------------------------------------------------------
  */

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  const requestedSlug =
    typeof body.slug === "string"
      ? slugify(body.slug)
      : "";

  const slugSource =
    requestedSlug ||
    defaults?.slug ||
    cleanedName;

  return {
    success: true,

    values: {
      name: cleanedName,
      slugSource,
      description:
        cleanedDescription,

      totalRooms:
        parsedTotalRooms.value as number,

      maxAdults:
        parsedMaxAdults.value as number,

      maxChildren:
        parsedMaxChildren.value as number,

      maxGuests:
        parsedMaxGuests.value as number,

      beds:
        parsedBeds.value as number,

      bathrooms:
        parsedBathrooms.value as number,

      basePrice:
        parsedBasePrice.value as string,

      weekendPrice:
        parsedWeekendPrice.value ??
        null,

      isActive:
        parsedIsActive.value,

      sortOrder:
        parsedSortOrder.value as number,

      amenityIds:
        parsedAmenityIds.value,
    },
  };
};

/*
|--------------------------------------------------------------------------
| Vendor: Get Room Types
|--------------------------------------------------------------------------
*/

export const getVendorRoomTypes =
  async (
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
        req.params.propertyId || ""
      ).trim();

      if (!propertyId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID is required",
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
        !propertySupportsRooms(
          property.bookingType
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property does not support room-wise booking",
        });
      }

      const roomTypes =
        await prisma.roomType.findMany({
          where: {
            propertyId,
          },

          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],

          include: {
            images: {
              where: {
                isCover: true,
              },

              orderBy: {
                sortOrder: "asc",
              },

              take: 1,
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

            _count: {
              select: {
                images: true,
                amenities: true,
              },
            },
          },
        });

      const activeRoomTypes =
        roomTypes.filter(
          (roomType) =>
            roomType.isActive
        );

      const statistics = {
        totalRoomTypes:
          roomTypes.length,

        activeRoomTypes:
          activeRoomTypes.length,

        inactiveRoomTypes:
          roomTypes.length -
          activeRoomTypes.length,

        totalInventory:
          roomTypes.reduce(
            (total, roomType) =>
              total +
              roomType.totalRooms,
            0
          ),

        activeInventory:
          activeRoomTypes.reduce(
            (total, roomType) =>
              total +
              roomType.totalRooms,
            0
          ),
      };

      return res.status(200).json({
        success: true,
        message:
          "Room inventory fetched successfully",

        property,

        data: roomTypes,
        total: roomTypes.length,
        statistics,
      });
    } catch (error) {
      console.error(
        "Get vendor room types error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch room inventory",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Get Single Room Type
|--------------------------------------------------------------------------
*/

export const getVendorRoomTypeById =
  async (
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
        req.params.propertyId || ""
      ).trim();

      const roomTypeId = String(
        req.params.roomTypeId || ""
      ).trim();

      if (
        !propertyId ||
        !roomTypeId
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID and room type ID are required",
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
        !propertySupportsRooms(
          property.bookingType
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property does not support room-wise booking",
        });
      }

      const roomType =
        await prisma.roomType.findFirst({
          where: {
            id: roomTypeId,
            propertyId,
          },

          include:
            roomTypeDetailsInclude,
        });

      if (!roomType) {
        return res.status(404).json({
          success: false,
          message:
            "Room type not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Room type fetched successfully",
        property,
        data: roomType,
      });
    } catch (error) {
      console.error(
        "Get vendor room type error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch room type",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Create Room Type
|--------------------------------------------------------------------------
*/

export const createVendorRoomType =
  async (
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
        req.params.propertyId || ""
      ).trim();

      if (!propertyId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID is required",
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
        !propertySupportsRooms(
          property.bookingType
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Room inventory is available only for ROOM_WISE or BOTH properties",
        });
      }

      if (
        roomManagementIsBlocked(
          property.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Room inventory cannot currently be edited for this property",
        });
      }

      const maximumSortOrder =
        await prisma.roomType.aggregate({
          where: {
            propertyId,
          },

          _max: {
            sortOrder: true,
          },
        });

      const body =
        req.body as RoomTypeBody;

      const validation =
        validateRoomTypeBody(
          body,
          {
            name: "",
            slug: "",
            description: null,

            totalRooms: 1,

            maxAdults: 1,
            maxChildren: 0,
            maxGuests: 1,
            beds: 1,
            bathrooms: 1,

            basePrice: "",
            weekendPrice: null,

            isActive: true,

            sortOrder:
              (
                maximumSortOrder
                  ._max.sortOrder ?? -1
              ) + 1,
          }
        );

      if (!validation.success) {
        return res.status(422).json({
          success: false,
          message:
            "Please correct the room information",
          errors:
            validation.errors,
        });
      }

      const values =
        validation.values;

      if (
        values.amenityIds &&
        !(await activeAmenitiesExist(
          values.amenityIds
        ))
      ) {
        return res.status(422).json({
          success: false,
          message:
            "One or more selected amenities are unavailable",
          errors: {
            amenityIds:
              "Please select only active amenities.",
          },
        });
      }

      const roomSlug =
        await generateUniqueRoomSlug(
          propertyId,
          values.slugSource
        );

      const roomTypeId =
        await prisma.$transaction(
          async (transaction) => {
            const roomType =
              await transaction.roomType.create(
                {
                  data: {
                    propertyId,

                    name: values.name,
                    slug: roomSlug,

                    description:
                      values.description,

                    totalRooms:
                      values.totalRooms,

                    maxAdults:
                      values.maxAdults,

                    maxChildren:
                      values.maxChildren,

                    maxGuests:
                      values.maxGuests,

                    beds: values.beds,

                    bathrooms:
                      values.bathrooms,

                    basePrice:
                      values.basePrice,

                    weekendPrice:
                      values.weekendPrice,

                    isActive:
                      values.isActive,

                    sortOrder:
                      values.sortOrder,
                  },
                }
              );

            if (
              values.amenityIds &&
              values.amenityIds.length > 0
            ) {
              await transaction.roomAmenity.createMany(
                {
                  data:
                    values.amenityIds.map(
                      (amenityId) => ({
                        roomTypeId:
                          roomType.id,
                        amenityId,
                      })
                    ),
                }
              );
            }

            await syncPropertyTotalRooms(
              transaction,
              propertyId
            );

            return roomType.id;
          }
        );

      const createdRoomType =
        await prisma.roomType.findUnique({
          where: {
            id: roomTypeId,
          },

          include:
            roomTypeDetailsInclude,
        });

      return res.status(201).json({
        success: true,
        message:
          "Room type created successfully",
        data: createdRoomType,
      });
    } catch (error) {
      console.error(
        "Create vendor room type error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create room type",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Update Room Type
|--------------------------------------------------------------------------
*/

export const updateVendorRoomType =
  async (
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
        req.params.propertyId || ""
      ).trim();

      const roomTypeId = String(
        req.params.roomTypeId || ""
      ).trim();

      if (
        !propertyId ||
        !roomTypeId
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID and room type ID are required",
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
        !propertySupportsRooms(
          property.bookingType
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property does not support room-wise booking",
        });
      }

      if (
        roomManagementIsBlocked(
          property.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Room inventory cannot currently be edited for this property",
        });
      }

      const existingRoomType =
        await prisma.roomType.findFirst({
          where: {
            id: roomTypeId,
            propertyId,
          },
        });

      if (!existingRoomType) {
        return res.status(404).json({
          success: false,
          message:
            "Room type not found",
        });
      }

      const body =
        req.body as RoomTypeBody;

      const validation =
        validateRoomTypeBody(
          body,
          {
            name:
              existingRoomType.name,

            slug:
              existingRoomType.slug,

            description:
              existingRoomType.description,

            totalRooms:
              existingRoomType.totalRooms,

            maxAdults:
              existingRoomType.maxAdults,

            maxChildren:
              existingRoomType.maxChildren,

            maxGuests:
              existingRoomType.maxGuests,

            beds:
              existingRoomType.beds,

            bathrooms:
              existingRoomType.bathrooms,

            basePrice:
              String(
                existingRoomType.basePrice
              ),

            weekendPrice:
              existingRoomType.weekendPrice
                ? String(
                    existingRoomType.weekendPrice
                  )
                : null,

            isActive:
              existingRoomType.isActive,

            sortOrder:
              existingRoomType.sortOrder,
          }
        );

      if (!validation.success) {
        return res.status(422).json({
          success: false,
          message:
            "Please correct the room information",
          errors:
            validation.errors,
        });
      }

      const values =
        validation.values;

      if (
        values.amenityIds &&
        !(await activeAmenitiesExist(
          values.amenityIds
        ))
      ) {
        return res.status(422).json({
          success: false,
          message:
            "One or more selected amenities are unavailable",
          errors: {
            amenityIds:
              "Please select only active amenities.",
          },
        });
      }

      const roomSlug =
        await generateUniqueRoomSlug(
          propertyId,
          values.slugSource,
          roomTypeId
        );

      await prisma.$transaction(
        async (transaction) => {
          await transaction.roomType.update({
            where: {
              id: roomTypeId,
            },

            data: {
              name: values.name,
              slug: roomSlug,

              description:
                values.description,

              totalRooms:
                values.totalRooms,

              maxAdults:
                values.maxAdults,

              maxChildren:
                values.maxChildren,

              maxGuests:
                values.maxGuests,

              beds: values.beds,

              bathrooms:
                values.bathrooms,

              basePrice:
                values.basePrice,

              weekendPrice:
                values.weekendPrice,

              isActive:
                values.isActive,

              sortOrder:
                values.sortOrder,
            },
          });

          if (
            values.amenityIds !==
            undefined
          ) {
            await replaceRoomAmenities(
              transaction,
              roomTypeId,
              values.amenityIds
            );
          }

          await syncPropertyTotalRooms(
            transaction,
            propertyId
          );
        }
      );

      const updatedRoomType =
        await prisma.roomType.findUnique({
          where: {
            id: roomTypeId,
          },

          include:
            roomTypeDetailsInclude,
        });

      return res.status(200).json({
        success: true,
        message:
          "Room type updated successfully",
        data: updatedRoomType,
      });
    } catch (error) {
      console.error(
        "Update vendor room type error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update room type",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Update Room Status
|--------------------------------------------------------------------------
*/

export const updateVendorRoomStatus =
  async (
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
        req.params.propertyId || ""
      ).trim();

      const roomTypeId = String(
        req.params.roomTypeId || ""
      ).trim();

      if (
        !propertyId ||
        !roomTypeId
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID and room type ID are required",
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
        !propertySupportsRooms(
          property.bookingType
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property does not support room-wise booking",
        });
      }

      if (
        roomManagementIsBlocked(
          property.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Room inventory cannot currently be edited for this property",
        });
      }

      const body =
        req.body as RoomStatusBody;

      const parsedStatus =
        parseBoolean(
          body.isActive,
          false
        );

      if (
        body.isActive === undefined ||
        !parsedStatus.isValid
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please provide a valid room status",
          errors: {
            isActive:
              "Active status must be true or false.",
          },
        });
      }

      const existingRoomType =
        await prisma.roomType.findFirst({
          where: {
            id: roomTypeId,
            propertyId,
          },
        });

      if (!existingRoomType) {
        return res.status(404).json({
          success: false,
          message:
            "Room type not found",
        });
      }

      if (
        existingRoomType.isActive ===
        parsedStatus.value
      ) {
        return res.status(409).json({
          success: false,
          message: parsedStatus.value
            ? "Room type is already active"
            : "Room type is already inactive",
        });
      }

      await prisma.$transaction(
        async (transaction) => {
          await transaction.roomType.update({
            where: {
              id: roomTypeId,
            },

            data: {
              isActive:
                parsedStatus.value,
            },
          });

          await syncPropertyTotalRooms(
            transaction,
            propertyId
          );
        }
      );

      const updatedRoomType =
        await prisma.roomType.findUnique({
          where: {
            id: roomTypeId,
          },

          include:
            roomTypeDetailsInclude,
        });

      return res.status(200).json({
        success: true,

        message:
          parsedStatus.value
            ? "Room type activated successfully"
            : "Room type marked as inactive successfully",

        data: updatedRoomType,
      });
    } catch (error) {
      console.error(
        "Update vendor room status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update room status",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Update Room Amenities
|--------------------------------------------------------------------------
*/

export const updateVendorRoomAmenities =
  async (
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
        req.params.propertyId || ""
      ).trim();

      const roomTypeId = String(
        req.params.roomTypeId || ""
      ).trim();

      if (
        !propertyId ||
        !roomTypeId
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID and room type ID are required",
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
        !propertySupportsRooms(
          property.bookingType
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property does not support room-wise booking",
        });
      }

      if (
        roomManagementIsBlocked(
          property.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Room inventory cannot currently be edited for this property",
        });
      }

      const roomType =
        await prisma.roomType.findFirst({
          where: {
            id: roomTypeId,
            propertyId,
          },

          select: {
            id: true,
          },
        });

      if (!roomType) {
        return res.status(404).json({
          success: false,
          message:
            "Room type not found",
        });
      }

      const body =
        req.body as RoomAmenitiesBody;

      const parsedAmenityIds =
        parseAmenityIds(
          body.amenityIds
        );

      if (
        body.amenityIds === undefined ||
        !parsedAmenityIds.isValid ||
        parsedAmenityIds.value ===
          undefined
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please provide valid room amenities",
          errors: {
            amenityIds:
              parsedAmenityIds.message ||
              "Amenities must be provided as an array.",
          },
        });
      }

      if (
        !(await activeAmenitiesExist(
          parsedAmenityIds.value
        ))
      ) {
        return res.status(422).json({
          success: false,
          message:
            "One or more selected amenities are unavailable",
          errors: {
            amenityIds:
              "Please select only active amenities.",
          },
        });
      }

      await prisma.$transaction(
        async (transaction) => {
          await replaceRoomAmenities(
            transaction,
            roomTypeId,
            parsedAmenityIds.value as string[]
          );
        }
      );

      const updatedRoomType =
        await prisma.roomType.findUnique({
          where: {
            id: roomTypeId,
          },

          include:
            roomTypeDetailsInclude,
        });

      return res.status(200).json({
        success: true,
        message:
          "Room amenities updated successfully",
        data: updatedRoomType,
      });
    } catch (error) {
      console.error(
        "Update vendor room amenities error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update room amenities",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Delete Room Type
|--------------------------------------------------------------------------
*/

export const deleteVendorRoomType =
  async (
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
        req.params.propertyId || ""
      ).trim();

      const roomTypeId = String(
        req.params.roomTypeId || ""
      ).trim();

      if (
        !propertyId ||
        !roomTypeId
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID and room type ID are required",
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
        !propertySupportsRooms(
          property.bookingType
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property does not support room-wise booking",
        });
      }

      if (
        roomManagementIsBlocked(
          property.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Room inventory cannot currently be edited for this property",
        });
      }

      const roomType =
        await prisma.roomType.findFirst({
          where: {
            id: roomTypeId,
            propertyId,
          },

          include: {
            images: {
              select: {
                image: true,
              },
            },
          },
        });

      if (!roomType) {
        return res.status(404).json({
          success: false,
          message:
            "Room type not found",
        });
      }

      await prisma.$transaction(
        async (transaction) => {
          await transaction.roomType.delete({
            where: {
              id: roomTypeId,
            },
          });

          await syncPropertyTotalRooms(
            transaction,
            propertyId
          );
        }
      );

      roomType.images.forEach(
        (roomImage) => {
          deletePublicStorageFile(
            roomImage.image
          );
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Room type deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete vendor room type error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete room type",
      });
    }
  };