import type { Response } from "express";

import {
  BookingStatus,
  Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";
import { UNPAID_HOLD_EXCLUSION } from "./booking.controller.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

export const getVendorDashboardStats = async (
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

    if (req.user.role !== "VENDOR") {
      return res.status(403).json({
        success: false,
        message: "Only vendor accounts can access this resource",
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        businessName: true,
        totalEarnings: true,
        totalCommission: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile was not found",
      });
    }

    const [
      totalProperties,
      activeProperties,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      totalCommission,
      pendingPayout,
      paidPayout,
      totalPayments,
      totalPaidPayments,
      recentBookings,
      recentPayouts,
      propertyPerformance,
    ] = await Promise.all([
      prisma.property.count({
        where: { vendorId: vendor.id },
      }),
      prisma.property.count({
        where: { vendorId: vendor.id, status: "APPROVED" },
      }),
      prisma.booking.count({
        where: {
          property: { vendorId: vendor.id },
        },
      }),
      prisma.booking.count({
        where: {
          property: { vendorId: vendor.id },
          status: BookingStatus.REQUESTED,
        },
      }),
      prisma.booking.count({
        where: {
          property: { vendorId: vendor.id },
          status: BookingStatus.CONFIRMED,
        },
      }),
      prisma.booking.count({
        where: {
          property: { vendorId: vendor.id },
          status: BookingStatus.COMPLETED,
        },
      }),
      prisma.booking.count({
        where: {
          property: { vendorId: vendor.id },
          status: BookingStatus.CANCELLED,
        },
      }),
      prisma.booking.aggregate({
        where: {
          property: { vendorId: vendor.id },
        },
        _sum: { estimatedTotal: true },
      }),
      prisma.booking.aggregate({
        where: {
          property: { vendorId: vendor.id },
        },
        _sum: { adminCommission: true },
      }),
      prisma.vendorCommission.aggregate({
        where: {
          vendorId: vendor.id,
          status: "PENDING",
        },
        _sum: { commissionAmount: true },
      }),
      prisma.vendorCommission.aggregate({
        where: {
          vendorId: vendor.id,
          status: "PAID",
        },
        _sum: { commissionAmount: true },
      }),
      prisma.payment.count({
        where: {
          booking: {
            property: { vendorId: vendor.id },
          },
        },
      }),
      prisma.payment.aggregate({
        where: {
          booking: {
            property: { vendorId: vendor.id },
          },
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),
      prisma.booking.findMany({
        where: {
          property: { vendorId: vendor.id },
          ...UNPAID_HOLD_EXCLUSION,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          checkIn: true,
          checkOut: true,
          estimatedTotal: true,
          guestName: true,
          property: {
            select: {
              title: true,
              city: true,
              state: true,
            },
          },
        },
      }),
      prisma.vendorCommission.findMany({
        where: { vendorId: vendor.id },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          bookingAmount: true,
          commissionAmount: true,
          vendorEarning: true,
          status: true,
          paidAt: true,
          booking: {
            select: {
              id: true,
              guestName: true,
              property: {
                select: { title: true },
              },
            },
          },
        },
      }),
      prisma.property.findMany({
        where: { vendorId: vendor.id },
        take: 5,
        select: {
          id: true,
          title: true,
          city: true,
          state: true,
          status: true,
          _count: { select: { bookings: true } },
        },
      }),
    ]);

    const totalRevenueValue =
      totalRevenue._sum.estimatedTotal !== null
        ? Number(totalRevenue._sum.estimatedTotal)
        : 0;

    const totalCommissionValue =
      totalCommission._sum.adminCommission !== null
        ? Number(totalCommission._sum.adminCommission)
        : 0;

    const pendingPayoutValue =
      pendingPayout._sum.commissionAmount !== null
        ? Number(pendingPayout._sum.commissionAmount)
        : 0;

    const paidPayoutValue =
      paidPayout._sum.commissionAmount !== null
        ? Number(paidPayout._sum.commissionAmount)
        : 0;

    const totalPaidPaymentsValue =
      totalPaidPayments._sum.amount !== null
        ? Number(totalPaidPayments._sum.amount)
        : 0;

    const occupancyRate =
      totalBookings > 0
        ? Math.round((completedBookings / totalBookings) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      message: "Vendor dashboard stats fetched successfully",
      data: {
        vendor: {
          id: vendor.id,
          businessName: vendor.businessName,
          totalEarnings: Number(vendor.totalEarnings),
          totalCommission: Number(vendor.totalCommission),
        },
        propertyStats: {
          total: totalProperties,
          active: activeProperties,
        },
        bookingStats: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
        revenueStats: {
          total: totalRevenueValue,
          commission: totalCommissionValue,
          paid: totalPaidPaymentsValue,
          pendingPayout: pendingPayoutValue,
          paidPayout: paidPayoutValue,
          occupancyRate,
        },
        paymentStats: {
          total: totalPayments,
          totalPaid: totalPaidPaymentsValue,
        },
        recentBookings,
        recentPayouts,
        propertyPerformance: propertyPerformance.map((p) => ({
          id: p.id,
          title: p.title,
          city: p.city,
          state: p.state,
          status: p.status,
          bookings: p._count.bookings,
        })),
      },
    });
  } catch (error) {
    console.error("Get vendor dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch dashboard stats",
    });
  }
};