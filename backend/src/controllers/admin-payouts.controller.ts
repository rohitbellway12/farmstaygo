import type { Response } from "express";

import { z } from "zod";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import prisma from "../config/database.js";

import {
  CommissionStatus,
  NotificationRecipientType,
  NotificationType,
  PaymentMethod,
  Prisma,
} from "../generated/prisma/client.js";

interface PayPayoutBody {
  transactionId?: string;
  paymentMethod?: string;
  notes?: string;
}

const paymentMethodMap: Record<string, PaymentMethod> = {
  ONLINE: PaymentMethod.ONLINE,
  CASH: PaymentMethod.CASH,
  BANK_TRANSFER: PaymentMethod.BANK_TRANSFER,
};

export const getAdminPayouts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const requestedStatus =
      typeof req.query.status === "string"
        ? req.query.status.trim().toUpperCase()
        : "ALL";

    const where: Prisma.VendorCommissionWhereInput = {};

    if (requestedStatus !== "ALL") {
      where.status = requestedStatus as CommissionStatus;
    }

    if (search) {
      where.OR = [
        {
          vendor: {
            businessName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          vendor: {
            user: {
              firstName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          booking: {
            guestName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          booking: {
            property: {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          transactionId: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const payouts = await prisma.vendorCommission.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            bankAccountName: true,
            bankAccountNumber: true,
            bankIfscCode: true,
            totalEarnings: true,
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
        booking: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            estimatedTotal: true,
            guestName: true,
            guestEmail: true,
            guestMobile: true,
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                state: true,
              },
            },
          },
        },
        paidBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const formatted = payouts.map((p) => ({
      id: p.id,
      vendorId: p.vendorId,
      bookingId: p.bookingId,
      bookingAmount: Number(p.bookingAmount),
      commissionRate: Number(p.commissionRate),
      commissionAmount: Number(p.commissionAmount),
      vendorEarning: Number(p.vendorEarning),
      status: p.status,
      paidAt: p.paidAt,
      transactionId: p.transactionId,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      vendor: {
        id: p.vendor.id,
        businessName: p.vendor.businessName,
        bankAccountName: p.vendor.bankAccountName,
        bankAccountNumber: p.vendor.bankAccountNumber,
        bankIfscCode: p.vendor.bankIfscCode,
        totalEarnings: Number(p.vendor.totalEarnings),
        user: p.vendor.user,
      },
      booking: {
        id: p.booking.id,
        checkIn: p.booking.checkIn,
        checkOut: p.booking.checkOut,
        estimatedTotal: p.booking.estimatedTotal
          ? Number(p.booking.estimatedTotal)
          : 0,
        guestName: p.booking.guestName,
        guestEmail: p.booking.guestEmail,
        guestMobile: p.booking.guestMobile,
        property: {
          id: p.booking.property.id,
          title: p.booking.property.title,
          city: p.booking.property.city,
          state: p.booking.property.state,
        },
      },
      paidBy: p.paidBy
        ? {
            id: p.paidBy.id,
            firstName: p.paidBy.firstName,
            lastName: p.paidBy.lastName,
            email: p.paidBy.email,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      message: "Payouts fetched successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("Get admin payouts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payouts",
    });
  }
};

export const getPayoutSummary = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const requestedStatus =
      typeof req.query.status === "string"
        ? req.query.status.trim().toUpperCase()
        : "ALL";

    const where: Prisma.VendorCommissionWhereInput = {};

    if (requestedStatus !== "ALL") {
      where.status = requestedStatus as CommissionStatus;
    }

    const [summary, vendorCount] = await Promise.all([
      prisma.vendorCommission.aggregate({
        where,
        _sum: {
          bookingAmount: true,
          commissionAmount: true,
          vendorEarning: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.vendor.count(),
    ]);

    const pendingAgg = await prisma.vendorCommission.aggregate({
      where: { ...where, status: CommissionStatus.PENDING },
      _sum: {
        vendorEarning: true,
      },
      _count: {
        id: true,
      },
    });

    const paidAgg = await prisma.vendorCommission.aggregate({
      where: { ...where, status: CommissionStatus.PAID },
      _sum: {
        vendorEarning: true,
      },
      _count: {
        id: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Payout summary fetched successfully",
      data: {
        totalPayouts: summary._count.id || 0,
        totalBookingAmount: summary._sum.bookingAmount
          ? Number(summary._sum.bookingAmount)
          : 0,
        totalCommissionAmount: summary._sum.commissionAmount
          ? Number(summary._sum.commissionAmount)
          : 0,
        totalVendorEarning: summary._sum.vendorEarning
          ? Number(summary._sum.vendorEarning)
          : 0,
        pendingCount: pendingAgg._count.id || 0,
        pendingAmount: pendingAgg._sum.vendorEarning
          ? Number(pendingAgg._sum.vendorEarning)
          : 0,
        paidCount: paidAgg._count.id || 0,
        paidAmount: paidAgg._sum.vendorEarning
          ? Number(paidAgg._sum.vendorEarning)
          : 0,
        totalVendors: vendorCount,
      },
    });
  } catch (error) {
    console.error("Get payout summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payout summary",
    });
  }
};

export const processPayout = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const commissionId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    if (!commissionId) {
      return res.status(422).json({
        success: false,
        message: "Commission ID is required",
      });
    }

    const schema = z.object({
      transactionId: z
        .string()
        .trim()
        .min(1, "Transaction ID is required"),
      paymentMethod: z
        .string()
        .trim()
        .min(1, "Payment method is required"),
      notes: z.string().trim().optional(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { transactionId, paymentMethod, notes } = validation.data;

    const methodValue = paymentMethodMap[paymentMethod.toUpperCase()];

    if (!methodValue) {
      return res.status(422).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const commission =
      await prisma.vendorCommission.findFirst({
        where: { id: commissionId },
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          booking: {
            select: {
              id: true,
              guestName: true,
            },
          },
        },
      });

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: "Payout record not found",
      });
    }

    if (commission.status === CommissionStatus.PAID && commission.transactionId) {
      return res.status(409).json({
        success: false,
        message: "This payout has already been processed",
      });
    }

    const adminId =
      typeof req.user?.id === "number"
        ? req.user.id
        : Number(req.user?.id);

    const updatedCommission =
      await prisma.$transaction(async (tx) => {
        const updated = await tx.vendorCommission.update({
          where: { id: commissionId },
          data: {
            status: CommissionStatus.PAID,
            paidAt: new Date(),
            transactionId,
            paymentMethod: methodValue,
            notes: notes ?? null,
            paidByUserId: adminId,
          },
          include: {
            vendor: {
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
            booking: {
              select: {
                id: true,
                checkIn: true,
                checkOut: true,
                estimatedTotal: true,
                guestName: true,
                guestEmail: true,
                property: {
                  select: {
                    title: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
            paidBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        await tx.vendor.update({
          where: { id: commission.vendorId },
          data: {
            totalEarnings: {
              decrement: commission.vendorEarning,
            },
          },
        });

        const notificationData: Prisma.NotificationCreateInput[] = [
          {
            recipientType: NotificationRecipientType.VENDOR,
            recipientId: commission.vendor.userId,
            actorId: adminId,
            type: NotificationType.PAYMENT,
            entityType: "VendorCommission",
            entityId: commission.id,
            title: "Payout Processed",
            message: `Your payout of ₹${Number(commission.vendorEarning).toLocaleString("en-IN")} for booking ${commission.booking.guestName || "N/A"} has been processed. Transaction ID: ${transactionId}`,
            metadata: JSON.stringify({
              transactionId,
              paymentMethod: methodValue,
              amount: Number(commission.vendorEarning),
            }),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        await tx.notification.createMany({
          data: notificationData,
        });

        return updated;
      });

    return res.status(200).json({
      success: true,
      message: "Payout processed successfully",
      data: {
        id: updatedCommission.id,
        status: updatedCommission.status,
        paidAt: updatedCommission.paidAt,
        transactionId: updatedCommission.transactionId,
        paymentMethod: updatedCommission.paymentMethod,
        notes: updatedCommission.notes,
        vendor: {
          id: updatedCommission.vendor.id,
          businessName: updatedCommission.vendor.businessName,
          user: updatedCommission.vendor.user,
        },
        booking: {
          id: updatedCommission.booking.id,
          guestName: updatedCommission.booking.guestName,
          propertyTitle: updatedCommission.booking.property.title,
        },
        paidBy: updatedCommission.paidBy,
      },
    });
  } catch (error) {
    console.error("Process payout error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process payout",
    });
  }
};

export const getPayoutReceipt = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const commissionId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    if (!commissionId) {
      return res.status(422).json({
        success: false,
        message: "Commission ID is required",
      });
    }

    const commission = await prisma.vendorCommission.findFirst({
      where: { id: commissionId },
      include: {
        vendor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
              },
            },
          },
        },
        booking: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            estimatedTotal: true,
            guestName: true,
            guestEmail: true,
            guestMobile: true,
            property: {
              select: {
                title: true,
                city: true,
                state: true,
                country: true,
              },
            },
          },
        },
        paidBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: "Payout record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Receipt data fetched successfully",
      data: {
        id: commission.id,
        vendorEarning: Number(commission.vendorEarning),
        commissionAmount: Number(commission.commissionAmount),
        commissionRate: Number(commission.commissionRate),
        bookingAmount: Number(commission.bookingAmount),
        status: commission.status,
        transactionId: commission.transactionId,
        paymentMethod: commission.paymentMethod,
        notes: commission.notes,
        paidAt: commission.paidAt,
        createdAt: commission.createdAt,
        vendor: {
          businessName: commission.vendor.businessName,
          bankAccountName: commission.vendor.bankAccountName,
          bankAccountNumber: commission.vendor.bankAccountNumber,
          bankIfscCode: commission.vendor.bankIfscCode,
          user: commission.vendor.user,
        },
        booking: {
          id: commission.booking.id,
          checkIn: commission.booking.checkIn,
          checkOut: commission.booking.checkOut,
          estimatedTotal: commission.booking.estimatedTotal
            ? Number(commission.booking.estimatedTotal)
            : 0,
          guestName: commission.booking.guestName,
          guestEmail: commission.booking.guestEmail,
          guestMobile: commission.booking.guestMobile,
          property: {
            title: commission.booking.property.title,
            city: commission.booking.property.city,
            state: commission.booking.property.state,
            country: commission.booking.property.country,
          },
        },
        paidBy: commission.paidBy
          ? {
              firstName: commission.paidBy.firstName,
              lastName: commission.paidBy.lastName,
              email: commission.paidBy.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get payout receipt error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch receipt",
    });
  }
};
