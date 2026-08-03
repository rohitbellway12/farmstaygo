import type { Response } from "express";

import {
  BookingMode,
  BookingStatus,
  CommissionStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
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
  paymentMethod?: unknown;
}

const dateOnlyPattern =
  /^\d{4}-\d{2}-\d{2}$/;

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

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
      basePrice: true,
      weekendPrice: true,
      cleaningFee: true,
      securityDeposit: true,
      reservationAmount: true,
      checkInTime: true,
      checkOutTime: true,
      minimumStay: true,
      instantBook: true,
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
      basePrice: true,
      weekendPrice: true,
      reservationAmount: true,
    },
  },
  payments: {
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      paymentType: true,
      status: true,
      transactionId: true,
      notes: true,
      createdAt: true,
    },
  },
  commissions: {
    select: {
      id: true,
      bookingAmount: true,
      commissionRate: true,
      commissionAmount: true,
      vendorEarning: true,
      status: true,
      createdAt: true,
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

      const paymentMethod =
        typeof body.paymentMethod ===
        "string"
          ? body.paymentMethod
              .trim()
              .toUpperCase()
          : null;

      const validPaymentMethods = [
        PaymentMethod.ONLINE,
        PaymentMethod.CASH,
        PaymentMethod.BANK_TRANSFER,
      ];

      if (
        paymentMethod &&
        !validPaymentMethods.includes(
          paymentMethod as PaymentMethod
        )
      ) {
        errors.paymentMethod =
          "Invalid payment method.";
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
            ...activeAvailabilityBookingWhere,
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

            const estimatedTotalValue =
              Number(property.basePrice) *
              nights.length;

            const vendor =
              await transaction.vendor.findFirst(
                {
                  where: {
                    properties: {
                      some: {
                        id: propertyId,
                      },
                    },
                  },
                  select: {
                    commissionRate: true,
                  },
                }
              );

            const commissionRate =
              vendor?.commissionRate
                ? Number(
                    vendor.commissionRate
                  )
                : 0;

            const adminCommissionValue =
              estimatedTotalValue *
              (commissionRate / 100);

            const vendorCommissionValue =
              estimatedTotalValue -
              adminCommissionValue;

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
                    estimatedTotalValue,
                  reservationAmount:
                    property.reservationAmount
                      ? Number(
                          property.reservationAmount
                        ) * nights.length
                      : null,
                  adminCommission:
                    new Prisma.Decimal(
                      adminCommissionValue
                    ),
                  vendorCommission:
                    new Prisma.Decimal(
                      vendorCommissionValue
                    ),
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
                    customer
                      .mobile,
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
                  ...activeAvailabilityBookingWhere,
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

            const estimatedTotalValue =
              Number(roomType.basePrice) *
              rooms *
              nights.length;

            const vendor =
              await transaction.vendor.findFirst(
                {
                  where: {
                    properties: {
                      some: {
                        id: propertyId,
                      },
                    },
                  },
                  select: {
                    commissionRate: true,
                  },
                }
              );

            const commissionRate =
              vendor?.commissionRate
                ? Number(
                    vendor.commissionRate
                  )
                : 0;

            const adminCommissionValue =
              estimatedTotalValue *
              (commissionRate / 100);

            const vendorCommissionValue =
              estimatedTotalValue -
              adminCommissionValue;

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
                    estimatedTotalValue,
                  reservationAmount:
                    roomType.reservationAmount
                      ? Number(
                          roomType.reservationAmount
                        ) * rooms *
                        nights.length
                      : property.reservationAmount
                        ? Number(
                            property.reservationAmount
                          ) * rooms *
                          nights.length
                        : null,
                  adminCommission:
                    new Prisma.Decimal(
                      adminCommissionValue
                    ),
                  vendorCommission:
                    new Prisma.Decimal(
                      vendorCommissionValue
                    ),
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
                    customer
                      .mobile,
                  specialRequest,
                },
              }
            );
        }
      );

      if (
        paymentMethod &&
        booking.reservationAmount &&
        Number(booking.reservationAmount) > 0
      ) {
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: new Prisma.Decimal(
              booking.reservationAmount
            ),
            paymentMethod:
              paymentMethod as PaymentMethod,
            paymentType: PaymentType.RESERVATION,
            status: PaymentStatus.COMPLETED,
          },
        });

        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            paymentStatus: "PAID",
          },
        });
      }

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

const ensureVendorForBooking = async (
  userId: number
): Promise<number> => {
  const vendor =
    await prisma.vendor.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

  if (!vendor) {
    throw new Error(
      "VENDOR_NOT_FOUND"
    );
  }

  return vendor.id;
};

export const acceptBooking = async (
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

    const vendorId =
      await ensureVendorForBooking(
        req.user.id
      );

    const bookingId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    if (!bookingId) {
      return res.status(422).json({
        success: false,
        message:
          "Booking ID is required",
      });
    }

    const booking =
      await prisma.booking.findFirst({
        where: {
          id: bookingId,
          property: {
            vendorId,
          },
        },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    if (booking.status !== BookingStatus.REQUESTED) {
      return res.status(409).json({
        success: false,
        message:
          "Only requested bookings can be accepted",
      });
    }

    const updated =
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.CONFIRMED,
          acceptedAt: new Date(),
        },
        include: bookingListInclude,
      });

    return res.json({
      success: true,
      message:
        "Booking accepted successfully",
      data: updated,
    });
  } catch (error) {
    console.error(
      "Accept booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to accept booking",
    });
  }
};

export const rejectBooking = async (
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

    const vendorId =
      await ensureVendorForBooking(
        req.user.id
      );

    const bookingId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    const body =
      req.body as {
        reason?: unknown;
      };

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : null;

    if (!bookingId) {
      return res.status(422).json({
        success: false,
        message:
          "Booking ID is required",
      });
    }

    const booking =
      await prisma.booking.findFirst({
        where: {
          id: bookingId,
          property: {
            vendorId,
          },
        },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    if (booking.status !== BookingStatus.REQUESTED) {
      return res.status(409).json({
        success: false,
        message:
          "Only requested bookings can be rejected",
      });
    }

    const updated =
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.REJECTED,
          rejectedAt: new Date(),
        },
        include: bookingListInclude,
      });

    return res.json({
      success: true,
      message:
        "Booking rejected successfully",
      data: updated,
    });
  } catch (error) {
    console.error(
      "Reject booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reject booking",
    });
  }
};

export const recordPayment = async (
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

    const bookingId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    if (!bookingId) {
      return res.status(422).json({
        success: false,
        message:
          "Booking ID is required",
      });
    }

    const body =
      req.body as {
        amount?: unknown;
        paymentMethod?: unknown;
        paymentType?: unknown;
        transactionId?: unknown;
        notes?: unknown;
      };

    const amount =
      typeof body.amount === "number"
        ? body.amount
        : Number(body.amount);

    const paymentMethod =
      typeof body.paymentMethod === "string"
        ? body.paymentMethod.trim().toUpperCase()
        : null;

    const paymentType =
      typeof body.paymentType === "string"
        ? body.paymentType.trim().toUpperCase()
        : null;

    const transactionId =
      typeof body.transactionId === "string"
        ? body.transactionId.trim() || null
        : null;

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim() || null
        : null;

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(422).json({
        success: false,
        message:
          "A valid payment amount is required",
      });
    }

    const validMethods = [
      PaymentMethod.ONLINE,
      PaymentMethod.CASH,
      PaymentMethod.BANK_TRANSFER,
    ];

    const validTypes = [
      PaymentType.RESERVATION,
      PaymentType.INSTALLMENT,
      PaymentType.BALANCE,
      PaymentType.REFUND,
    ];

    if (
      !paymentMethod ||
      !validMethods.includes(
        paymentMethod as PaymentMethod
      )
    ) {
      return res.status(422).json({
        success: false,
        message:
          "A valid payment method is required",
        errors: {
          paymentMethod:
            "Select online, cash or bank transfer",
        },
      });
    }

    if (
      !paymentType ||
      !validTypes.includes(
        paymentType as PaymentType
      )
    ) {
      return res.status(422).json({
        success: false,
        message:
          "A valid payment type is required",
        errors: {
          paymentType:
            "Select reservation, installment, balance or refund",
        },
      });
    }

    const booking =
      await prisma.booking.findFirst({
        where: {
          id: bookingId,
          OR: [
            {
              userId: req.user.id,
            },
            {
              property: {
                vendor: {
                  userId: req.user.id,
                },
              },
            },
          ],
        },
        include: {
          payments: true,
        },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    if (
      booking.status ===
        BookingStatus.CANCELLED ||
      booking.status === BookingStatus.REJECTED
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Payments cannot be recorded for cancelled or rejected bookings",
      });
    }

    const payment =
      await prisma.payment.create({
        data: {
          bookingId,
          amount: new Prisma.Decimal(amount),
          paymentMethod:
            paymentMethod as PaymentMethod,
          paymentType:
            paymentType as PaymentType,
          status: PaymentStatus.COMPLETED,
          transactionId,
          notes,
        },
      });

    const totalPaid =
      booking.payments
        .filter(
          (p) =>
            p.status ===
              PaymentStatus.COMPLETED &&
            p.paymentType !==
              PaymentType.REFUND
        )
        .reduce(
          (sum, p) =>
            sum.plus(p.amount),
          new Prisma.Decimal(0)
        )
        .plus(new Prisma.Decimal(amount));

    const total =
      booking.estimatedTotal
        ? new Prisma.Decimal(
            booking.estimatedTotal
          )
        : null;

    let paymentStatus = "PENDING";

    if (total && totalPaid.gte(total)) {
      paymentStatus = "PAID";
    } else if (totalPaid.gt(0)) {
      paymentStatus = "PARTIAL";
    }

    const reservationThreshold =
      booking.reservationAmount
        ? new Prisma.Decimal(
            booking.reservationAmount
          )
        : null;

    if (
      reservationThreshold &&
      totalPaid.gte(reservationThreshold) &&
      booking.status ===
        BookingStatus.REQUESTED
    ) {
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.CONFIRMED,
          paymentStatus,
          acceptedAt: new Date(),
        },
      });
    } else {
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          paymentStatus,
        },
      });
    }

    const updatedBooking =
      await prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: bookingListInclude,
      });

    const populatedPayment =
      await prisma.payment.findUnique({
        where: {
          id: payment.id,
        },
      });

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: populatedPayment,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error(
      "Record payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to record payment",
    });
  }
};

export const getBookingPayments = async (
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

    const bookingId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    if (!bookingId) {
      return res.status(422).json({
        success: false,
        message:
          "Booking ID is required",
      });
    }

    const booking =
      await prisma.booking.findFirst({
        where: {
          id: bookingId,
          OR: [
            {
              userId: req.user.id,
            },
            {
              property: {
                vendor: {
                  userId: req.user.id,
                },
              },
            },
          ],
        },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    const payments =
      await prisma.payment.findMany({
        where: {
          bookingId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const totalPaid = payments
      .filter(
        (p) =>
          p.status ===
            PaymentStatus.COMPLETED &&
          p.paymentType !== PaymentType.REFUND
      )
      .reduce(
        (sum, p) => sum.plus(p.amount),
        new Prisma.Decimal(0)
      );

    const totalRefunded = payments
      .filter(
        (p) =>
          p.status ===
            PaymentStatus.COMPLETED &&
          p.paymentType === PaymentType.REFUND
      )
      .reduce(
        (sum, p) => sum.plus(p.amount),
        new Prisma.Decimal(0)
      );

    const total =
      booking.estimatedTotal
        ? new Prisma.Decimal(
            booking.estimatedTotal
          )
        : null;

    const balance =
      total && totalPaid.gte(total)
        ? new Prisma.Decimal(0)
        : total
          ? total.minus(totalPaid)
          : null;

    return res.json({
      success: true,
      message: "Payments fetched successfully",
      data: payments,
      summary: {
        totalPaid: totalPaid.toNumber(),
        totalRefunded:
          totalRefunded.toNumber(),
        estimatedTotal:
          total ? total.toNumber() : null,
        balance: balance
          ? balance.toNumber()
          : null,
        reservationAmount:
          booking.reservationAmount
            ? new Prisma.Decimal(
                booking.reservationAmount
              ).toNumber()
            : null,
        paymentStatus:
          booking.paymentStatus,
      },
    });
  } catch (error) {
    console.error(
      "Get booking payments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load payments",
    });
  }
};
