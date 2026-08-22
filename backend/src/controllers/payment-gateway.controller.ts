import crypto from "crypto";
import type { Response } from "express";

import {
  Prisma,
  CommissionStatus,
  NotificationRecipientType,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

// Must match the hold window used for availability checks elsewhere.
const BOOKING_HOLD_MINUTES = 5;

import {
  sendBookingConfirmationEmail,
} from "../services/email.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

/*
|--------------------------------------------------------------------------
| Razorpay SDK — optional (sandbox fallback when settings are missing)
|--------------------------------------------------------------------------
*/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedRazorpayInstance: any = null;
let cachedKeyId = "";

export const getRazorpaySettings = async (): Promise<{
  keyId: string;
  keySecret: string;
}> => {
  const [keyIdSetting, keySecretSetting] =
    await Promise.all([
      prisma.setting.findUnique({
        where: { key: "razorpay_key_id" },
        select: { value: true },
      }),
      prisma.setting.findUnique({
        where: { key: "razorpay_key_secret" },
        select: { value: true },
      }),
    ]);

  return {
    keyId: keyIdSetting?.value || "",
    keySecret: keySecretSetting?.value || "",
  };
};

const getRazorpayInstance = async (): Promise<any> => {
  const { keyId, keySecret } =
    await getRazorpaySettings();

  if (!keyId || !keySecret) {
    return null;
  }

  if (
    cachedRazorpayInstance &&
    cachedKeyId === keyId
  ) {
    return cachedRazorpayInstance;
  }

  try {
    const { default: Razorpay } =
      await import("razorpay");

    cachedRazorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    cachedKeyId = keyId;

    return cachedRazorpayInstance;
  } catch {
    console.warn(
      "[payment-gateway] Failed to initialise Razorpay SDK — running in sandbox mode."
    );

    return null;
  }
};

/*
|--------------------------------------------------------------------------
| Refund helpers
|--------------------------------------------------------------------------
*/

export const isRazorpayPaymentAlreadyUsed = async (
  razorpayPaymentId: string
): Promise<boolean> => {
  if (!razorpayPaymentId) {
    return false;
  }

  const existing = await prisma.payment.findFirst({
    where: {
      transactionId: razorpayPaymentId,
      paymentType: {
        not: "REFUND" as PaymentType,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(existing);
};

export const refundRazorpayPayment = async (
  razorpayPaymentId: string,
  amount: number,
  bookingId: string
): Promise<{
  refunded: boolean;
  reason?: string;
}> => {
  if (!razorpayPaymentId) {
    return {
      refunded: false,
      reason: "missing_payment_id",
    };
  }

  try {
    const razorpayInstance = await getRazorpayInstance();

    // Sandbox mode — no real money was captured, nothing to refund.
    if (!razorpayInstance) {
      return {
        refunded: true,
        reason: "sandbox",
      };
    }

    const amountInPaise = Math.round(amount * 100);

    await razorpayInstance.payments.refund(razorpayPaymentId, {
      amount: amountInPaise,
    });

    // Best-effort audit row. The booking may not exist (e.g. booking
    // creation failed after capture), so ignore FK errors here.
    try {
      await prisma.payment.create({
        data: {
          bookingId,
          amount: new Prisma.Decimal(amount),
          paymentMethod: "ONLINE" as PaymentMethod,
          paymentType: "REFUND" as PaymentType,
          status: "COMPLETED" as PaymentStatus,
          transactionId: `refund_${razorpayPaymentId}`,
          notes: `Auto-refund for unsuccessful booking (Razorpay payment ${razorpayPaymentId})`,
        },
      });
    } catch {
      // ignore — refund at Razorpay already succeeded
    }

    return {
      refunded: true,
    };
  } catch (error) {
    console.error(
      "[refundRazorpayPayment] failed:",
      error
    );

    return {
      refunded: false,
      reason:
        error instanceof Error
          ? error.message
          : "refund_failed",
    };
  }
};

/*
|--------------------------------------------------------------------------
| POST /bookings/:id/razorpay/order
| Creates a Razorpay order (or returns a sandbox order)
|--------------------------------------------------------------------------
*/

export const createRazorpayOrder = async (
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

    // Validate amount from request body
    const body = req.body as {
      amount?: unknown;
    };

    const amount =
      typeof body.amount === "number"
        ? body.amount
        : Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(422).json({
        success: false,
        message: "A valid payment amount is required",
      });
    }

    // Confirm the booking exists and belongs to the current user
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: req.user.id,
      },
      select: {
        id: true,
        status: true,
        reservationAmount: true,
        currency: true,
        propertyId: true,
        roomTypeId: true,
        bookingMode: true,
        checkIn: true,
        checkOut: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.status === "CANCELLED" ||
      booking.status === "COMPLETED"
    ) {
      return res.status(409).json({
        success: false,
        message: "This booking is no longer payable",
      });
    }

    // Re-check availability before opening the payment gateway. The slot
    // may have been taken since the booking request (hold) was created —
    // if so, do not let the user pay for an unavailable slot.
    const conflictCutoff = new Date(
      Date.now() - BOOKING_HOLD_MINUTES * 60 * 1000
    );

    const conflictingCount =
      await prisma.booking.count({
        where: {
          id: {
            not: booking.id,
          },
          propertyId: booking.propertyId,
          OR: [
            {
              status: "CONFIRMED",
            },
            {
              status: "REQUESTED",
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
                  createdAt: {
                    gte: conflictCutoff,
                  },
                },
              ],
            },
          ],
          checkIn: {
            lt: booking.checkOut,
          },
          checkOut: {
            gt: booking.checkIn,
          },
          ...(booking.bookingMode !== "ENTIRE_PROPERTY" &&
          booking.roomTypeId
            ? { roomTypeId: booking.roomTypeId }
            : {}),
        },
      });

    if (conflictingCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Sorry, this slot was just booked by someone else. Please choose different dates.",
      });
    }

    // Amount in paise (Razorpay expects smallest currency unit)
    const amountInPaise = Math.round(amount * 100);
    const currency = booking.currency || "INR";

    const razorpayInstance =
      await getRazorpayInstance();
    const razorpayEnabled =
      !!razorpayInstance;

    if (!razorpayEnabled) {
      // ── SANDBOX MODE ─────────────────────────────────────────────────
      // Return a simulated order object so the frontend can render a
      // mock payment modal without real Razorpay credentials.
      return res.status(200).json({
        success: true,
        sandbox: true,
        message:
          "Razorpay is not configured — using sandbox mode",
        data: {
          orderId: `sandbox_order_${Date.now()}`,
          amount: amountInPaise,
          currency,
          keyId: "",
        },
      });
    }

    // ── LIVE / TEST MODE ─────────────────────────────────────────────
    const order =
      await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `booking_${bookingId}`,
        notes: {
          bookingId,
          userId: String(req.user.id),
        },
      });

    const { keyId } =
      await getRazorpaySettings();

    return res.status(200).json({
      success: true,
      sandbox: false,
      data: {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        keyId,
      },
    });
  } catch (error) {
    console.error(
      "[createRazorpayOrder]",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create payment order. Please try again.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /payments/razorpay/order
| Creates a standalone Razorpay order without an existing booking
|--------------------------------------------------------------------------
*/

export const createStandaloneRazorpayOrder =
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

      const body = req.body as {
        amount?: unknown;
      };

      const amount =
        typeof body.amount === "number"
          ? body.amount
          : Number(body.amount);

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

      const amountInPaise = Math.round(
        amount * 100
      );
      const currency = "INR";

      const razorpayInstance =
        await getRazorpayInstance();
      const razorpayEnabled =
        !!razorpayInstance;

      if (!razorpayEnabled) {
        return res.status(200).json({
          success: true,
          sandbox: true,
          message:
            "Razorpay is not configured — using sandbox mode",
          data: {
            orderId: `sandbox_order_${Date.now()}`,
            amount: amountInPaise,
            currency,
            keyId: "",
          },
        });
      }

      const order =
        await razorpayInstance.orders.create(
          {
            amount: amountInPaise,
            currency,
            receipt: `payment_${req.user.id}_${Date.now()}`,
            notes: {
              userId: String(req.user.id),
            },
          }
        );

      const { keyId } =
        await getRazorpaySettings();

      return res.status(200).json({
        success: true,
        sandbox: false,
        data: {
          orderId: order.id,
          amount: Number(order.amount),
          currency: order.currency,
          keyId,
        },
      });
    } catch (error) {
      console.error(
        "[createStandaloneRazorpayOrder]",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create payment order. Please try again.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| POST /bookings/:id/razorpay/verify
| Verifies a Razorpay payment signature and records the payment
|--------------------------------------------------------------------------
*/

export const verifyRazorpayPayment = async (
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

    const body = req.body as {
      razorpay_order_id?: unknown;
      razorpay_payment_id?: unknown;
      razorpay_signature?: unknown;
      amount?: unknown;
      sandbox?: unknown;
    };

    const razorpayOrderId =
      typeof body.razorpay_order_id === "string"
        ? body.razorpay_order_id.trim()
        : "";

    const razorpayPaymentId =
      typeof body.razorpay_payment_id === "string"
        ? body.razorpay_payment_id.trim()
        : "";

    const razorpaySignature =
      typeof body.razorpay_signature === "string"
        ? body.razorpay_signature.trim()
        : "";

    const isSandbox =
      body.sandbox === true ||
      body.sandbox === "true" ||
      razorpayOrderId.startsWith("sandbox_order_");

    const amount =
      typeof body.amount === "number"
        ? body.amount
        : Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(422).json({
        success: false,
        message: "A valid payment amount is required",
      });
    }

    const razorpayInstance =
      await getRazorpayInstance();
    const razorpayEnabled =
      !!razorpayInstance;
    const { keySecret } =
      await getRazorpaySettings();

    if (!isSandbox) {
      // ── SIGNATURE VERIFICATION ─────────────────────────────────────
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(422).json({
          success: false,
          message:
            "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
        });
      }

      if (!razorpayEnabled || !keySecret) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed — Razorpay is not configured",
        });
      }

      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(
          `${razorpayOrderId}|${razorpayPaymentId}`
        )
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed — invalid signature",
        });
      }
    }

    // Fetch booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: req.user.id,
      },
      select: {
        id: true,
        status: true,
        reservationAmount: true,
        estimatedTotal: true,
        paymentStatus: true,
        propertyId: true,
        roomTypeId: true,
        bookingMode: true,
        checkIn: true,
        checkOut: true,
        payments: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.status === "CANCELLED" ||
      booking.status === "COMPLETED"
    ) {
      return res.status(409).json({
        success: false,
        message: "This booking is no longer payable",
      });
    }

    // Idempotency — never apply the same Razorpay payment twice.
    if (
      !isSandbox &&
      (await isRazorpayPaymentAlreadyUsed(razorpayPaymentId))
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This payment has already been applied to a booking.",
      });
    }

    // Record payment & potentially auto-confirm booking
    const transactionId = isSandbox
      ? `sandbox_${Date.now()}`
      : razorpayPaymentId;

    const totalPaidSoFar = booking.payments
      .filter((p) => p.status === "COMPLETED")
      .reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

    const newTotal = totalPaidSoFar + amount;

    const reservationAmount = booking.reservationAmount
      ? Number(booking.reservationAmount)
      : 0;

    const estimatedTotalValue = booking.estimatedTotal
      ? Number(booking.estimatedTotal)
      : null;

    const shouldConfirm =
      booking.status === "REQUESTED" &&
      reservationAmount > 0 &&
      newTotal >= reservationAmount;

    let newPaymentStatus: string =
      "PENDING";

    if (
      estimatedTotalValue &&
      newTotal >= estimatedTotalValue
    ) {
      newPaymentStatus = "PAID";
    } else if (newTotal > 0) {
      newPaymentStatus = "PARTIAL";
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Serialize concurrent payments for the same property.
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtext(${booking.propertyId}))
        `;

        // In-transaction idempotency: a concurrent duplicate verify for
        // the same Razorpay payment must not create a second charge.
        if (razorpayPaymentId) {
          const alreadyApplied =
            await tx.payment.findFirst({
              where: {
                transactionId: razorpayPaymentId,
                paymentType: {
                  not: "REFUND",
                },
              },
              select: {
                id: true,
              },
            });

          if (alreadyApplied) {
            throw new Error("PAYMENT_ALREADY_APPLIED");
          }
        }

        // Re-check availability atomically. If another booking already
        // holds this slot, abort before recording the payment so the
        // captured money can be refunded instead of being lost.
        const holdCutoff = new Date(
          Date.now() - BOOKING_HOLD_MINUTES * 60 * 1000
        );

        const conflictWhere: Prisma.BookingWhereInput = {
          id: {
            not: bookingId,
          },
          propertyId: booking.propertyId,
          OR: [
            {
              status: "CONFIRMED",
            },
            {
              status: "REQUESTED",
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
                  createdAt: {
                    gte: holdCutoff,
                  },
                },
              ],
            },
          ],
          checkIn: {
            lt: booking.checkOut,
          },
          checkOut: {
            gt: booking.checkIn,
          },
        };

        if (
          booking.bookingMode !== "ENTIRE_PROPERTY" &&
          booking.roomTypeId
        ) {
          conflictWhere.roomTypeId = booking.roomTypeId;
        }

        const conflictingBookings =
          await tx.booking.count({
            where: conflictWhere,
          });

        if (conflictingBookings > 0) {
          throw new Error("BOOKING_CONFLICT_REFUND");
        }

        await tx.payment.create({
          data: {
            bookingId,
            amount,
            paymentMethod: "ONLINE",
            paymentType: "RESERVATION",
            status: "COMPLETED",
            transactionId,
            notes: isSandbox
              ? "Sandbox payment (Razorpay not configured)"
              : `Razorpay order: ${razorpayOrderId}`,
          },
        });

      if (shouldConfirm) {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
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

      const bookingWithProperty =
        await tx.booking.findFirst({
          where: { id: bookingId },
          include: {
            property: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    commissionRate: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

       if (bookingWithProperty) {
        const vendor = bookingWithProperty.property.vendor;
        const commissionRate =
          vendor?.commissionRate
            ? Number(vendor.commissionRate)
            : 0;

        const bookingAmount =
          Number(
            bookingWithProperty.estimatedTotal
          ) || 0;
        const commissionAmount =
          bookingAmount *
          (commissionRate / 100);
        const vendorEarning =
          bookingAmount - commissionAmount;

        await tx.vendorCommission.create(
          {
            data: {
              vendorId: vendor.id,
              bookingId,
              bookingAmount: new Prisma.Decimal(
                bookingAmount
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
              status: CommissionStatus.PENDING,
            },
          }
        );

        await tx.vendor.update({
          where: { id: vendor.id },
          data: {
            totalEarnings:
              { increment: vendorEarning },
            totalCommission:
              { increment: commissionAmount },
          },
        });
      }
    });

    } catch (txError) {
      if (
        txError instanceof Error &&
        (txError.message === "BOOKING_CONFLICT_REFUND" ||
          txError.message === "PAYMENT_ALREADY_APPLIED")
      ) {
        if (txError.message === "PAYMENT_ALREADY_APPLIED") {
          return res.status(409).json({
            success: false,
            message:
              "This payment has already been applied to a booking.",
          });
        }

        const refund = await refundRazorpayPayment(
          razorpayPaymentId,
          amount,
          bookingId
        );

        return res.status(409).json({
          success: false,
          message: refund.refunded
            ? "Sorry, this slot was just booked by someone else. Your payment has been refunded."
            : "Sorry, this slot was just booked by someone else. We could not auto-refund your payment — please contact support.",
          data: { refunded: refund.refunded },
        });
      }

      throw txError;
    }

    try {
      await prisma.notification.create({
        data: {
          recipientType:
            NotificationRecipientType.ADMIN,
          recipientId: 1,
          actorId: req.user!.id,
          type: NotificationType.PAYMENT,
          entityType: "payment",
          entityId: bookingId,
          title: "Payment Received",
          message: `Payment of ₹${amount} received for booking ${bookingId}.`,
        },
      });
    } catch (error) {
      console.error("Payment notification error:", error);
    }

    if (shouldConfirm) {
      try {
        const bookingForEmail =
          await prisma.booking.findFirst({
            where: { id: bookingId },
            include: {
              property: {
                select: { title: true },
              },
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          });

        if (bookingForEmail) {
          await sendBookingConfirmationEmail(
            bookingForEmail.user.email,
            `${bookingForEmail.user.firstName} ${bookingForEmail.user.lastName}`,
            bookingId,
            bookingForEmail.property.title,
            bookingForEmail.checkIn.toISOString().slice(0, 10),
            bookingForEmail.checkOut.toISOString().slice(0, 10),
            bookingForEmail.totalNights,
            bookingForEmail.guests,
            bookingForEmail.rooms,
            bookingForEmail.estimatedTotal?.toString() ?? "0",
            bookingForEmail.currency
          );
        }
      } catch (error) {
        console.error("Booking confirmation email error:", error);
      }
    }

    return res.status(200).json({
      success: true,
      message: shouldConfirm
        ? "Payment successful! Your booking has been confirmed."
        : "Payment recorded successfully.",
      data: {
        confirmed: shouldConfirm,
      },
    });
  } catch (error) {
    console.error(
      "[verifyRazorpayPayment]",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Payment recording failed. Please contact support.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /razorpay/status
| Public endpoint — tells the client whether Razorpay is live or sandbox
|--------------------------------------------------------------------------
*/

export const getRazorpayStatus = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const { keyId } = await getRazorpaySettings();
  const razorpayEnabled = !!keyId;

  return res.status(200).json({
    success: true,
    data: {
      enabled: razorpayEnabled,
      keyId: razorpayEnabled ? keyId : "",
    },
  });
};
