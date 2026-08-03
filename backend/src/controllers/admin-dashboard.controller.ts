import type { Response } from "express";

import {
  BookingStatus,
  PropertyStatus,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

export const getAdminDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const [
      totalUsers,
      totalVendors,
      totalProperties,
      totalBookings,
      totalRevenue,
      totalCommission,
      pendingVendors,
      approvedVendors,
      rejectedVendors,
      pendingProperties,
      approvedProperties,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,
      totalPayments,
      totalPaidAmount,
      totalPendingAmount,
      totalPayouts,
      totalPaidPayouts,
      pendingCommissions,
      recentBookings,
      monthlyTrend,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.vendor.count(),
      prisma.property.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { estimatedTotal: true },
      }),
      prisma.booking.aggregate({
        _sum: { adminCommission: true },
      }),
      prisma.vendor.count({
        where: { kycStatus: "PENDING" },
      }),
      prisma.vendor.count({
        where: { kycStatus: "APPROVED" },
      }),
      prisma.vendor.count({
        where: { kycStatus: "REJECTED" },
      }),
      prisma.property.count({
        where: { status: PropertyStatus.PENDING_APPROVAL },
      }),
      prisma.property.count({
        where: { status: PropertyStatus.APPROVED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.REQUESTED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.CONFIRMED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.COMPLETED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.CANCELLED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.REJECTED },
      }),
      prisma.payment.count(),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.vendorCommission.count(),
      prisma.vendorCommission.aggregate({
        where: { status: "PAID" },
        _sum: { commissionAmount: true },
      }),
      prisma.vendorCommission.aggregate({
        where: { status: "PENDING" },
        _sum: { commissionAmount: true },
      }),
      prisma.booking.findMany({
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
      prisma.$queryRaw<
        Array<{
          month: string;
          revenue: number;
          bookings: number;
        }>
      >`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "created_at"), 'YYYY-MM') AS "month",
          COALESCE(SUM("estimated_total"), 0) AS "revenue",
          COUNT(*) AS "bookings"
        FROM "bookings"
        WHERE "created_at" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "created_at")
        ORDER BY DATE_TRUNC('month', "created_at") ASC
      `,
    ]);

    const totalRevenueValue =
      totalRevenue._sum.estimatedTotal !== null
        ? Number(totalRevenue._sum.estimatedTotal)
        : 0;

    const totalCommissionValue =
      totalCommission._sum.adminCommission !== null
        ? Number(totalCommission._sum.adminCommission)
        : 0;

    const totalPaidAmountValue =
      totalPaidAmount._sum.amount !== null
        ? Number(totalPaidAmount._sum.amount)
        : 0;

    const totalPendingAmountValue =
      totalPendingAmount._sum.amount !== null
        ? Number(totalPendingAmount._sum.amount)
        : 0;

    const totalPaidPayoutsValue =
      totalPaidPayouts._sum.commissionAmount !== null
        ? Number(totalPaidPayouts._sum.commissionAmount)
        : 0;

    const pendingCommissionsValue =
      pendingCommissions._sum.commissionAmount !== null
        ? Number(pendingCommissions._sum.commissionAmount)
        : 0;

    const currentYear = new Date().getFullYear();

    const revenueByMonth = new Array(12).fill(0);
    const bookingsByMonth = new Array(12).fill(0);

    for (const entry of monthlyTrend) {
      const date = new Date(entry.month + "-01");
      const monthIndex = date.getMonth();
      const year = date.getFullYear();

      if (year === currentYear) {
        revenueByMonth[monthIndex] = Number(entry.revenue);
        bookingsByMonth[monthIndex] = Number(entry.bookings);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        totalUsers,
        totalVendors,
        totalProperties,
        totalBookings,
        totalRevenue: totalRevenueValue,
        totalCommission: totalCommissionValue,
        vendorStats: {
          pending: pendingVendors,
          approved: approvedVendors,
          rejected: rejectedVendors,
        },
        propertyStats: {
          pending: pendingProperties,
          approved: approvedProperties,
        },
        bookingStats: {
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          rejected: rejectedBookings,
        },
        paymentStats: {
          total: totalPayments,
          totalPaid: totalPaidAmountValue,
          totalPending: totalPendingAmountValue,
        },
        payoutStats: {
          total: totalPayouts,
          totalPaid: totalPaidPayoutsValue,
          pending: pendingCommissionsValue,
        },
        monthlyRevenue: revenueByMonth,
        monthlyBookings: bookingsByMonth,
        recentBookings,
      },
    });
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch dashboard stats",
    });
  }
};