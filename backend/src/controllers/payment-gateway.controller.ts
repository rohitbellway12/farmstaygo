import crypto from "crypto";
import type { Response } from "express";

import {
  Prisma,
  CommissionStatus,
  NotificationRecipientType,
  NotificationType,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import {
  sendBookingConfirmationEmail,
} from "../services/email.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

/*
|--------------------------------------------------------------------------
| Razorpay SDK — optional (sandbox fallback when env keys are missing)
|--------------------------------------------------------------------------
*/

const RAZORPAY_KEY_ID =
  process.env.RAZORPAY_KEY_ID || "";

const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || "";

const razorpayEnabled =
  Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let razorpayInstance: any = null;

if (razorpayEnabled) {
  try {
    // Dynamic import so the server doesn't crash if the package is missing
    const { default: Razorpay } =
      await import("razorpay");

    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  } catch {
    console.warn(
      "[payment-gateway] Failed to initialise Razorpay SDK — running in sandbox mode."
    );
  }
}

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

    // Amount in paise (Razorpay expects smallest currency unit)
    const amountInPaise = Math.round(amount * 100);
    const currency = booking.currency || "INR";

    if (!razorpayEnabled || !razorpayInstance) {
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
    const order = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `booking_${bookingId}`,
      notes: {
        bookingId,
        userId: String(req.user.id),
      },
    });

    return res.status(200).json({
      success: true,
      sandbox: false,
      data: {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID,
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

    if (!isSandbox) {
      // ── SIGNATURE VERIFICATION ─────────────────────────────────────
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(422).json({
          success: false,
          message:
            "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
        });
      }

      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
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

    await prisma.$transaction(async (tx) => {
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
  return res.status(200).json({
    success: true,
    data: {
      enabled: razorpayEnabled,
      keyId: razorpayEnabled ? RAZORPAY_KEY_ID : "",
    },
  });
};
