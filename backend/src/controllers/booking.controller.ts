import type { Response } from "express";

import {
  BookingMode,
  BookingStatus,
  Prisma,
  PropertyBookingType,
  PropertyStatus,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

interface CreateBookingBody {
  propertyId?: unknown;
  bookingMode?: unknown;
  roomTypeId?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  guests?: unknown;
  rooms?: unknown;
  specialRequest?: unknown;
}

const dateOnlyPattern =
  /^\d{4}-\d{2}-\d{2}$/;

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

const activeBookingStatuses = [
  BookingStatus.REQUESTED,
  BookingStatus.CONFIRMED,
] as const;

const parseDateOnly = (
  value: unknown
): Date | null => {
  if (
    typeof value !== "string" ||
    !dateOnlyPattern.test(value)
  ) {
    return null;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
};

const formatDateKey = (
  date: Date
): string => {
  return date
    .toISOString()
    .slice(0, 10);
};

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

const buildNights = (
  checkIn: Date,
  checkOut: Date
): Date[] => {
  const nights: Date[] = [];
  let currentDate = checkIn;

  while (
    currentDate.getTime() <
    checkOut.getTime()
  ) {
    nights.push(currentDate);
    currentDate = new Date(
      currentDate.getTime() +
        millisecondsPerDay
    );
  }

  return nights;
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number
): number => {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
};

const propertySupportsMode = (
  bookingType: PropertyBookingType,
  bookingMode: BookingMode
): boolean => {
  if (
    bookingMode ===
    BookingMode.ENTIRE_PROPERTY
  ) {
    return (
      bookingType ===
        PropertyBookingType.ENTIRE_PROPERTY ||
      bookingType ===
        PropertyBookingType.BOTH
    );
  }

  return (
    bookingType ===
      PropertyBookingType.ROOM_WISE ||
    bookingType ===
      PropertyBookingType.BOTH
  );
};

const parseBookingMode = (
  value: unknown
): BookingMode | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim().toUpperCase();

  return Object.values(BookingMode).includes(
    normalized as BookingMode
  )
    ? (normalized as BookingMode)
    : null;
};

const parseOptionalText = (
  value: unknown,
  maximumLength: number
): string | null | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();

  if (cleaned.length > maximumLength) {
    return undefined;
  }

  return cleaned || null;
};

const nightsOverlapWhere = (
  checkIn: Date,
  checkOut: Date
) => ({
  checkIn: {
    lt: checkOut,
  },
  checkOut: {
    gt: checkIn,
  },
});

const bookingListInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      mobile: true,
    },
  },
  property: {
    select: {
      id: true,
      title: true,
      bookingType: true,
      city: true,
      state: true,
      country: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      images: {
        orderBy: [
          {
            isCover: Prisma.SortOrder.desc,
          },
          {
            sortOrder: Prisma.SortOrder.asc,
          },
        ],
        take: 1,
        select: {
          id: true,
          image: true,
          altText: true,
          isCover: true,
          sortOrder: true,
        },
      },
      vendor: {
        select: {
          id: true,
          businessName: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobile: true,
            },
          },
        },
      },
    },
  },
  roomType: {
    select: {
      id: true,
      name: true,
      totalRooms: true,
    },
  },
} satisfies Prisma.BookingInclude;

export const createBookingRequest =
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

      if (req.user.role !== "USER") {
        return res.status(403).json({
          success: false,
          message:
            "Only customer accounts can request bookings",
        });
      }

      const body =
        req.body as CreateBookingBody;

      const customer =
        await prisma.user.findFirst({
          where: {
            id: req.user.id,
            role: "USER",
            status: "ACTIVE",
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
          },
        });

      if (!customer) {
        return res.status(403).json({
          success: false,
          message:
            "Customer account is not active",
        });
      }

      const propertyId =
        typeof body.propertyId === "string"
          ? body.propertyId.trim()
          : "";

      const bookingMode =
        parseBookingMode(
          body.bookingMode
        );

      const checkIn =
        parseDateOnly(body.checkIn);

      const checkOut =
        parseDateOnly(body.checkOut);

      const guests =
        parsePositiveInteger(
          body.guests,
          1
        );

      const rooms =
        parsePositiveInteger(
          body.rooms,
          1
        );

      const errors: Record<
        string,
        string
      > = {};

      if (!propertyId) {
        errors.propertyId =
          "Property is required.";
      }

      if (!bookingMode) {
        errors.bookingMode =
          "Please select a valid booking option.";
      }

      if (!checkIn) {
        errors.checkIn =
          "Please select a valid check-in date.";
      }

      if (!checkOut) {
        errors.checkOut =
          "Please select a valid check-out date.";
      }

      if (
        checkIn &&
        checkOut &&
        checkOut.getTime() <=
          checkIn.getTime()
      ) {
        errors.checkOut =
          "Check-out must be after check-in.";
      }

      if (
        checkIn &&
        checkIn.getTime() <
          getTodayDateOnly().getTime()
      ) {
        errors.checkIn =
          "Check-in cannot be in the past.";
      }

      const specialRequest =
        parseOptionalText(
          body.specialRequest,
          500
        );

      if (
        specialRequest === undefined
      ) {
        errors.specialRequest =
          "Special request must be valid text up to 500 characters.";
      }

      if (
        Object.keys(errors).length > 0 ||
        !checkIn ||
        !checkOut ||
        !bookingMode
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please correct the booking information",
          errors,
        });
      }

      const nights =
        buildNights(
          checkIn,
          checkOut
        );

      if (nights.length > 60) {
        return res.status(422).json({
          success: false,
          message:
            "A booking cannot exceed 60 nights",
        });
      }

      const booking = await prisma.$transaction(
        async (transaction) => {
          await transaction.$executeRaw`
            SELECT pg_advisory_xact_lock(hashtext(${propertyId}))
          `;

          const property =
            await transaction.property.findFirst(
              {
                where: {
                  id: propertyId,
                  status:
                    PropertyStatus.APPROVED,
                  category: {
                    isActive: true,
                  },
                },

                include: {
                  roomTypes: {
                    include: {
                      images: true,
                    },
                  },
                },
              }
            );

          if (!property) {
            throw new Error(
              "PROPERTY_UNAVAILABLE"
            );
          }

          if (
            !propertySupportsMode(
              property.bookingType,
              bookingMode
            )
          ) {
            throw new Error(
              "BOOKING_MODE_UNSUPPORTED"
            );
          }

          const propertyBlocks =
            await transaction.propertyAvailabilityBlock.count(
              {
                where: {
                  propertyId,
                  date: {
                    in: nights,
                  },
                },
              }
            );

          if (propertyBlocks > 0) {
            throw new Error(
              "PROPERTY_BLOCKED"
            );
          }

          const activeOverlapWhere = {
            propertyId,
            status: {
              in: [
                ...activeBookingStatuses,
              ],
            },
            ...nightsOverlapWhere(
              checkIn,
              checkOut
            ),
          };

          if (
            bookingMode ===
            BookingMode.ENTIRE_PROPERTY
          ) {
            if (
              (property.maxGuests || 0) <
              guests
            ) {
              throw new Error(
                "GUEST_CAPACITY_EXCEEDED"
              );
            }

            const conflictingBookings =
              await transaction.booking.count(
                {
                  where:
                    activeOverlapWhere,
                }
              );

            if (
              conflictingBookings > 0
            ) {
              throw new Error(
                "BOOKING_CONFLICT"
              );
            }

            const roomTypeIds =
              property.roomTypes.map(
                (roomType) =>
                  roomType.id
              );

            if (
              roomTypeIds.length > 0
            ) {
              const roomBlocks =
                await transaction.roomAvailabilityBlock.count(
                  {
                    where: {
                      roomTypeId: {
                        in: roomTypeIds,
                      },
                      date: {
                        in: nights,
                      },
                      blockedRooms: {
                        gt: 0,
                      },
                    },
                  }
                );

              if (roomBlocks > 0) {
                throw new Error(
                  "ROOM_INVENTORY_CONFLICT"
                );
              }
            }

            return transaction.booking.create(
              {
                data: {
                  userId:
                    customer.id,
                  propertyId,
                  bookingMode,
                  checkIn,
                  checkOut,
                  guests,
                  rooms: 1,
                  totalNights:
                    nights.length,
                  estimatedTotal:
                    Number(
                      property.basePrice
                    ) *
                    nights.length,
                  guestName:
                    [
                      customer.firstName,
                      customer.lastName,
                    ]
                      .filter(Boolean)
                      .join(" "),
                  guestEmail:
                    customer.email,
                  guestMobile:
                    customer.mobile,
                  specialRequest,
                },
              }
            );
          }

          const roomTypeId =
            typeof body.roomTypeId ===
            "string"
              ? body.roomTypeId.trim()
              : "";

          if (!roomTypeId) {
            throw new Error(
              "ROOM_TYPE_REQUIRED"
            );
          }

          const roomType =
            property.roomTypes.find(
              (room) =>
                room.id === roomTypeId
            );

          if (
            !roomType ||
            !roomType.isActive ||
            roomType.totalRooms < 1 ||
            Number(roomType.basePrice) <=
              0 ||
            roomType.images.length === 0
          ) {
            throw new Error(
              "ROOM_TYPE_UNAVAILABLE"
            );
          }

          const guestsPerRoom =
            Math.ceil(
              guests / rooms
            );

          if (
            roomType.maxGuests <
            guestsPerRoom
          ) {
            throw new Error(
              "ROOM_GUEST_CAPACITY_EXCEEDED"
            );
          }

          const fullPropertyBookings =
            await transaction.booking.count(
              {
                where: {
                  ...activeOverlapWhere,
                  bookingMode:
                    BookingMode.ENTIRE_PROPERTY,
                },
              }
            );

          if (fullPropertyBookings > 0) {
            throw new Error(
              "FULL_PROPERTY_CONFLICT"
            );
          }

          const roomBlocks =
            await transaction.roomAvailabilityBlock.findMany(
              {
                where: {
                  roomTypeId,
                  date: {
                    in: nights,
                  },
                },
                select: {
                  date: true,
                  blockedRooms: true,
                },
              }
            );

          const roomBookings =
            await transaction.booking.findMany(
              {
                where: {
                  roomTypeId,
                  status: {
                    in: [
                      ...activeBookingStatuses,
                    ],
                  },
                  ...nightsOverlapWhere(
                    checkIn,
                    checkOut
                  ),
                },
                select: {
                  checkIn: true,
                  checkOut: true,
                  rooms: true,
                },
              }
            );

          const blockedByDate =
            new Map<string, number>();

          roomBlocks.forEach(
            (block) => {
              blockedByDate.set(
                formatDateKey(
                  block.date
                ),
                block.blockedRooms
              );
            }
          );

          const bookedByDate =
            new Map<string, number>();

          roomBookings.forEach(
            (existingBooking) => {
              buildNights(
                existingBooking.checkIn,
                existingBooking.checkOut
              ).forEach((night) => {
                const key =
                  formatDateKey(night);

                bookedByDate.set(
                  key,
                  (bookedByDate.get(
                    key
                  ) || 0) +
                    existingBooking.rooms
                );
              });
            }
          );

          const minimumAvailableRooms =
            nights.reduce(
              (minimum, night) => {
                const key =
                  formatDateKey(night);

                const available =
                  roomType.totalRooms -
                  (blockedByDate.get(key) ||
                    0) -
                  (bookedByDate.get(key) ||
                    0);

                return Math.min(
                  minimum,
                  available
                );
              },
              roomType.totalRooms
            );

          if (
            minimumAvailableRooms <
            rooms
          ) {
            throw new Error(
              "ROOM_INVENTORY_EXCEEDED"
            );
          }

          return transaction.booking.create(
            {
              data: {
                userId:
                  customer.id,
                propertyId,
                roomTypeId,
                bookingMode,
                checkIn,
                checkOut,
                guests,
                rooms,
                totalNights:
                  nights.length,
                estimatedTotal:
                  Number(
                    roomType.basePrice
                  ) *
                  rooms *
                  nights.length,
                guestName:
                  [
                    customer.firstName,
                    customer.lastName,
                  ]
                    .filter(Boolean)
                    .join(" "),
                guestEmail:
                  customer.email,
                guestMobile:
                  customer.mobile,
                specialRequest,
              },
            }
          );
        }
      );

      return res.status(201).json({
        success: true,
        message:
          "Booking request submitted successfully",
        data: booking,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "";

      const conflictMessages:
        Record<string, string> = {
        PROPERTY_UNAVAILABLE:
          "This property is not available for booking.",
        BOOKING_MODE_UNSUPPORTED:
          "This property does not support the selected booking option.",
        PROPERTY_BLOCKED:
          "The selected dates are blocked by the vendor.",
        GUEST_CAPACITY_EXCEEDED:
          "Guest count exceeds the property capacity.",
        BOOKING_CONFLICT:
          "The selected dates already have a booking request.",
        ROOM_INVENTORY_CONFLICT:
          "Room inventory is blocked on one or more selected dates, so full-property booking is not available.",
        ROOM_TYPE_REQUIRED:
          "Please select a room type.",
        ROOM_TYPE_UNAVAILABLE:
          "The selected room type is unavailable.",
        ROOM_GUEST_CAPACITY_EXCEEDED:
          "Guest count exceeds the selected room capacity.",
        FULL_PROPERTY_CONFLICT:
          "The full property is already booked or requested for the selected dates.",
        ROOM_INVENTORY_EXCEEDED:
          "Selected room quantity is no longer available for these dates.",
      };

      if (conflictMessages[message]) {
        return res.status(409).json({
          success: false,
          message:
            conflictMessages[message],
        });
      }

      console.error(
        "Create booking request error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to submit booking request",
      });
    }
  };

export const getMyBookings = async (
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

    if (req.user.role !== "USER") {
      return res.status(403).json({
        success: false,
        message:
          "Only customer accounts can view their bookings",
      });
    }

    const bookings =
      await prisma.booking.findMany({
        where: {
          userId: req.user.id,
        },
        include: bookingListInclude,
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error(
      "Get my bookings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load bookings",
    });
  }
};

export const getVendorBookings = async (
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

    const vendor =
      await prisma.vendor.findUnique({
        where: {
          userId: req.user.id,
        },
        select: {
          id: true,
        },
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor profile was not found",
      });
    }

    const bookings =
      await prisma.booking.findMany({
        where: {
          property: {
            vendorId: vendor.id,
          },
        },
        include: bookingListInclude,
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error(
      "Get vendor bookings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load vendor bookings",
    });
  }
};

export const getAdminBookings = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const bookings =
      await prisma.booking.findMany({
        include: bookingListInclude,
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error(
      "Get admin bookings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load admin bookings",
    });
  }
};
