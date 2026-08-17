import type {
  Request,
  Response,
} from "express";

import {
  BookingMode,
  BookingStatus,
  PropertyBookingType,
  PropertyStatus,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

/*
|--------------------------------------------------------------------------
| Query Types
|--------------------------------------------------------------------------
*/

type PublicPropertySort =
  | "RECOMMENDED"
  | "NEWEST"
  | "PRICE_LOW"
  | "PRICE_HIGH"
  | "FEATURED";

interface ParsedDateRange {
  checkIn: Date;
  checkOut: Date;
  checkInKey: string;
  checkOutKey: string;
  nights: Date[];
  totalNights: number;
}

interface SearchContext {
  guests: number;
  rooms: number;
  minimumPrice: number | null;
  maximumPrice: number | null;
  dateRange: ParsedDateRange | null;
}

interface AvailabilityMaps {
  propertyBlocks: Map<
    string,
    Set<string>
  >;

  roomBlocks: Map<
    string,
    Map<string, number>
  >;

  entireBookings: Map<
    string,
    Set<string>
  >;

  roomBookings: Map<
    string,
    Map<string, number>
  >;
}

/*
|--------------------------------------------------------------------------
| Public Property Include
|--------------------------------------------------------------------------
*/

const publicPropertyInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      image: true,
    },
  },

  images: {
    orderBy: [
      {
        isCover: "desc",
      },
      {
        sortOrder: "asc",
      },
    ],

    select: {
      id: true,
      image: true,
      altText: true,
      isCover: true,
      sortOrder: true,
    },
  },

  amenities: {
    where: {
      amenity: {
        isActive: true,
      },
    },

    orderBy: {
      amenity: {
        sortOrder: "asc",
      },
    },

    include: {
      amenity: {
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
      },
    },
  },

  ruleAssignments: {
    where: {
      rule: {
        isActive: true,
      },
    },

    orderBy: {
      rule: {
        sortOrder: "asc",
      },
    },

    include: {
      rule: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          sortOrder: true,
        },
      },
    },
  },

  roomTypes: {
    where: {
      isActive: true,
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
        orderBy: [
          {
            isCover: "desc",
          },
          {
            sortOrder: "asc",
          },
        ],

        select: {
          id: true,
          image: true,
          altText: true,
          isCover: true,
          sortOrder: true,
        },
      },

      amenities: {
        where: {
          amenity: {
            isActive: true,
          },
        },

        orderBy: {
          amenity: {
            sortOrder: "asc",
          },
        },

        include: {
          amenity: {
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
          },
        },
      },
    },
  },
} satisfies Prisma.PropertyInclude;

type PublicPropertyRecord =
  Prisma.PropertyGetPayload<{
    include:
      typeof publicPropertyInclude;
  }>;

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const dateOnlyPattern =
  /^\d{4}-\d{2}-\d{2}$/;

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

const maximumSearchNights = 60;

const defaultPageSize = 12;
const maximumPageSize = 48;

/*
|--------------------------------------------------------------------------
| Number Helpers
|--------------------------------------------------------------------------
*/

const toNumber = (
  value: unknown
): number | null => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsedValue =
    Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
};

const parsePositiveInteger = (
  value: unknown,
  fallbackValue: number,
  maximumValue: number
): number => {
  const parsedValue =
    Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    return fallbackValue;
  }

  return Math.min(
    parsedValue,
    maximumValue
  );
};

const parseOptionalPrice = (
  value: unknown
):
  | {
      isValid: true;
      value: number | null;
    }
  | {
      isValid: false;
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

  const parsedValue =
    Number(value);

  if (
    !Number.isFinite(parsedValue) ||
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
| Boolean Query Parser
|--------------------------------------------------------------------------
*/

const parseBooleanQuery = (
  value: unknown
): boolean | null => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    value === true ||
    value === "true" ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === "0"
  ) {
    return false;
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| Booking Type Parser
|--------------------------------------------------------------------------
*/

const parseBookingType = (
  value: unknown
): PropertyBookingType | null => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const normalizedValue =
    value
      .trim()
      .toUpperCase();

  return Object.values(
    PropertyBookingType
  ).includes(
    normalizedValue as PropertyBookingType
  )
    ? (
        normalizedValue as PropertyBookingType
      )
    : null;
};

/*
|--------------------------------------------------------------------------
| Sort Parser
|--------------------------------------------------------------------------
*/

const parseSort = (
  value: unknown
): PublicPropertySort => {
  if (
    typeof value !== "string"
  ) {
    return "RECOMMENDED";
  }

  const normalizedValue =
    value
      .trim()
      .toUpperCase();

  const availableSorts:
    PublicPropertySort[] = [
      "RECOMMENDED",
      "NEWEST",
      "PRICE_LOW",
      "PRICE_HIGH",
      "FEATURED",
    ];

  return availableSorts.includes(
    normalizedValue as PublicPropertySort
  )
    ? (
        normalizedValue as PublicPropertySort
      )
    : "RECOMMENDED";
};

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const formatDateKey = (
  date: Date
): string => {
  return date
    .toISOString()
    .slice(0, 10);
};

const parseDateOnly = (
  value: unknown
): Date | null => {
  if (
    typeof value !== "string" ||
    !dateOnlyPattern.test(value)
  ) {
    return null;
  }

  const [
    yearValue,
    monthValue,
    dayValue,
  ] = value.split("-");

  const year =
    Number(yearValue);

  const month =
    Number(monthValue);

  const day =
    Number(dayValue);

  const parsedDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  const isValid =
    parsedDate.getUTCFullYear() ===
      year &&
    parsedDate.getUTCMonth() ===
      month - 1 &&
    parsedDate.getUTCDate() ===
      day;

  return isValid
    ? parsedDate
    : null;
};

const activeAvailabilityBookingWhere = {
  OR: [
    {
      status: BookingStatus.CONFIRMED,
    },
    {
      status: BookingStatus.REQUESTED,
      OR: [
        {
          reservationAmount: null,
        },
        {
          reservationAmount: {
            lte: 0,
          },
        },
        {
          paymentStatus: {
            not: "PENDING",
          },
        },
      ],
    },
  ],
} satisfies Prisma.BookingWhereInput;

const getTodayDateOnly =
  (): Date => {
    const currentDate =
      new Date();

    return new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate()
      )
    );
  };

const addDays = (
  date: Date,
  days: number
): Date => {
  return new Date(
    date.getTime() +
      days *
        millisecondsPerDay
  );
};

const buildNights = (
  checkIn: Date,
  checkOut: Date
): Date[] => {
  const nights: Date[] = [];

  let currentDate =
    checkIn;

  while (
    currentDate.getTime() <
    checkOut.getTime()
  ) {
    nights.push(currentDate);

    currentDate =
      addDays(
        currentDate,
        1
      );
  }

  return nights;
};

/*
|--------------------------------------------------------------------------
| Parse Date Range
|--------------------------------------------------------------------------
*/

const parseDateRange = (
  checkInValue: unknown,
  checkOutValue: unknown,
  required = false
):
  | {
      success: true;
      value: ParsedDateRange | null;
    }
  | {
      success: false;
      message: string;
      errors: Record<
        string,
        string
      >;
    } => {
  const checkInMissing =
    checkInValue === undefined ||
    checkInValue === null ||
    checkInValue === "";

  const checkOutMissing =
    checkOutValue === undefined ||
    checkOutValue === null ||
    checkOutValue === "";

  if (
    checkInMissing &&
    checkOutMissing &&
    !required
  ) {
    return {
      success: true,
      value: null,
    };
  }

  if (
    checkInMissing ||
    checkOutMissing
  ) {
    return {
      success: false,
      message:
        "Check-in and check-out dates are both required",
      errors: {
        checkIn:
          "Please select a check-in date.",
        checkOut:
          "Please select a check-out date.",
      },
    };
  }

  const checkIn =
    parseDateOnly(checkInValue);

  const checkOut =
    parseDateOnly(checkOutValue);

  if (!checkIn || !checkOut) {
    return {
      success: false,
      message:
        "Please provide valid check-in and check-out dates",
      errors: {
        checkIn:
          "Check-in must use YYYY-MM-DD format.",
        checkOut:
          "Check-out must use YYYY-MM-DD format.",
      },
    };
  }

  const today =
    getTodayDateOnly();

  if (
    checkIn.getTime() <
    today.getTime()
  ) {
    return {
      success: false,
      message:
        "Check-in date cannot be in the past",
      errors: {
        checkIn:
          "Please select today or a future date.",
      },
    };
  }

  if (
    checkOut.getTime() <=
    checkIn.getTime()
  ) {
    return {
      success: false,
      message:
        "Check-out must be after check-in",
      errors: {
        checkOut:
          "Please select a date after check-in.",
      },
    };
  }

  const totalNights =
    Math.floor(
      (
        checkOut.getTime() -
        checkIn.getTime()
      ) /
        millisecondsPerDay
    );

  if (
    totalNights >
    maximumSearchNights
  ) {
    return {
      success: false,
      message:
        `A stay cannot exceed ${maximumSearchNights} nights`,
      errors: {
        checkOut:
          `Please select a stay of ${maximumSearchNights} nights or less.`,
      },
    };
  }

  return {
    success: true,

    value: {
      checkIn,
      checkOut,

      checkInKey:
        formatDateKey(checkIn),

      checkOutKey:
        formatDateKey(checkOut),

      nights:
        buildNights(
          checkIn,
          checkOut
        ),

      totalNights,
    },
  };
};

/*
|--------------------------------------------------------------------------
| Search Context Parser
|--------------------------------------------------------------------------
*/

const parseSearchContext = (
  req: Request,
  datesRequired = false
):
  | {
      success: true;
      value: SearchContext;
    }
  | {
      success: false;
      message: string;
      errors?: Record<
        string,
        string
      >;
    } => {
  const guests =
    parsePositiveInteger(
      req.query.guests,
      1,
      100
    );

  const rooms =
    parsePositiveInteger(
      req.query.rooms,
      1,
      50
    );

  const minimumPrice =
    parseOptionalPrice(
      req.query.minimumPrice
    );

  const maximumPrice =
    parseOptionalPrice(
      req.query.maximumPrice
    );

  if (!minimumPrice.isValid) {
    return {
      success: false,
      message:
        "Minimum price must be a valid positive number",
      errors: {
        minimumPrice:
          "Please enter a valid minimum price.",
      },
    };
  }

  if (!maximumPrice.isValid) {
    return {
      success: false,
      message:
        "Maximum price must be a valid positive number",
      errors: {
        maximumPrice:
          "Please enter a valid maximum price.",
      },
    };
  }

  if (
    minimumPrice.value !== null &&
    maximumPrice.value !== null &&
    minimumPrice.value >
      maximumPrice.value
  ) {
    return {
      success: false,
      message:
        "Minimum price cannot exceed maximum price",
      errors: {
        maximumPrice:
          "Maximum price must be equal to or greater than minimum price.",
      },
    };
  }

  const dateRange =
    parseDateRange(
      req.query.checkIn,
      req.query.checkOut,
      datesRequired
    );

  if (!dateRange.success) {
    return dateRange;
  }

  return {
    success: true,

    value: {
      guests,
      rooms,

      minimumPrice:
        minimumPrice.value,

      maximumPrice:
        maximumPrice.value,

      dateRange:
        dateRange.value,
    },
  };
};

/*
|--------------------------------------------------------------------------
| Property Booking Support
|--------------------------------------------------------------------------
*/

const supportsEntireProperty = (
  bookingType: PropertyBookingType
): boolean => {
  return (
    bookingType ===
      PropertyBookingType.ENTIRE_PROPERTY ||
    bookingType ===
      PropertyBookingType.BOTH
  );
};

const supportsRoomBooking = (
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
| Room Readiness
|--------------------------------------------------------------------------
*/

const roomIsPublicReady = (
  roomType:
    PublicPropertyRecord["roomTypes"][number]
): boolean => {
  return (
    roomType.isActive &&
    roomType.totalRooms > 0 &&
    toNumber(roomType.basePrice) !==
      null &&
    Number(roomType.basePrice) >
      0 &&
    roomType.images.length > 0
  );
};

/*
|--------------------------------------------------------------------------
| Public Property Readiness Where
|--------------------------------------------------------------------------
*/

const buildPublicReadinessCondition =
  (): Prisma.PropertyWhereInput => {
    const readyRoomCondition:
      Prisma.RoomTypeWhereInput = {
      isActive: true,

      totalRooms: {
        gt: 0,
      },

      basePrice: {
        gt: 0,
      },

      images: {
        some: {},
      },
    };

    return {
      OR: [
        {
          bookingType:
            PropertyBookingType.ENTIRE_PROPERTY,

          basePrice: {
            gt: 0,
          },

          maxGuests: {
            gt: 0,
          },
        },

        {
          bookingType:
            PropertyBookingType.ROOM_WISE,

          roomTypes: {
            some:
              readyRoomCondition,
          },
        },

        {
          bookingType:
            PropertyBookingType.BOTH,

          basePrice: {
            gt: 0,
          },

          maxGuests: {
            gt: 0,
          },

          roomTypes: {
            some:
              readyRoomCondition,
          },
        },
      ],
    };
  };

/*
|--------------------------------------------------------------------------
| Build Public Property Where
|--------------------------------------------------------------------------
*/

const buildPublicPropertyWhere = (
  req: Request,
  context: SearchContext
): Prisma.PropertyWhereInput => {
  const conditions:
    Prisma.PropertyWhereInput[] = [
      {
        status:
          PropertyStatus.APPROVED,
      },

      {
        category: {
          isActive: true,
        },
      },

      {
        images: {
          some: {},
        },
      },

      buildPublicReadinessCondition(),
    ];

  const search =
    typeof req.query.search ===
    "string"
      ? req.query.search.trim()
      : "";

  const city =
    typeof req.query.city ===
    "string"
      ? req.query.city.trim()
      : "";

  const category =
    typeof req.query.category ===
    "string"
      ? req.query.category.trim()
      : "";

  const requestedBookingType =
    parseBookingType(
      req.query.bookingType
    );

  const featured =
    parseBooleanQuery(
      req.query.featured
    );

  if (search) {
    conditions.push({
      OR: [
        {
          city: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          state: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          locality: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          shortDescription: {
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
      ],
    });
  }

  if (city) {
    conditions.push({
      city: {
        equals: city,
        mode: "insensitive",
      },
    });
  }

  if (category) {
    conditions.push({
      category: {
        OR: [
          {
            id: category,
          },
          {
            slug: {
              equals: category,
              mode: "insensitive",
            },
          },
        ],
      },
    });
  }

  if (requestedBookingType) {
    conditions.push({
      bookingType:
        requestedBookingType,
    });
  }

  if (featured !== null) {
    conditions.push({
      isFeatured: featured,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Guest and Room Capacity
  |--------------------------------------------------------------------------
  |
  | Room-wise search assumes all selected rooms are from the same Room Type.
  |
  */

  const guestsPerRoom =
    Math.ceil(
      context.guests /
        context.rooms
    );

  const roomCapacityCondition:
    Prisma.RoomTypeWhereInput = {
    isActive: true,

    totalRooms: {
      gte: context.rooms,
    },

    maxGuests: {
      gte: guestsPerRoom,
    },

    basePrice: {
      gt: 0,
    },

    images: {
      some: {},
    },
  };

  conditions.push({
    OR: [
      {
        bookingType:
          PropertyBookingType.ENTIRE_PROPERTY,

        maxGuests: {
          gte:
            context.guests,
        },
      },

      {
        bookingType:
          PropertyBookingType.ROOM_WISE,

        roomTypes: {
          some:
            roomCapacityCondition,
        },
      },

      {
        bookingType:
          PropertyBookingType.BOTH,

        OR: [
          {
            maxGuests: {
              gte:
                context.guests,
            },
          },

          {
            roomTypes: {
              some:
                roomCapacityCondition,
            },
          },
        ],
      },
    ],
  });

  return {
    AND: conditions,
  };
};

/*
|--------------------------------------------------------------------------
| Build Public Display Title
|--------------------------------------------------------------------------
*/

const buildPublicDisplayTitle = (
  property:
    PublicPropertyRecord
): string => {
  const title =
    property.title.trim();

  if (title) {
    return title;
  }

  const approximateLocation =
    property.locality ||
    property.city ||
    property.state ||
    "a peaceful destination";

  return `${property.category.name} near ${approximateLocation}`;
};

/*
|--------------------------------------------------------------------------
| Starting Price
|--------------------------------------------------------------------------
*/

const getStartingPrice = (
  property:
    PublicPropertyRecord
): number | null => {
  const availablePrices:
    number[] = [];

  if (
    supportsEntireProperty(
      property.bookingType
    )
  ) {
    const propertyPrice =
      toNumber(
        property.basePrice
      );

    if (
      propertyPrice !== null &&
      propertyPrice > 0
    ) {
      availablePrices.push(
        propertyPrice
      );
    }
  }

  if (
    supportsRoomBooking(
      property.bookingType
    )
  ) {
    property.roomTypes
      .filter(roomIsPublicReady)
      .forEach((roomType) => {
        const roomPrice =
          toNumber(
            roomType.basePrice
          );

        if (
          roomPrice !== null &&
          roomPrice > 0
        ) {
          availablePrices.push(
            roomPrice
          );
        }
      });
  }

  if (
    availablePrices.length === 0
  ) {
    return null;
  }

  return Math.min(
    ...availablePrices
  );
};

/*
|--------------------------------------------------------------------------
| Availability Maps
|--------------------------------------------------------------------------
*/

const fetchAvailabilityMaps =
  async (
    properties:
      PublicPropertyRecord[],
    dateRange:
      ParsedDateRange | null
  ): Promise<AvailabilityMaps> => {
    const propertyBlocks =
      new Map<
        string,
        Set<string>
      >();

    const roomBlocks =
      new Map<
        string,
        Map<string, number>
      >();

    const entireBookings =
      new Map<
        string,
        Set<string>
      >();

    const roomBookings =
      new Map<
        string,
        Map<string, number>
      >();

    if (
      !dateRange ||
      properties.length === 0
    ) {
      return {
        propertyBlocks,
        roomBlocks,
        entireBookings,
        roomBookings,
      };
    }

    const propertyIds =
      properties.map(
        (property) =>
          property.id
      );

    const roomTypeIds =
      properties.flatMap(
        (property) =>
          property.roomTypes.map(
            (roomType) =>
              roomType.id
          )
      );

    const [
      propertyBlockRecords,
      roomBlockRecords,
      bookingRecords,
    ] = await Promise.all([
      prisma.propertyAvailabilityBlock.findMany(
        {
          where: {
            propertyId: {
              in: propertyIds,
            },

            date: dateRange
              ? {
                  gte: dateRange.checkIn,
                  lte: dateRange.checkOut,
                }
              : undefined,
          },

          select: {
            propertyId: true,
            date: true,
          },
        }
      ),

      roomTypeIds.length > 0
        ? prisma.roomAvailabilityBlock.findMany(
            {
              where: {
                roomTypeId: {
                  in: roomTypeIds,
                },

                date: dateRange
                  ? {
                      gte: dateRange.checkIn,
                      lte: dateRange.checkOut,
                    }
                  : undefined,
              },

              select: {
                roomTypeId: true,
                date: true,
                blockedRooms: true,
              },
            }
          )
        : Promise.resolve([]),

      prisma.booking.findMany({
        where: {
          propertyId: {
            in: propertyIds,
          },
          ...activeAvailabilityBookingWhere,
          checkIn: {
            lt: dateRange.checkOut,
          },
          checkOut: {
            gt: dateRange.checkIn,
          },
        },
        select: {
          propertyId: true,
          roomTypeId: true,
          bookingMode: true,
          checkIn: true,
          checkOut: true,
          rooms: true,
        },
      }),
    ]);

    propertyBlockRecords.forEach(
      (record) => {
        const existingDates =
          propertyBlocks.get(
            record.propertyId
          ) ||
          new Set<string>();

        existingDates.add(
          formatDateKey(
            record.date
          )
        );

        propertyBlocks.set(
          record.propertyId,
          existingDates
        );
      }
    );

    roomBlockRecords.forEach(
      (record) => {
        const existingBlocks =
          roomBlocks.get(
            record.roomTypeId
          ) ||
          new Map<
            string,
            number
          >();

        existingBlocks.set(
          formatDateKey(
            record.date
          ),
          record.blockedRooms
        );

        roomBlocks.set(
          record.roomTypeId,
          existingBlocks
        );
      }
    );

    bookingRecords.forEach(
      (record) => {
        const bookingNights =
          buildNights(
            record.checkIn,
            record.checkOut
          );

        if (
          record.bookingMode ===
          BookingMode.ENTIRE_PROPERTY
        ) {
          const dates =
            entireBookings.get(
              record.propertyId
            ) ||
            new Set<string>();

          bookingNights.forEach(
            (night) => {
              dates.add(
                formatDateKey(night)
              );
            }
          );

          entireBookings.set(
            record.propertyId,
            dates
          );

          return;
        }

        if (!record.roomTypeId) {
          return;
        }

        const existingRoomBookings =
          roomBookings.get(
            record.roomTypeId
          ) ||
          new Map<
            string,
            number
          >();

        bookingNights.forEach(
          (night) => {
            const date =
              formatDateKey(night);

            existingRoomBookings.set(
              date,
              (existingRoomBookings.get(
                date
              ) || 0) + record.rooms
            );
          }
        );

        roomBookings.set(
          record.roomTypeId,
          existingRoomBookings
        );
      }
    );

    return {
      propertyBlocks,
      roomBlocks,
      entireBookings,
      roomBookings,
    };
  };

/*
|--------------------------------------------------------------------------
| Room Availability
|--------------------------------------------------------------------------
*/

const calculateRoomAvailability = (
  property:
    PublicPropertyRecord,
  roomType:
    PublicPropertyRecord["roomTypes"][number],
  context: SearchContext,
  maps: AvailabilityMaps
) => {
  const dateRange =
    context.dateRange;

  const propertyBlockedDates =
    maps.propertyBlocks.get(
      property.id
    ) ||
    new Set<string>();

  const entireBookedDates =
    maps.entireBookings.get(
      property.id
    ) ||
    new Set<string>();

  const roomBlockMap =
    maps.roomBlocks.get(
      roomType.id
    ) ||
    new Map<
      string,
      number
    >();

  const roomBookingMap =
    maps.roomBookings.get(
      roomType.id
    ) ||
    new Map<
      string,
      number
    >();

  let minimumAvailableRooms =
    roomType.totalRooms;

  const nightlyAvailability =
    dateRange
      ? dateRange.nights.map(
          (night) => {
            const date =
              formatDateKey(
                night
              );

            const propertyBlocked =
              propertyBlockedDates.has(
                date
              );

            const entireBooked =
              entireBookedDates.has(
                date
              );

            const manuallyBlocked =
              roomBlockMap.get(
                date
              ) || 0;

            const bookedRooms =
              roomBookingMap.get(
                date
              ) || 0;

            const availableRooms =
              propertyBlocked ||
              entireBooked
                ? 0
                : Math.max(
                    roomType.totalRooms -
                      manuallyBlocked,
                    0
                  );

            const availableRoomsAfterBookings =
              propertyBlocked ||
              entireBooked
                ? 0
                : Math.max(
                    availableRooms -
                      bookedRooms,
                    0
                  );

            minimumAvailableRooms =
              Math.min(
                minimumAvailableRooms,
                availableRoomsAfterBookings
              );

            return {
              date,
              propertyBlocked,
              entireBooked,
              manuallyBlocked,
              bookedRooms,
              availableRooms:
                availableRoomsAfterBookings,
            };
          }
        )
      : [];

  const guestsPerRoom =
    Math.ceil(
      context.guests /
        context.rooms
    );

  const guestCapacityValid =
    roomType.maxGuests >=
    guestsPerRoom;

  const inventoryValid =
    minimumAvailableRooms >=
    context.rooms;

  const available =
    roomIsPublicReady(
      roomType
    ) &&
    guestCapacityValid &&
    inventoryValid;

  return {
    roomTypeId:
      roomType.id,

    name:
      roomType.name,

    totalRooms:
      roomType.totalRooms,

    requestedRooms:
      context.rooms,

    maximumGuestsPerRoom:
      roomType.maxGuests,

    minimumAvailableRooms,

    guestCapacityValid,
    inventoryValid,
    available,

    nightlyAvailability,
  };
};

/*
|--------------------------------------------------------------------------
| Complete Property Availability
|--------------------------------------------------------------------------
*/

const calculatePropertyAvailability = (
  property:
    PublicPropertyRecord,
  context: SearchContext,
  maps: AvailabilityMaps
) => {
  const dateRange =
    context.dateRange;

  const checked =
    Boolean(dateRange);

  const propertyBlockedDates =
    maps.propertyBlocks.get(
      property.id
    ) ||
    new Set<string>();

  const entireBookedDates =
    maps.entireBookings.get(
      property.id
    ) ||
    new Set<string>();

  const entirePropertySupported =
    supportsEntireProperty(
      property.bookingType
    );

  const roomBookingSupported =
    supportsRoomBooking(
      property.bookingType
    );

  const entireCapacityValid =
    (
      property.maxGuests || 0
    ) >= context.guests;

  let entirePropertyBlocked =
    false;

  let entirePropertyBooked =
    false;

  let roomInventoryConflict =
    false;

  if (dateRange) {
    entirePropertyBlocked =
      dateRange.nights.some(
        (night) =>
          propertyBlockedDates.has(
            formatDateKey(
              night
            )
          )
      );

    entirePropertyBooked =
      dateRange.nights.some(
        (night) =>
          entireBookedDates.has(
            formatDateKey(
              night
            )
          )
      );

    /*
    |--------------------------------------------------------------------------
    | BOTH Booking Conflict
    |--------------------------------------------------------------------------
    |
    | Any manual Room Type block makes complete-property booking unavailable.
    |
    */

    if (
      property.bookingType ===
      PropertyBookingType.BOTH
    ) {
      roomInventoryConflict =
        property.roomTypes
          .filter(
            roomIsPublicReady
          )
          .some(
            (roomType) => {
              const roomBlockMap =
                maps.roomBlocks.get(
                  roomType.id
                );

              if (!roomBlockMap) {
                const roomBookingMap =
                  maps.roomBookings.get(
                    roomType.id
                  );

                if (!roomBookingMap) {
                  return false;
                }

                return dateRange.nights.some(
                  (night) =>
                    (
                      roomBookingMap.get(
                        formatDateKey(
                          night
                        )
                      ) || 0
                    ) > 0
                );
              }

              return dateRange.nights.some(
                (night) => {
                  const date =
                    formatDateKey(
                      night
                    );

                  const manualBlocked =
                  (
                    roomBlockMap.get(
                      date
                    ) || 0
                  ) > 0;

                  const bookedRooms =
                    (
                      maps.roomBookings
                        .get(roomType.id)
                        ?.get(date) || 0
                    ) > 0;

                  return (
                    manualBlocked ||
                    bookedRooms
                  );
                }
              );
            }
          );
    }
  }

  const entirePropertyReady =
    entirePropertySupported &&
    toNumber(
      property.basePrice
    ) !== null &&
    Number(
      property.basePrice
    ) > 0 &&
    (
      property.maxGuests || 0
    ) > 0;

  const entirePropertyAvailable =
    entirePropertyReady &&
    entireCapacityValid &&
    (
      !checked ||
      (
        !entirePropertyBlocked &&
        !entirePropertyBooked &&
        !roomInventoryConflict
      )
    );

  const roomTypes =
    roomBookingSupported
      ? property.roomTypes
          .filter(
            roomIsPublicReady
          )
          .map(
            (roomType) =>
              calculateRoomAvailability(
                property,
                roomType,
                context,
                maps
              )
          )
      : [];

  const availableRoomTypes =
    roomTypes.filter(
      (roomType) =>
        roomType.available
    );

  const roomBookingAvailable =
    roomBookingSupported &&
    availableRoomTypes.length >
      0;

  const availableModes:
    Array<
      | "ENTIRE_PROPERTY"
      | "ROOM_WISE"
    > = [];

  if (
    entirePropertyAvailable
  ) {
    availableModes.push(
      "ENTIRE_PROPERTY"
    );
  }

  if (
    roomBookingAvailable
  ) {
    availableModes.push(
      "ROOM_WISE"
    );
  }

  return {
    checked,

    dateRange:
      dateRange
        ? {
            checkIn:
              dateRange.checkInKey,

            checkOut:
              dateRange.checkOutKey,

            totalNights:
              dateRange.totalNights,
          }
        : null,

    requestedGuests:
      context.guests,

    requestedRooms:
      context.rooms,

    available:
      availableModes.length > 0,

    availableModes,

    entireProperty: {
      supported:
        entirePropertySupported,

      ready:
        entirePropertyReady,

      available:
        entirePropertyAvailable,

      maximumGuests:
        property.maxGuests,

      guestCapacityValid:
        entireCapacityValid,

      propertyBlocked:
        entirePropertyBlocked,

      propertyBooked:
        entirePropertyBooked,

      roomInventoryConflict,

      basePrice:
        toNumber(
          property.basePrice
        ),

      weekendPrice:
        toNumber(
          property.weekendPrice
        ),
    },

    roomBooking: {
      supported:
        roomBookingSupported,

      available:
        roomBookingAvailable,

      availableRoomTypeCount:
        availableRoomTypes.length,

      roomTypes,
    },
  };
};

/*
|--------------------------------------------------------------------------
| Public Amenity Mapper
|--------------------------------------------------------------------------
*/

const mapAmenity = (
  propertyAmenity:
    PublicPropertyRecord["amenities"][number]
) => {
  const amenity =
    propertyAmenity.amenity;

  return {
    id: amenity.id,
    name: amenity.name,
    slug: amenity.slug,
    description:
      amenity.description,
    icon: amenity.icon,
    image: amenity.image,
    group: amenity.group,
  };
};

/*
|--------------------------------------------------------------------------
| Public Room Mapper
|--------------------------------------------------------------------------
*/

const mapRoomType = (
  property:
    PublicPropertyRecord,
  roomType:
    PublicPropertyRecord["roomTypes"][number],
  context: SearchContext,
  maps: AvailabilityMaps
) => {
  const roomAvailability =
    calculateRoomAvailability(
      property,
      roomType,
      context,
      maps
    );

  return {
    id: roomType.id,
    name: roomType.name,
    description:
      roomType.description,

    inventory: {
      totalRooms:
        roomType.totalRooms,

      minimumAvailableRooms:
        roomAvailability
          .minimumAvailableRooms,
    },

    capacity: {
      maxAdults:
        roomType.maxAdults,

      maxChildren:
        roomType.maxChildren,

      maxGuests:
        roomType.maxGuests,

      beds:
        roomType.beds,

      bathrooms:
        roomType.bathrooms,
    },

    pricing: {
      basePrice:
        toNumber(
          roomType.basePrice
        ),

      weekendPrice:
        toNumber(
          roomType.weekendPrice
        ),

      unit:
        "PER_ROOM_PER_NIGHT",

      reservationAmountPerNight:
        toNumber(
          roomType.reservationAmount
        ),
    },

    images:
      roomType.images,

    amenities:
      roomType.amenities.map(
        ({ amenity }) => ({
          id: amenity.id,
          name: amenity.name,
          slug: amenity.slug,
          description:
            amenity.description,
          icon: amenity.icon,
          image: amenity.image,
          group: amenity.group,
        })
      ),

    availability:
      roomAvailability,
  };
};

/*
|--------------------------------------------------------------------------
| Public Listing Mapper
|--------------------------------------------------------------------------
*/

const mapPublicPropertyCard = (
  property:
    PublicPropertyRecord,
  context: SearchContext,
  maps: AvailabilityMaps
) => {
  const startingPrice =
    getStartingPrice(
      property
    );

  const availability =
    calculatePropertyAvailability(
      property,
      context,
      maps
    );

  const coverImage =
    property.images.find(
      (image) =>
        image.isCover
    ) ||
    property.images[0] ||
    null;

  return {
    publicId:
      property.id,

    displayTitle:
      buildPublicDisplayTitle(
        property
      ),

    shortDescription:
      property.shortDescription,

    bookingType:
      property.bookingType,

    isFeatured:
      property.isFeatured,

    category:
      property.category,

    location: {
      area:
        property.locality,

      city:
        property.city,

      state:
        property.state,

      country:
        property.country,

      latitude:
        property.latitude
          ? Number(property.latitude)
          : null,

      longitude:
        property.longitude
          ? Number(property.longitude)
          : null,
    },

    capacity: {
      maxGuests:
        property.maxGuests,

      bedrooms:
        property.bedrooms,

      bathrooms:
        property.bathrooms,

      beds:
        property.beds,

      totalRooms:
        property.totalRooms,
    },

    pricing: {
      startingPrice,

      basePrice:
        supportsEntireProperty(
          property.bookingType
        )
          ? toNumber(
              property.basePrice
            )
          : null,

      currency: "INR",
      unit:
        property.bookingType ===
        PropertyBookingType.ROOM_WISE
          ? "PER_ROOM_PER_NIGHT"
          : "PER_NIGHT",
    },

    coverImage,

    imageCount:
      property.images.length,

    amenityCount:
      property.amenities.length,

    ruleCount:
      property.ruleAssignments.length,

    roomTypeCount:
      property.roomTypes.filter(
        roomIsPublicReady
      ).length,

    rules:
      property.ruleAssignments.map(
        (assignment) => assignment.rule
      ),

    availability,

    createdAt:
      property.createdAt,

    approvedAt:
      property.approvedAt,
  };
};

/*
|--------------------------------------------------------------------------
| Public Detail Mapper
|--------------------------------------------------------------------------
*/

const mapPublicPropertyDetail = (
  property:
    PublicPropertyRecord,
  context: SearchContext,
  maps: AvailabilityMaps
) => {
  const availability =
    calculatePropertyAvailability(
      property,
      context,
      maps
    );

  return {
    publicId:
      property.id,

    displayTitle:
      buildPublicDisplayTitle(
        property
      ),

    shortDescription:
      property.shortDescription,

    description:
      property.description,

    bookingType:
      property.bookingType,

    isFeatured:
      property.isFeatured,

    category:
      property.category,

    /*
    |--------------------------------------------------------------------------
    | Pre-booking Privacy
    |--------------------------------------------------------------------------
    |
    | Not returned:
    |
    | property.title
    | property.slug
    | addressLine1
    | addressLine2
    | landmark
    | postalCode
    | vendor contact information
    |
    */

    location: {
      area:
        property.locality,

      city:
        property.city,

      state:
        property.state,

      country:
        property.country,

      latitude:
        property.latitude
          ? Number(property.latitude)
          : null,

      longitude:
        property.longitude
          ? Number(property.longitude)
          : null,

      exactLocationProtected:
        true,
    },

    capacity: {
      maxGuests:
        property.maxGuests,

      bedrooms:
        property.bedrooms,

      bathrooms:
        property.bathrooms,

      beds:
        property.beds,

      totalRooms:
        property.totalRooms,
    },

    stayInformation: {
      checkInTime:
        property.checkInTime,

      checkOutTime:
        property.checkOutTime,

      minimumStay:
        property.minimumStay,

      instantBook:
        property.instantBook,
    },

    pricing: {
      startingPrice:
        getStartingPrice(
          property
        ),

      entireProperty: {
        basePrice:
          toNumber(
            property.basePrice
          ),

        weekendPrice:
          toNumber(
            property.weekendPrice
          ),

        cleaningFee:
          toNumber(
            property.cleaningFee
          ),

        securityDeposit:
          toNumber(
            property.securityDeposit
          ),

        reservationAmountPerNight:
          toNumber(
            property.reservationAmount
          ),

        unit:
          "PER_NIGHT",
      },

      currency: "INR",
    },

    images:
      property.images,

    amenities:
      property.amenities.map(
        mapAmenity
      ),

    rules:
      property.ruleAssignments.map(
        (assignment) => assignment.rule
      ),

    roomTypes:
      property.roomTypes
        .filter(
          roomIsPublicReady
        )
        .map(
          (roomType) =>
            mapRoomType(
              property,
              roomType,
              context,
              maps
            )
        ),

    availability,

    privacy: {
      exactPropertyNameProtected:
        true,

      fullAddressProtected:
        true,

      mapCoordinatesProtected:
        false,

      vendorContactProtected:
        true,

      revealAfterSuccessfulBooking:
        true,
    },
  };
};

/*
|--------------------------------------------------------------------------
| Apply Price Filter
|--------------------------------------------------------------------------
*/

const propertyMatchesPriceFilter = (
  property: ReturnType<
    typeof mapPublicPropertyCard
  >,
  context: SearchContext
): boolean => {
  const startingPrice =
    property.pricing
      .startingPrice;

  if (
    startingPrice === null
  ) {
    return false;
  }

  if (
    context.minimumPrice !==
      null &&
    startingPrice <
      context.minimumPrice
  ) {
    return false;
  }

  if (
    context.maximumPrice !==
      null &&
    startingPrice >
      context.maximumPrice
  ) {
    return false;
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| Sort Public Properties
|--------------------------------------------------------------------------
*/

const sortPublicProperties = (
  properties: Array<
    ReturnType<
      typeof mapPublicPropertyCard
    >
  >,
  sort: PublicPropertySort
) => {
  const sortedProperties = [
    ...properties,
  ];

  sortedProperties.sort(
    (
      firstProperty,
      secondProperty
    ) => {
      if (
        sort === "PRICE_LOW"
      ) {
        return (
          (
            firstProperty.pricing
              .startingPrice ||
            Number.MAX_SAFE_INTEGER
          ) -
          (
            secondProperty.pricing
              .startingPrice ||
            Number.MAX_SAFE_INTEGER
          )
        );
      }

      if (
        sort === "PRICE_HIGH"
      ) {
        return (
          (
            secondProperty.pricing
              .startingPrice || 0
          ) -
          (
            firstProperty.pricing
              .startingPrice || 0
          )
        );
      }

      if (
        sort === "NEWEST"
      ) {
        return (
          new Date(
            secondProperty.approvedAt ||
              secondProperty.createdAt
          ).getTime() -
          new Date(
            firstProperty.approvedAt ||
              firstProperty.createdAt
          ).getTime()
        );
      }

      if (
        sort === "FEATURED"
      ) {
        return (
          Number(
            secondProperty.isFeatured
          ) -
          Number(
            firstProperty.isFeatured
          )
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Recommended
      |--------------------------------------------------------------------------
      */

      const featuredDifference =
        Number(
          secondProperty.isFeatured
        ) -
        Number(
          firstProperty.isFeatured
        );

      if (
        featuredDifference !== 0
      ) {
        return featuredDifference;
      }

      return (
        new Date(
          secondProperty.approvedAt ||
            secondProperty.createdAt
        ).getTime() -
        new Date(
          firstProperty.approvedAt ||
            firstProperty.createdAt
        ).getTime()
      );
    }
  );

  return sortedProperties;
};

/*
|--------------------------------------------------------------------------
| Find Public Property
|--------------------------------------------------------------------------
*/

const findPublicPropertyById =
  async (
    publicId: string
  ): Promise<
    PublicPropertyRecord | null
  > => {
    if (!publicId) {
      return null;
    }

    return prisma.property.findFirst({
      where: {
        id: publicId,

        status:
          PropertyStatus.APPROVED,

        category: {
          isActive: true,
        },

        images: {
          some: {},
        },

        AND: [
          buildPublicReadinessCondition(),
        ],
      },

      include:
        publicPropertyInclude,
    });
  };

/*
|--------------------------------------------------------------------------
| Public: Property Listing
|--------------------------------------------------------------------------
|
| GET /api/public/properties
|
*/

export const getPublicProperties =
  async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const parsedContext =
        parseSearchContext(req);

      if (
        !parsedContext.success
      ) {
        return res.status(422).json({
          success: false,
          message:
            parsedContext.message,
          errors:
            parsedContext.errors,
        });
      }

      const context =
        parsedContext.value;

      const page =
        parsePositiveInteger(
          req.query.page,
          1,
          100000
        );

      const limit =
        parsePositiveInteger(
          req.query.limit,
          defaultPageSize,
          maximumPageSize
        );

      const sort =
        parseSort(
          req.query.sort
        );

      const properties =
        await prisma.property.findMany({
          where:
            buildPublicPropertyWhere(
              req,
              context
            ),

          orderBy: [
            {
              isFeatured: "desc",
            },
            {
              approvedAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],

          include:
            publicPropertyInclude,
        });

      const availabilityMaps =
        await fetchAvailabilityMaps(
          properties,
          context.dateRange
        );

      let publicProperties =
        properties.map(
          (property) =>
            mapPublicPropertyCard(
              property,
              context,
              availabilityMaps
            )
        );

      publicProperties =
        publicProperties.filter(
          (property) =>
            propertyMatchesPriceFilter(
              property,
              context
            )
        );

      publicProperties =
        sortPublicProperties(
          publicProperties,
          sort
        );

      const total =
        publicProperties.length;

      const totalPages =
        total === 0
          ? 0
          : Math.ceil(
              total / limit
            );

      const offset =
        (page - 1) *
        limit;

      const paginatedProperties =
        publicProperties.slice(
          offset,
          offset + limit
        );

      return res.status(200).json({
        success: true,
        message:
          "Public properties fetched successfully",

        data:
          paginatedProperties,

        pagination: {
          page,
          limit,
          total,
          totalPages,

          hasPreviousPage:
            page > 1,

          hasNextPage:
            totalPages > 0 &&
            page < totalPages,
        },

        filters: {
          search:
            typeof req.query.search ===
            "string"
              ? req.query.search
              : null,

          city:
            typeof req.query.city ===
            "string"
              ? req.query.city
              : null,

          category:
            typeof req.query.category ===
            "string"
              ? req.query.category
              : null,

          bookingType:
            parseBookingType(
              req.query.bookingType
            ),

          featured:
            parseBooleanQuery(
              req.query.featured
            ),

          guests:
            context.guests,

          rooms:
            context.rooms,

          minimumPrice:
            context.minimumPrice,

          maximumPrice:
            context.maximumPrice,

          checkIn:
            context.dateRange
              ?.checkInKey ||
            null,

          checkOut:
            context.dateRange
              ?.checkOutKey ||
            null,

          sort,
        },
      });
    } catch (error) {
      console.error(
        "Get public properties error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch properties",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Public: Property Details
|--------------------------------------------------------------------------
|
| GET /api/public/properties/:identifier
|
| identifier is the public Property ID.
|
*/

export const getPublicPropertyDetails =
  async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const publicId =
        String(
          req.params.identifier ||
            ""
        ).trim();

      if (!publicId) {
        return res.status(422).json({
          success: false,
          message:
            "Property identifier is required",
        });
      }

      const parsedContext =
        parseSearchContext(req);

      if (
        !parsedContext.success
      ) {
        return res.status(422).json({
          success: false,
          message:
            parsedContext.message,
          errors:
            parsedContext.errors,
        });
      }

      const property =
        await findPublicPropertyById(
          publicId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message:
            "Property not found or unavailable",
        });
      }

      const context =
        parsedContext.value;

      const availabilityMaps =
        await fetchAvailabilityMaps(
          [property],
          context.dateRange
        );

      const data =
        mapPublicPropertyDetail(
          property,
          context,
          availabilityMaps
        );

      return res.status(200).json({
        success: true,
        message:
          "Public property details fetched successfully",
        data,
      });
    } catch (error) {
      console.error(
        "Get public property details error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch property details",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Public: Related Properties
|--------------------------------------------------------------------------
|
| GET /api/public/properties/:identifier/related
|
| identifier is the public Property ID.
|
*/

export const getRelatedProperties =
  async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const publicId =
        String(
          req.params.identifier ||
            ""
        ).trim();

      if (!publicId) {
        return res.status(422).json({
          success: false,
          message:
            "Property identifier is required",
        });
      }

      const property =
        await findPublicPropertyById(
          publicId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message:
            "Property not found or unavailable",
        });
      }

      const parsedContext =
        parseSearchContext(req);

      if (
        !parsedContext.success
      ) {
        return res.status(422).json({
          success: false,
          message:
            parsedContext.message,
          errors:
            parsedContext.errors,
        });
      }

      const context =
        parsedContext.value;

      const related =
        await prisma.property.findMany({
          where: {
            AND: [
              {
                id: {
                  not: property.id,
                },
              },
              {
                status: "APPROVED",
              },
              {
                approvedAt: {
                  not: null,
                },
              },
              ...(property.city
                ? [
                    {
                      city: property.city,
                    },
                  ]
                : []),
            ],
          },

          orderBy: [
            {
              isFeatured: "desc",
            },
            {
              approvedAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],

          take: 6,

          include:
            publicPropertyInclude,
        });

      const availabilityMaps =
        await fetchAvailabilityMaps(
          related,
          context.dateRange
        );

      const data = related.map(
        (item) =>
          mapPublicPropertyCard(
            item,
            context,
            availabilityMaps
          )
      );

      return res.status(200).json({
        success: true,
        message:
          "Related properties fetched successfully",
        data,
      });
    } catch (error) {
      console.error(
        "Get related properties error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch related properties",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Public: Check Property Availability
|--------------------------------------------------------------------------
|
| GET /api/public/properties/:identifier/availability
|
| Required:
| checkIn
| checkOut
|
| Optional:
| guests
| rooms
|
*/

export const checkPublicPropertyAvailability =
  async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const publicId =
        String(
          req.params.identifier ||
            ""
        ).trim();

      if (!publicId) {
        return res.status(422).json({
          success: false,
          message:
            "Property identifier is required",
        });
      }

      const parsedContext =
        parseSearchContext(
          req,
          true
        );

      if (
        !parsedContext.success
      ) {
        return res.status(422).json({
          success: false,
          message:
            parsedContext.message,
          errors:
            parsedContext.errors,
        });
      }

      const property =
        await findPublicPropertyById(
          publicId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message:
            "Property not found or unavailable",
        });
      }

      const context =
        parsedContext.value;

      const availabilityMaps =
        await fetchAvailabilityMaps(
          [property],
          context.dateRange
        );

      const availability =
        calculatePropertyAvailability(
          property,
          context,
          availabilityMaps
        );

      const nightlyAvailability =
        context.dateRange
          ? context.dateRange.nights.map(
              (night) => {
                const date =
                  formatDateKey(
                    night
                  );

                const propertyBlocked =
                  (
                    availabilityMaps
                      .propertyBlocks.get(
                        property.id
                      ) ||
                    new Set<string>()
                  ).has(date);

                const entireBooked =
                  (
                    availabilityMaps
                      .entireBookings.get(
                        property.id
                      ) ||
                    new Set<string>()
                  ).has(date);

                return {
                  date,
                  propertyBlocked,
                  entireBooked,

                  roomTypes:
                    property.roomTypes
                      .filter(
                        roomIsPublicReady
                      )
                      .map(
                        (roomType) => {
                          const manuallyBlocked =
                            availabilityMaps
                              .roomBlocks
                              .get(
                                roomType.id
                              )
                              ?.get(
                                date
                            ) ||
                            0;

                          const bookedRooms =
                            availabilityMaps
                              .roomBookings
                              .get(
                                roomType.id
                              )
                              ?.get(
                                date
                              ) ||
                            0;

                          const availableRooms =
                            propertyBlocked ||
                            entireBooked
                              ? 0
                              : Math.max(
                                  roomType.totalRooms -
                                    manuallyBlocked,
                                  0
                                );

                          const availableRoomsAfterBookings =
                            propertyBlocked ||
                            entireBooked
                              ? 0
                              : Math.max(
                                  availableRooms -
                                    bookedRooms,
                                  0
                                );

                          return {
                            roomTypeId:
                              roomType.id,

                            name:
                              roomType.name,

                            totalRooms:
                              roomType.totalRooms,

                            manuallyBlocked,
                            bookedRooms,

                            availableRooms:
                              availableRoomsAfterBookings,
                          };
                        }
                      ),
                };
              }
            )
          : [];

      return res.status(200).json({
        success: true,
        message:
          availability.available
            ? "Property is available for the selected stay"
            : "Property is unavailable for the selected stay",

        data: {
          property: {
            publicId:
              property.id,

            displayTitle:
              buildPublicDisplayTitle(
                property
              ),

            bookingType:
              property.bookingType,

            category:
              property.category,

            location: {
              area:
                property.locality,

              city:
                property.city,

              state:
                property.state,
            },
          },

          availability,

          nightlyAvailability,
        },
      });
    } catch (error) {
      console.error(
        "Check public property availability error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to check property availability",
      });
    }
  };
