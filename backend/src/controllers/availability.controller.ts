import type { Response } from "express";

import {
  PropertyBookingType,
  PropertyStatus,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

/*
|--------------------------------------------------------------------------
| Request Types
|--------------------------------------------------------------------------
*/

type AvailabilityAction =
  | "BLOCK"
  | "UNBLOCK";

interface AvailabilityRangeBody {
  startDate?: unknown;
  endDate?: unknown;
  action?: unknown;
  note?: unknown;
}

interface RoomAvailabilityBody
  extends AvailabilityRangeBody {
  blockedRooms?: unknown;
}

interface ParsedDateRange {
  startDate: Date;
  endDate: Date;
  startDateKey: string;
  endDateKey: string;
  dates: Date[];
}

/*
|--------------------------------------------------------------------------
| Date Constants
|--------------------------------------------------------------------------
*/

const dateOnlyPattern =
  /^\d{4}-\d{2}-\d{2}$/;

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| Booking Type Helpers
|--------------------------------------------------------------------------
*/

const propertySupportsEntireBooking = (
  bookingType: PropertyBookingType
): boolean => {
  return (
    bookingType ===
      PropertyBookingType.ENTIRE_PROPERTY ||
    bookingType ===
      PropertyBookingType.BOTH
  );
};

const propertySupportsRoomBooking = (
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
| Availability Editing Permission
|--------------------------------------------------------------------------
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

const availabilityEditingIsBlocked = (
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
| Format Date Key
|--------------------------------------------------------------------------
*/

const formatDateKey = (
  date: Date
): string => {
  return date
    .toISOString()
    .slice(0, 10);
};

/*
|--------------------------------------------------------------------------
| Parse Date-Only Value
|--------------------------------------------------------------------------
|
| Expected format:
| YYYY-MM-DD
|
| Dates are stored at UTC midnight to avoid accidental time components.
|
*/

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

  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);

  const parsedDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  const dateIsValid =
    parsedDate.getUTCFullYear() ===
      year &&
    parsedDate.getUTCMonth() ===
      month - 1 &&
    parsedDate.getUTCDate() ===
      day;

  return dateIsValid
    ? parsedDate
    : null;
};

/*
|--------------------------------------------------------------------------
| Get Today as Date-Only
|--------------------------------------------------------------------------
*/

const getTodayDateOnly = (): Date => {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
};

/*
|--------------------------------------------------------------------------
| Add Days
|--------------------------------------------------------------------------
*/

const addDays = (
  date: Date,
  days: number
): Date => {
  return new Date(
    date.getTime() +
      days * millisecondsPerDay
  );
};

/*
|--------------------------------------------------------------------------
| Build Inclusive Date Range
|--------------------------------------------------------------------------
*/

const buildDateRange = (
  startDate: Date,
  endDate: Date
): Date[] => {
  const dates: Date[] = [];

  let currentDate = startDate;

  while (
    currentDate.getTime() <=
    endDate.getTime()
  ) {
    dates.push(currentDate);

    currentDate = addDays(
      currentDate,
      1
    );
  }

  return dates;
};

/*
|--------------------------------------------------------------------------
| Parse Date Range
|--------------------------------------------------------------------------
*/

const parseDateRange = (
  startDateValue: unknown,
  endDateValue: unknown,
  maximumDays: number
):
  | {
      success: true;
      value: ParsedDateRange;
    }
  | {
      success: false;
      message: string;
      errors?: Record<
        string,
        string
      >;
    } => {
  const startDate =
    parseDateOnly(startDateValue);

  const endDate =
    parseDateOnly(endDateValue);

  if (!startDate || !endDate) {
    return {
      success: false,
      message:
        "Please provide a valid date range",
      errors: {
        startDate:
          "Start date must use YYYY-MM-DD format.",
        endDate:
          "End date must use YYYY-MM-DD format.",
      },
    };
  }

  if (
    endDate.getTime() <
    startDate.getTime()
  ) {
    return {
      success: false,
      message:
        "End date cannot be before start date",
      errors: {
        endDate:
          "End date must be the same as or later than start date.",
      },
    };
  }

  const rangeDays =
    Math.floor(
      (
        endDate.getTime() -
        startDate.getTime()
      ) /
        millisecondsPerDay
    ) + 1;

  if (rangeDays > maximumDays) {
    return {
      success: false,
      message:
        `A maximum of ${maximumDays} dates can be processed at once`,
    };
  }

  return {
    success: true,

    value: {
      startDate,
      endDate,

      startDateKey:
        formatDateKey(startDate),

      endDateKey:
        formatDateKey(endDate),

      dates: buildDateRange(
        startDate,
        endDate
      ),
    },
  };
};

/*
|--------------------------------------------------------------------------
| Parse Availability Action
|--------------------------------------------------------------------------
*/

const parseAvailabilityAction = (
  value: unknown
): AvailabilityAction | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue =
    value.trim().toUpperCase();

  if (
    normalizedValue === "BLOCK" ||
    normalizedValue === "UNBLOCK"
  ) {
    return normalizedValue;
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| Parse Note
|--------------------------------------------------------------------------
*/

const parseNote = (
  value: unknown
):
  | {
      isValid: true;
      value: string | null;
    }
  | {
      isValid: false;
      message: string;
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

  if (typeof value !== "string") {
    return {
      isValid: false,
      message:
        "Availability note must contain valid text.",
    };
  }

  const cleanedValue =
    value.trim();

  if (
    cleanedValue.length > 300
  ) {
    return {
      isValid: false,
      message:
        "Availability note cannot exceed 300 characters.",
    };
  }

  return {
    isValid: true,
    value:
      cleanedValue || null,
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

        select: {
          id: true,
          image: true,
          altText: true,
          isCover: true,
          sortOrder: true,
        },
      },
    },
  });
};

/*
|--------------------------------------------------------------------------
| Validate Past Dates for Updates
|--------------------------------------------------------------------------
*/

const dateRangeContainsPastDate = (
  range: ParsedDateRange
): boolean => {
  const today =
    getTodayDateOnly();

  return (
    range.startDate.getTime() <
    today.getTime()
  );
};

/*
|--------------------------------------------------------------------------
| Default Calendar Month
|--------------------------------------------------------------------------
*/

const getDefaultCalendarRange = () => {
  const today =
    getTodayDateOnly();

  const monthStart =
    new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        1
      )
    );

  const monthEnd =
    new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        0
      )
    );

  return {
    startDate:
      formatDateKey(monthStart),

    endDate:
      formatDateKey(monthEnd),
  };
};

/*
|--------------------------------------------------------------------------
| Vendor: Get Property Availability Calendar
|--------------------------------------------------------------------------
|
| GET:
|
| /api/vendor/properties/:propertyId/availability
| ?startDate=2026-07-01
| &endDate=2026-07-31
|
*/

export const getVendorAvailability =
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
          message:
            "Property not found",
        });
      }

      const defaultRange =
        getDefaultCalendarRange();

      const requestedStartDate =
        typeof req.query.startDate ===
        "string"
          ? req.query.startDate
          : defaultRange.startDate;

      const requestedEndDate =
        typeof req.query.endDate ===
        "string"
          ? req.query.endDate
          : defaultRange.endDate;

      const parsedRange =
        parseDateRange(
          requestedStartDate,
          requestedEndDate,
          93
        );

      if (!parsedRange.success) {
        return res.status(422).json({
          success: false,
          message:
            parsedRange.message,
          errors:
            parsedRange.errors,
        });
      }

      const {
        startDate,
        endDate,
        startDateKey,
        endDateKey,
      } = parsedRange.value;

      const propertyBlocks =
        propertySupportsEntireBooking(
          property.bookingType
        )
          ? await prisma.propertyAvailabilityBlock.findMany(
              {
                where: {
                  propertyId,

                  date: {
                    gte: startDate,
                    lte: endDate,
                  },
                },

                orderBy: {
                  date: "asc",
                },
              }
            )
          : [];

      const roomTypes =
        propertySupportsRoomBooking(
          property.bookingType
        )
          ? await prisma.roomType.findMany(
              {
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

                select: {
                  id: true,
                  name: true,
                  slug: true,
                  totalRooms: true,
                  maxGuests: true,
                  basePrice: true,
                  weekendPrice: true,
                  isActive: true,
                  sortOrder: true,

                  images: {
                    where: {
                      isCover: true,
                    },

                    orderBy: {
                      sortOrder: "asc",
                    },

                    take: 1,

                    select: {
                      id: true,
                      image: true,
                      altText: true,
                      isCover: true,
                      sortOrder: true,
                    },
                  },

                  availabilityBlocks: {
                    where: {
                      date: {
                        gte:
                          startDate,
                        lte:
                          endDate,
                      },
                    },

                    orderBy: {
                      date: "asc",
                    },
                  },
                },
              }
            )
          : [];

      const propertyBlockedDates =
        propertyBlocks.map(
          (block) =>
            formatDateKey(block.date)
        );

      const roomBlockedEntries =
        roomTypes.reduce(
          (
            total,
            roomType
          ) =>
            total +
            roomType
              .availabilityBlocks
              .length,
          0
        );

      return res.status(200).json({
        success: true,
        message:
          "Availability calendar fetched successfully",

        property,

        data: {
          dateRange: {
            startDate:
              startDateKey,

            endDate:
              endDateKey,
          },

          editable:
            !availabilityEditingIsBlocked(
              property.status
            ),

          propertyBlocks,

          roomTypes,

          summary: {
            propertyBlockedDates:
              propertyBlocks.length,

            roomBlockedEntries,

            completePropertyUnavailableDates:
              property.bookingType ===
              PropertyBookingType.BOTH
                ? new Set([
                    ...propertyBlockedDates,

                    ...roomTypes.flatMap(
                      (roomType) =>
                        roomType
                          .availabilityBlocks
                          .map(
                            (block) =>
                              formatDateKey(
                                block.date
                              )
                          )
                    ),
                  ]).size
                : propertyBlocks.length,
          },
        },
      });
    } catch (error) {
      console.error(
        "Get vendor availability error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch availability calendar",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Block or Unblock Entire Property Dates
|--------------------------------------------------------------------------
|
| PUT:
|
| /api/vendor/properties/:propertyId/availability/property-blocks
|
| Block:
|
| {
|   "startDate": "2026-07-20",
|   "endDate": "2026-07-22",
|   "action": "BLOCK",
|   "note": "Private event"
| }
|
| Unblock:
|
| {
|   "startDate": "2026-07-20",
|   "endDate": "2026-07-22",
|   "action": "UNBLOCK"
| }
|
*/

export const updatePropertyAvailability =
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
          message:
            "Property not found",
        });
      }

      if (
        !propertySupportsEntireBooking(
          property.bookingType
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Complete property availability is available only for ENTIRE_PROPERTY or BOTH booking types",
        });
      }

      if (
        availabilityEditingIsBlocked(
          property.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Availability cannot currently be edited for this property",
        });
      }

      const body =
        req.body as AvailabilityRangeBody;

      const action =
        parseAvailabilityAction(
          body.action
        );

      if (!action) {
        return res.status(422).json({
          success: false,
          message:
            "Please select a valid availability action",
          errors: {
            action:
              "Action must be BLOCK or UNBLOCK.",
          },
        });
      }

      const parsedRange =
        parseDateRange(
          body.startDate,
          body.endDate,
          366
        );

      if (!parsedRange.success) {
        return res.status(422).json({
          success: false,
          message:
            parsedRange.message,
          errors:
            parsedRange.errors,
        });
      }

      if (
        dateRangeContainsPastDate(
          parsedRange.value
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Past dates cannot be updated",
          errors: {
            startDate:
              "Please select today or a future date.",
          },
        });
      }

      const parsedNote =
        parseNote(body.note);

      if (!parsedNote.isValid) {
        return res.status(422).json({
          success: false,
          message:
            parsedNote.message,
          errors: {
            note:
              parsedNote.message,
          },
        });
      }

      const {
        dates,
        startDate,
        endDate,
        startDateKey,
        endDateKey,
      } = parsedRange.value;

      if (action === "BLOCK") {
        const blockQueries =
          dates.map((date) =>
            prisma.propertyAvailabilityBlock.upsert(
              {
                where: {
                  propertyId_date: {
                    propertyId,
                    date,
                  },
                },

                create: {
                  propertyId,
                  date,
                  note:
                    parsedNote.value,
                },

                update: {
                  note:
                    parsedNote.value,
                },
              }
            )
          );

        await prisma.$transaction(
          blockQueries
        );
      } else {
        await prisma.propertyAvailabilityBlock.deleteMany(
          {
            where: {
              propertyId,

              date: {
                gte: startDate,
                lte: endDate,
              },
            },
          }
        );
      }

      const currentBlocks =
        await prisma.propertyAvailabilityBlock.findMany(
          {
            where: {
              propertyId,

              date: {
                gte: startDate,
                lte: endDate,
              },
            },

            orderBy: {
              date: "asc",
            },
          }
        );

      return res.status(200).json({
        success: true,

        message:
          action === "BLOCK"
            ? dates.length === 1
              ? "Property date blocked successfully"
              : `${dates.length} property dates blocked successfully`
            : dates.length === 1
              ? "Property date unblocked successfully"
              : `${dates.length} property dates unblocked successfully`,

        data: {
          action,

          dateRange: {
            startDate:
              startDateKey,

            endDate:
              endDateKey,
          },

          blocks:
            currentBlocks,
        },
      });
    } catch (error) {
      console.error(
        "Update property availability error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update property availability",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Block or Unblock Room Inventory
|--------------------------------------------------------------------------
|
| PUT:
|
| /api/vendor/properties/:propertyId/availability/rooms/:roomTypeId/blocks
|
| Block:
|
| {
|   "startDate": "2026-07-20",
|   "endDate": "2026-07-22",
|   "action": "BLOCK",
|   "blockedRooms": 2,
|   "note": "Maintenance"
| }
|
| Unblock:
|
| {
|   "startDate": "2026-07-20",
|   "endDate": "2026-07-22",
|   "action": "UNBLOCK"
| }
|
*/

export const updateRoomAvailability =
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
          message:
            "Property not found",
        });
      }

      if (
        !propertySupportsRoomBooking(
          property.bookingType
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Room availability is available only for ROOM_WISE or BOTH booking types",
        });
      }

      if (
        availabilityEditingIsBlocked(
          property.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Availability cannot currently be edited for this property",
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
            name: true,
            totalRooms: true,
            isActive: true,
          },
        });

      if (!roomType) {
        return res.status(404).json({
          success: false,
          message:
            "Room type not found",
        });
      }

      if (!roomType.isActive) {
        return res.status(409).json({
          success: false,
          message:
            "Availability cannot be edited for an inactive room type",
        });
      }

      const body =
        req.body as RoomAvailabilityBody;

      const action =
        parseAvailabilityAction(
          body.action
        );

      if (!action) {
        return res.status(422).json({
          success: false,
          message:
            "Please select a valid availability action",
          errors: {
            action:
              "Action must be BLOCK or UNBLOCK.",
          },
        });
      }

      const parsedRange =
        parseDateRange(
          body.startDate,
          body.endDate,
          366
        );

      if (!parsedRange.success) {
        return res.status(422).json({
          success: false,
          message:
            parsedRange.message,
          errors:
            parsedRange.errors,
        });
      }

      if (
        dateRangeContainsPastDate(
          parsedRange.value
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Past dates cannot be updated",
          errors: {
            startDate:
              "Please select today or a future date.",
          },
        });
      }

      const parsedNote =
        parseNote(body.note);

      if (!parsedNote.isValid) {
        return res.status(422).json({
          success: false,
          message:
            parsedNote.message,
          errors: {
            note:
              parsedNote.message,
          },
        });
      }

      let blockedRooms = 0;

      if (action === "BLOCK") {
        blockedRooms =
          Number(
            body.blockedRooms
          );

        if (
          !Number.isInteger(
            blockedRooms
          ) ||
          blockedRooms < 1
        ) {
          return res.status(422).json({
            success: false,
            message:
              "Please enter a valid blocked room quantity",
            errors: {
              blockedRooms:
                "Blocked rooms must be at least 1.",
            },
          });
        }

        if (
          blockedRooms >
          roomType.totalRooms
        ) {
          return res.status(422).json({
            success: false,
            message:
              "Blocked room quantity cannot exceed total room inventory",
            errors: {
              blockedRooms:
                `This room type contains only ${roomType.totalRooms} rooms.`,
            },
          });
        }
      }

      const {
        dates,
        startDate,
        endDate,
        startDateKey,
        endDateKey,
      } = parsedRange.value;

      if (action === "BLOCK") {
        const blockQueries =
          dates.map((date) =>
            prisma.roomAvailabilityBlock.upsert(
              {
                where: {
                  roomTypeId_date: {
                    roomTypeId,
                    date,
                  },
                },

                create: {
                  roomTypeId,
                  date,
                  blockedRooms,
                  note:
                    parsedNote.value,
                },

                update: {
                  blockedRooms,
                  note:
                    parsedNote.value,
                },
              }
            )
          );

        await prisma.$transaction(
          blockQueries
        );
      } else {
        await prisma.roomAvailabilityBlock.deleteMany(
          {
            where: {
              roomTypeId,

              date: {
                gte: startDate,
                lte: endDate,
              },
            },
          }
        );
      }

      const currentBlocks =
        await prisma.roomAvailabilityBlock.findMany(
          {
            where: {
              roomTypeId,

              date: {
                gte: startDate,
                lte: endDate,
              },
            },

            orderBy: {
              date: "asc",
            },
          }
        );

      return res.status(200).json({
        success: true,

        message:
          action === "BLOCK"
            ? blockedRooms ===
              roomType.totalRooms
              ? dates.length === 1
                ? "Room inventory fully blocked for the selected date"
                : `Room inventory fully blocked for ${dates.length} dates`
              : dates.length === 1
                ? `${blockedRooms} room(s) blocked successfully`
                : `${blockedRooms} room(s) blocked across ${dates.length} dates`
            : dates.length === 1
              ? "Room inventory unblocked successfully"
              : `Room inventory unblocked for ${dates.length} dates`,

        roomType,

        data: {
          action,
          blockedRooms,

          dateRange: {
            startDate:
              startDateKey,

            endDate:
              endDateKey,
          },

          blocks:
            currentBlocks,
        },
      });
    } catch (error) {
      console.error(
        "Update room availability error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update room availability",
      });
    }
  };