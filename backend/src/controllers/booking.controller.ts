import type { Response } from "express";

import crypto from "crypto";

import {
  BookingMode,
  BookingStatus,
  CommissionStatus,
  NotificationRecipientType,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Prisma,
  PropertyBookingType,
  PropertyStatus,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import {
  getRazorpaySettings,
  isRazorpayPaymentAlreadyUsed,
  refundRazorpayPayment,
} from "../controllers/payment-gateway.controller.js";

import {
  sendBookingConfirmationEmail,
} from "../services/email.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const getEnabledPaymentMethods = async (): Promise<string[]> => {
  const setting = await prisma.setting.findUnique({
    where: { key: "payment_methods" },
    select: { value: true },
  });

  const rawValue = setting?.value;

  if (typeof rawValue === "string" && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);

      if (Array.isArray(parsed)) {
        const valid = parsed.filter(
          (method): method is string =>
            typeof method === "string" &&
            ["ONLINE", "CASH", "BANK_TRANSFER"].includes(
              method.toUpperCase()
            )
        );

        if (valid.length > 0) {
          return valid.map((m) => m.toUpperCase());
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return ["ONLINE"];
};

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

interface CreateBookingWithPaymentBody
  extends CreateBookingBody {
  paymentVerification?: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    amount: number;
    sandbox?: boolean;
  };
}

const dateOnlyPattern =
  /^\d{4}-\d{2}-\d{2}$/;

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

// A freshly created booking request acts as a short automatic hold so
// that a second user cannot open Razorpay for the same slot. The hold
// expires after this window, freeing the slot if payment is never made.
const BOOKING_HOLD_MINUTES = 15;

const getActiveAvailabilityBookingWhere =
  (): Prisma.BookingWhereInput => {
    const holdCutoff = new Date(
      Date.now() - BOOKING_HOLD_MINUTES * 60 * 1000
    );

    return {
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
            {
              // Recent request = temporary hold on the slot.
              createdAt: {
                gte: holdCutoff,
              },
            },
          ],
        },
      ],
    } satisfies Prisma.BookingWhereInput;
  };

// An unpaid deposit "hold" is a temporary slot reservation created before
// the customer pays online. It must NOT appear in any booking list (user,
// vendor or admin) — only once it is actually paid does it become a real
// booking. This only applies to ONLINE holds; CASH and BANK_TRANSFER
// bookings are real requests and must stay visible to the vendor.
export const UNPAID_HOLD_EXCLUSION: Prisma.BookingWhereInput = {
  NOT: {
    status: BookingStatus.REQUESTED,
    paymentStatus: "PENDING",
    paymentMethod: "ONLINE",
    reservationAmount: {
      gt: 0,
    },
    payments: {
      none: {},
    },
  },
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

interface BookingQuoteInput {
  propertyId: string;
  bookingMode: BookingMode;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
  totalNights: number;
  specialRequest: string | null;
  paymentMethod: PaymentMethod | null;
  roomTypeId?: string;
}

interface BookingQuoteResult {
  propertyId: string;
  bookingMode: BookingMode;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
  totalNights: number;
  estimatedTotal: number;
  reservationAmount: number | null;
  currency: string;
  roomTypeId?: string;
  commissionRate: number;
  vendorId?: number;
}

const validateBookingInput = (
  body: CreateBookingBody
): BookingQuoteInput => {
  const propertyId =
    typeof body.propertyId === "string"
      ? body.propertyId.trim()
      : "";

  const bookingMode = parseBookingMode(
    body.bookingMode
  );

  const checkIn = parseDateOnly(body.checkIn);

  const checkOut = parseDateOnly(body.checkOut);

  const guests = parsePositiveInteger(
    body.guests,
    1
  );

  const rooms = parsePositiveInteger(
    body.rooms,
    1
  );

  const roomTypeId =
    typeof body.roomTypeId === "string"
      ? body.roomTypeId.trim()
      : "";

  const specialRequest = parseOptionalText(
    body.specialRequest,
    500
  );

  const paymentMethod =
    typeof body.paymentMethod === "string"
      ? (body.paymentMethod
          .trim()
          .toUpperCase() as PaymentMethod)
      : null;

  const errors: Record<string, string> =
    {};

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
    checkOut.getTime() <= checkIn.getTime()
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

  if (specialRequest === undefined) {
    errors.specialRequest =
      "Special request must be valid text up to 500 characters.";
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error(
      "VALIDATION_ERROR"
    ) as Error & {
      errors: Record<string, string>;
    };
    error.errors = errors;
    throw error;
  }

  const nights = buildNights(checkIn!, checkOut!);

  if (nights.length > 60) {
    throw new Error(
      "MAX_NIGHTS_EXCEEDED"
    );
  }

  return {
    propertyId,
    bookingMode: bookingMode!,
    checkIn: checkIn!,
    checkOut: checkOut!,
    guests,
    rooms,
    totalNights: nights.length,
    specialRequest:
      specialRequest || null,
    paymentMethod,
    roomTypeId,
  };
};

const getBookingQuote = async (
  input: BookingQuoteInput,
  excludeUserId?: number
): Promise<BookingQuoteResult> => {
  const {
    propertyId,
    bookingMode,
    checkIn,
    checkOut,
    guests,
    rooms,
    roomTypeId,
  } = input;

  const nights = buildNights(checkIn, checkOut);

  return await prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${propertyId}))
      `;

      const property =
        await transaction.property.findFirst(
          {
            where: {
              id: propertyId,
              status: PropertyStatus.APPROVED,
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
        ...(excludeUserId
          ? { userId: { not: excludeUserId } }
          : {}),
        ...getActiveAvailabilityBookingWhere(),
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
              where: activeOverlapWhere,
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
            (roomType) => roomType.id
          );

        if (roomTypeIds.length > 0) {
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

        const reservationAmountValue =
          property.reservationAmount
            ? Number(
                property.reservationAmount
              ) * nights.length
            : null;

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
                id: true,
                commissionRate: true,
              },
            }
          );

        return {
          propertyId,
          bookingMode,
          checkIn,
          checkOut,
          guests,
          rooms: 1,
          totalNights: nights.length,
          estimatedTotal:
            estimatedTotalValue,
          reservationAmount:
            reservationAmountValue,
          currency: "INR",
          commissionRate:
            vendor?.commissionRate
              ? Number(vendor.commissionRate)
              : 0,
          vendorId: vendor?.id,
        };
      }

      if (!roomTypeId) {
        throw new Error(
          "ROOM_TYPE_REQUIRED"
        );
      }

      const roomType =
        property.roomTypes.find(
          (room) => room.id === roomTypeId
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

      const guestsPerRoom = Math.ceil(
        guests / rooms
      );

      if (
        roomType.maxGuests < guestsPerRoom
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
                ...(excludeUserId
                  ? { userId: { not: excludeUserId } }
                  : {}),
                ...getActiveAvailabilityBookingWhere(),
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

      const blockedByDate = new Map<
        string,
        number
      >();

      roomBlocks.forEach((block) => {
        blockedByDate.set(
          formatDateKey(block.date),
          block.blockedRooms
        );
      });

      const bookedByDate = new Map<
        string,
        number
      >();

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
              (bookedByDate.get(key) ||
                0) +
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
              (blockedByDate.get(key) || 0) -
              (bookedByDate.get(key) || 0);

            return Math.min(
              minimum,
              available
            );
          },
          roomType.totalRooms
        );

      if (
        minimumAvailableRooms < rooms
      ) {
        throw new Error(
          "ROOM_INVENTORY_EXCEEDED"
        );
      }

      const estimatedTotalValue =
        Number(roomType.basePrice) *
        rooms *
        nights.length;

      const reservationAmountValue =
        roomType.reservationAmount
          ? Number(
              roomType.reservationAmount
            ) * rooms * nights.length
          : property.reservationAmount
            ? Number(
                property.reservationAmount
              ) * rooms * nights.length
            : null;

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
              id: true,
              commissionRate: true,
            },
          }
        );

      return {
        propertyId,
        bookingMode,
        checkIn,
        checkOut,
        guests,
        rooms,
        totalNights: nights.length,
        estimatedTotal:
          estimatedTotalValue,
        reservationAmount:
          reservationAmountValue,
        currency: "INR",
        roomTypeId,
        commissionRate:
          vendor?.commissionRate
            ? Number(vendor.commissionRate)
            : 0,
        vendorId: vendor?.id,
      };
    }
  );
};

const recordOnlinePaymentForBooking = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
  amount: number,
  propertyId: string,
  bookingStatus: string,
  estimatedTotal: number,
  reservationAmount: number | null
): Promise<void> => {
  const transactionId =
    `razorpay_${Date.now()}`;

  await tx.payment.create({
    data: {
      bookingId,
      amount: new Prisma.Decimal(amount),
      paymentMethod: "ONLINE",
      paymentType: "RESERVATION",
      status: "COMPLETED",
      transactionId,
      notes:
        "Online payment via Razorpay",
    },
  });

  let newPaymentStatus = "PENDING";
  if (
    estimatedTotal > 0 &&
    amount >= estimatedTotal
  ) {
    newPaymentStatus = "PAID";
  } else if (amount > 0) {
    newPaymentStatus = "PARTIAL";
  }

  let shouldConfirm = false;
  if (
    bookingStatus ===
      BookingStatus.REQUESTED &&
    reservationAmount &&
    reservationAmount > 0 &&
    amount >= reservationAmount
  ) {
    shouldConfirm = true;
  }

  if (shouldConfirm) {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        acceptedAt: new Date(),
        paymentStatus: newPaymentStatus,
      },
    });
  } else {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: newPaymentStatus,
      },
    });
  }

  const vendor =
    await tx.vendor.findFirst({
      where: {
        properties: {
          some: {
            id: propertyId,
          },
        },
      },
      select: {
        id: true,
        commissionRate: true,
      },
    });

  if (vendor) {
    const commissionRate =
      vendor.commissionRate
        ? Number(vendor.commissionRate)
        : 0;

    const commissionAmount =
      estimatedTotal *
      (commissionRate / 100);

    const vendorEarning =
      estimatedTotal - commissionAmount;

    await tx.vendorCommission.create(
      {
        data: {
          vendorId: vendor.id,
          bookingId,
          bookingAmount: new Prisma.Decimal(
            estimatedTotal
          ),
          commissionRate: new Prisma.Decimal(
            commissionRate
          ),
          commissionAmount: new Prisma.Decimal(
            commissionAmount
          ),
          vendorEarning: new Prisma.Decimal(
            vendorEarning
          ),
          status:
            CommissionStatus.PENDING,
        },
      }
    );

    await tx.vendor.update({
      where: { id: vendor.id },
      data: {
        totalEarnings: {
          increment: vendorEarning,
        },
        totalCommission: {
          increment: commissionAmount,
        },
      },
    });
  }
};

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

interface BookingQuoteResponse {
  success: boolean;
  message: string;
  data: {
    estimatedTotal: number;
    reservationAmount: number | null;
    currency: string;
    totalNights: number;
    roomTypeId?: string;
    bookingMode: BookingMode;
  };
}

const quoteConflictMessages: Record<
  string,
  string
> = {
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
  MAX_NIGHTS_EXCEEDED:
    "A booking cannot exceed 60 nights",
};

export const calculateBookingPrice =
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
            "Only customer accounts can calculate booking prices",
        });
      }

      const body =
        req.body as CreateBookingBody;

      let input: BookingQuoteInput;

      try {
        input = validateBookingInput(body);
      } catch (validationError) {
        const err =
          validationError as Error & {
            errors?: Record<
              string,
              string
            >;
          };

        if (err.errors) {
          return res.status(422).json({
            success: false,
            message:
              "Please correct the booking information",
            errors: err.errors,
          });
        }

        const message =
          err.message || "Invalid booking details";

        return res.status(422).json({
          success: false,
          message:
            quoteConflictMessages[message] ||
            message,
        });
      }

      try {
        const quote =
          await getBookingQuote(input, req.user.id);

        return res.json({
          success: true,
          message: "Price calculated successfully",
          data: {
            estimatedTotal:
              quote.estimatedTotal,
            reservationAmount:
              quote.reservationAmount,
            currency: quote.currency,
            totalNights:
              quote.totalNights,
            roomTypeId: quote.roomTypeId,
            bookingMode: quote.bookingMode,
          },
        });
      } catch (quoteError) {
        const message =
          quoteError instanceof Error
            ? quoteError.message
            : "";

        return res.status(409).json({
          success: false,
          message:
            quoteConflictMessages[message] ||
            message ||
            "Unable to calculate booking price",
        });
      }
    } catch (error) {
      console.error(
        "Calculate booking price error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to calculate booking price",
      });
    }
  };

export const createBookingRequest =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    let verifiedPaymentAmount = 0;
    let verifiedPaymentId: string | null = null;
    let isSandboxPayment = false;

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
        req.body as CreateBookingWithPaymentBody;

      const paymentVerification =
        body.paymentVerification;

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

      const enabledPaymentMethods =
        await getEnabledPaymentMethods();

      if (
        paymentMethod &&
        !enabledPaymentMethods.includes(
          paymentMethod as PaymentMethod
        )
      ) {
        errors.paymentMethod =
          "This payment method is not enabled.";
      }

      // Note: a booking request may be created first (as a short hold)
      // and paid later via the Razorpay verify endpoint, so an ONLINE
      // request without an immediate paymentVerification is valid.

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

      if (paymentVerification) {
        const razorpayOrderId =
          typeof paymentVerification
            .razorpay_order_id ===
            "string"
            ? paymentVerification.razorpay_order_id.trim()
            : "";

        const razorpayPaymentId =
          typeof paymentVerification
            .razorpay_payment_id ===
            "string"
            ? paymentVerification.razorpay_payment_id.trim()
            : "";

        const razorpaySignature =
          typeof paymentVerification
            .razorpay_signature ===
            "string"
            ? paymentVerification.razorpay_signature.trim()
            : "";

        const paymentAmount =
          typeof paymentVerification.amount ===
          "number"
            ? paymentVerification.amount
            : Number(
                paymentVerification.amount
              );

        isSandboxPayment =
          paymentVerification.sandbox ===
            true ||
          razorpayOrderId.startsWith(
            "sandbox_order_"
          );

        if (!isSandboxPayment) {
          const { keySecret } =
            await getRazorpaySettings();

          if (!keySecret) {
            return res.status(400).json({
              success: false,
              message:
                "Payment verification failed — Razorpay is not configured",
            });
          }

          if (
            !razorpayOrderId ||
            !razorpayPaymentId ||
            !razorpaySignature
          ) {
            return res.status(422).json({
              success: false,
              message:
                "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
            });
          }

          const expectedSignature =
            crypto
              .createHmac(
                "sha256",
                keySecret
              )
              .update(
                `${razorpayOrderId}|${razorpayPaymentId}`
              )
              .digest("hex");

          if (
            expectedSignature !==
            razorpaySignature
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Payment verification failed — invalid signature",
            });
          }
        }

        if (
          !Number.isFinite(paymentAmount) ||
          paymentAmount <= 0
        ) {
          return res.status(422).json({
            success: false,
            message:
              "A valid payment amount is required",
          });
        }

        verifiedPaymentAmount =
          paymentAmount;
        verifiedPaymentId =
          razorpayPaymentId;
      }

      // Idempotency — never apply the same captured Razorpay payment
      // to more than one booking (guards against double submission).
      if (
        verifiedPaymentId &&
        !isSandboxPayment &&
        (await isRazorpayPaymentAlreadyUsed(
          verifiedPaymentId
        ))
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This payment has already been applied to a booking.",
        });
      }

      const booking =
        await prisma.$transaction(
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
            userId: {
              not: customer.id,
            },
            ...getActiveAvailabilityBookingWhere(),
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

            let createdBooking =
              await transaction.booking.create(
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
                    paymentMethod:
                      (paymentMethod || null) as
                        | PaymentMethod
                        | null,
                  },
                }
              );

            if (paymentVerification) {
              await recordOnlinePaymentForBooking(
                transaction,
                createdBooking.id,
                verifiedPaymentAmount,
                propertyId,
                createdBooking.status,
                Number(
                  createdBooking.estimatedTotal
                ) || 0,
                createdBooking.reservationAmount
                  ? Number(
                      createdBooking.reservationAmount
                    )
                  : null
              );

              const refreshedBooking =
                await transaction.booking.findFirst(
                  {
                    where: {
                      id: createdBooking.id,
                    },
                  }
                );

              if (!refreshedBooking) {
                throw new Error(
                  "BOOKING_NOT_FOUND_AFTER_CREATION"
                );
              }

              createdBooking =
                refreshedBooking;
            }

            return createdBooking;
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
              userId: {
                not: customer.id,
              },
              ...getActiveAvailabilityBookingWhere(),
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

            let createdBooking =
              await transaction.booking.create(
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
                    paymentMethod:
                      (paymentMethod || null) as
                        | PaymentMethod
                        | null,
                  },
                }
              );

            if (paymentVerification) {
              await recordOnlinePaymentForBooking(
                transaction,
                createdBooking.id,
                verifiedPaymentAmount,
                propertyId,
                createdBooking.status,
                Number(
                  createdBooking.estimatedTotal
                ) || 0,
                createdBooking.reservationAmount
                  ? Number(
                      createdBooking.reservationAmount
                    )
                  : null
              );

              const refreshedBooking =
                await transaction.booking.findFirst(
                  {
                    where: {
                      id: createdBooking.id,
                    },
                  }
                );

              if (!refreshedBooking) {
                throw new Error(
                  "BOOKING_NOT_FOUND_AFTER_CREATION"
                );
              }

              createdBooking =
                refreshedBooking;
            }

            return createdBooking;
        }
      );

      try {
          const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { title: true, vendor: { select: { userId: true } } },
          });

          if (property) {
            await prisma.notification.create({
              data: {
                recipientType:
                  NotificationRecipientType.VENDOR,
                recipientId: property.vendor.userId,
                actorId: customer.id,
                type: NotificationType.BOOKING,
                entityType: "booking",
                entityId: booking.id,
                title: "New Booking Request",
                message: `New booking request for "${property.title}" from ${booking.guestName}. Check-in: ${booking.checkIn.toISOString().slice(0, 10)}, Check-out: ${booking.checkOut.toISOString().slice(0, 10)}.`,
              },
            });
          }
        } catch (error) {
          console.error("Booking notification error:", error);
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
        // Money was already captured by Razorpay before the locked
        // booking transaction ran. If the slot is gone, refund it so
        // the customer never loses money for a booking that failed.
        let refundNote = "";
        const realPaymentCaptured =
          !isSandboxPayment &&
          !!verifiedPaymentId &&
          verifiedPaymentAmount > 0;

        if (realPaymentCaptured) {
          const refund = await refundRazorpayPayment(
            verifiedPaymentId!,
            verifiedPaymentAmount,
            ""
          );

          refundNote = refund.refunded
            ? " Your payment has been automatically refunded."
            : " We could not auto-refund your payment — please contact support.";
        }

        return res.status(409).json({
          success: false,
          message:
            conflictMessages[message] + refundNote,
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

export const approvePayment = async (
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

    const paymentId =
      typeof req.params.paymentId === "string"
        ? req.params.paymentId.trim()
        : "";

    if (!paymentId) {
      return res.status(422).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        status: PaymentStatus.PENDING_APPROVAL,
        booking: {
          property: {
            vendor: {
              userId: req.user.id,
            },
          },
        },
      },
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            property: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message:
          "Pending approval payment not found",
      });
    }

    const updatedPayment =
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
        },
      });

    const booking = payment.booking;

    const totalPaidSoFar =
      await prisma.payment.aggregate({
        where: {
          bookingId: booking.id,
          status: PaymentStatus.COMPLETED,
          paymentType: {
            not: PaymentType.REFUND,
          },
        },
        _sum: {
          amount: true,
        },
      });

    const totalPaid =
      totalPaidSoFar._sum.amount
        ? Number(totalPaidSoFar._sum.amount)
        : 0;

    const estimatedTotal = booking.estimatedTotal
      ? Number(booking.estimatedTotal)
      : 0;

    let newPaymentStatus = "PENDING";
    if (totalPaid >= estimatedTotal && estimatedTotal > 0) {
      newPaymentStatus = "PAID";
    } else if (totalPaid > 0) {
      newPaymentStatus = "PARTIAL";
    }

    const reservationAmount = booking.reservationAmount
      ? Number(booking.reservationAmount)
      : 0;

    let shouldConfirm = false;
    if (
      booking.status === BookingStatus.REQUESTED &&
      reservationAmount > 0 &&
      totalPaid >= reservationAmount
    ) {
      shouldConfirm = true;
    }

    const updatedBooking =
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: newPaymentStatus,
          ...(shouldConfirm && {
            status: BookingStatus.CONFIRMED,
            acceptedAt: new Date(),
          }),
        },
      });

    try {
      await prisma.notification.create({
        data: {
          recipientType:
            NotificationRecipientType.USER,
          recipientId: booking.userId,
          actorId: req.user!.id,
          type: NotificationType.PAYMENT,
          entityType: "payment",
          entityId: paymentId,
          title: "Bank Transfer Approved",
          message: `Your bank transfer payment of ₹${Number(payment.amount)} for booking ${booking.id} has been approved by the vendor.`,
        },
      });
    } catch (notificationError) {
      console.error(
        "Payment approval notification error:",
        notificationError
      );
    }

    if (shouldConfirm) {
      try {
        const remainingBalance = Math.max(
          0,
          estimatedTotal - totalPaid
        );

        await sendBookingConfirmationEmail(
          booking.user.email,
          `${booking.user.firstName} ${booking.user.lastName}`,
          booking.id,
          booking.property.title,
          booking.checkIn.toISOString().slice(0, 10),
          booking.checkOut.toISOString().slice(0, 10),
          booking.totalNights,
          booking.guests,
          booking.rooms,
          booking.estimatedTotal?.toString() ?? "0",
          booking.currency,
          totalPaid.toFixed(2),
          remainingBalance.toFixed(2),
          newPaymentStatus
        );
      } catch (emailError) {
        console.error(
          "Booking confirmation email error:",
          emailError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Bank transfer payment approved successfully",
      data: {
        payment: updatedPayment,
        booking: updatedBooking,
        confirmed: shouldConfirm,
      },
    });
  } catch (error) {
    console.error(
      "Approve payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to approve payment",
    });
  }
};

export const rejectPayment = async (
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

    const paymentId =
      typeof req.params.paymentId === "string"
        ? req.params.paymentId.trim()
        : "";

    if (!paymentId) {
      return res.status(422).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        status: PaymentStatus.PENDING_APPROVAL,
        booking: {
          property: {
            vendor: {
              userId: req.user.id,
            },
          },
        },
      },
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message:
          "Pending approval payment not found",
      });
    }

    const updatedPayment =
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

     try {
      await prisma.notification.create({
        data: {
          recipientType:
            NotificationRecipientType.USER,
          recipientId: payment.booking.userId,
          actorId: req.user!.id,
          type: NotificationType.PAYMENT,
          entityType: "payment",
          entityId: paymentId,
          title: "Bank Transfer Rejected",
          message: `Your bank transfer payment of ₹${Number(payment.amount)} for booking ${payment.bookingId} has been rejected by the vendor. Please contact support if you have any questions.`,
        },
      });
    } catch (notificationError) {
      console.error(
        "Payment rejection notification error:",
        notificationError
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Bank transfer payment rejected",
      data: {
        payment: updatedPayment,
      },
    });
  } catch (error) {
    console.error(
      "Reject payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reject payment",
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
          ...UNPAID_HOLD_EXCLUSION,
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
          ...UNPAID_HOLD_EXCLUSION,
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
        where: {
          ...UNPAID_HOLD_EXCLUSION,
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

      const payments =
        await prisma.payment.findMany({
          where: {
            bookingId,
          },
        });

      const totalPaid = payments
        .filter(
          (p) =>
            p.status === PaymentStatus.COMPLETED &&
            p.paymentType !== PaymentType.REFUND
        )
        .reduce(
          (sum, p) => sum.plus(p.amount),
          new Prisma.Decimal(0)
        );

      const pendingPayments = payments.filter(
        (p) =>
          (p.paymentMethod === PaymentMethod.CASH ||
            p.paymentMethod === PaymentMethod.BANK_TRANSFER) &&
          p.status === PaymentStatus.PENDING
      );

      if (pendingPayments.length > 0) {
        await prisma.payment.updateMany({
          where: {
            id: {
              in: pendingPayments.map((p) => p.id),
            },
          },
          data: {
            status: PaymentStatus.COMPLETED,
          },
        });
      }

      const allPaid =
        totalPaid.plus(
          pendingPayments.reduce(
            (sum, p) => sum.plus(p.amount),
            new Prisma.Decimal(0)
          )
        );

      const estimatedTotal = updated.estimatedTotal
        ? new Prisma.Decimal(updated.estimatedTotal)
        : null;

      let newPaymentStatus = "PENDING";
      if (
        estimatedTotal &&
        allPaid.gte(estimatedTotal)
      ) {
        newPaymentStatus = "PAID";
      } else if (allPaid.gt(new Prisma.Decimal(0))) {
        newPaymentStatus = "PARTIAL";
      }

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: newPaymentStatus,
        },
      });

      try {
        const updatedProperty =
          await prisma.property.findUnique({
            where: { id: booking.propertyId },
            select: { title: true },
          });

        await prisma.notification.create({
          data: {
            recipientType:
              NotificationRecipientType.USER,
            recipientId: updated.userId,
            actorId: req.user.id,
            type: NotificationType.BOOKING,
            entityType: "booking",
            entityId: bookingId,
            title: "Booking Confirmed",
            message: `Your booking for "${updatedProperty?.title ?? "your booking"}" has been confirmed by the vendor.`,
          },
        });
      } catch (error) {
        console.error("Accept booking notification error:", error);
      }

      try {
        const payments =
          await prisma.payment.findMany({
            where: {
              bookingId,
              status: PaymentStatus.COMPLETED,
              paymentType: {
                not: PaymentType.REFUND,
              },
            },
          });

        const totalPaid = payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );

        const estimatedTotal = updated.estimatedTotal
          ? Number(updated.estimatedTotal)
          : 0;

        const remainingBalance = Math.max(
          0,
          estimatedTotal - totalPaid
        );

        let paymentStatus = "PENDING";
        if (totalPaid >= estimatedTotal && estimatedTotal > 0) {
          paymentStatus = "PAID";
        } else if (totalPaid > 0) {
          paymentStatus = "PARTIAL";
        }

        await sendBookingConfirmationEmail(
          updated.user.email,
          `${updated.user.firstName} ${updated.user.lastName}`,
          bookingId,
          updated.property.title,
          updated.checkIn.toISOString().slice(0, 10),
          updated.checkOut.toISOString().slice(0, 10),
          updated.totalNights,
          updated.guests,
          updated.rooms,
          updated.estimatedTotal?.toString() ?? "0",
          updated.currency,
          totalPaid.toFixed(2),
          remainingBalance.toFixed(2),
          paymentStatus
        );
      } catch (error) {
        console.error("Accept booking email error:", error);
      }

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

     try {
       const updatedProperty =
         await prisma.property.findUnique({
           where: { id: booking.propertyId },
           select: { title: true },
         });

       await prisma.notification.create({
         data: {
           recipientType:
             NotificationRecipientType.USER,
           recipientId: updated.userId,
           actorId: req.user.id,
           type: NotificationType.BOOKING,
           entityType: "booking",
           entityId: bookingId,
           title: "Booking Rejected",
           message: `Your booking for "${updatedProperty?.title ?? "your booking"}" has been rejected by the vendor.`,
         },
       });
     } catch (error) {
       console.error("Reject booking notification error:", error);
     }

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

    const validMethods = await getEnabledPaymentMethods();

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
          "Please select a valid payment method.",
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
          status:
            paymentMethod === "BANK_TRANSFER" &&
            booking.userId !== req.user!.id
              ? PaymentStatus.PENDING_APPROVAL
              : PaymentStatus.COMPLETED,
          transactionId,
          notes,
        },
      });

    if (
      paymentMethod === "BANK_TRANSFER" &&
      booking.userId !== req.user!.id &&
      payment.status === PaymentStatus.PENDING_APPROVAL
    ) {
      try {
        const vendorUser = await prisma.vendor.findFirst({
          where: {
            properties: {
              some: {
                id: booking.propertyId,
              },
            },
          },
          select: {
            userId: true,
          },
        });

        if (vendorUser) {
          await prisma.notification.create({
            data: {
              recipientType:
                NotificationRecipientType.VENDOR,
              recipientId: vendorUser.userId,
              actorId: req.user!.id,
              type: NotificationType.PAYMENT,
              entityType: "payment",
              entityId: payment.id,
              title: "Bank Transfer Pending Approval",
              message: `A bank transfer payment of ₹${amount} is pending your approval for booking ${bookingId}. Transaction ID: ${transactionId || "Not provided"}`,
            },
          });
        }
      } catch (notificationError) {
        console.error(
          "Bank transfer notification error:",
          notificationError
        );
      }
    }

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

export const cancelBooking = async (
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
        message: "Booking ID is required",
      });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: req.user.id,
        status: BookingStatus.REQUESTED,
      },
      include: {
        payments: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found or cannot be cancelled",
      });
    }

    const hasCompletedPayments = booking.payments.some(
      (p) => p.status === PaymentStatus.COMPLETED
    );

    if (hasCompletedPayments) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot cancel a booking with completed payments",
      });
    }

    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error(
      "Cancel booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to cancel booking",
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
