import type { Response } from "express";

import {
  BookingStatus,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

export const getAdminAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const currentYear = new Date().getFullYear();

    const fromQuery = req.query.from as string | undefined;
    const toQuery = req.query.to as string | undefined;

    const fromDate = fromQuery
      ? new Date(fromQuery)
      : new Date(currentYear, new Date().getMonth() - 11, 1);
    const toDate = toQuery
      ? new Date(toQuery)
      : new Date();

    const fromDateParam = fromDate.toISOString().slice(0, 10);
    const toDateParam = toDate.toISOString().slice(0, 10);

    const [
      totalRevenue,
      totalBookings,
      totalVendors,
      totalProperties,
      totalCompletedBookings,
      totalCancelledBookings,
      totalRejectedBookings,
      totalConfirmedBookings,
      totalRequestedBookings,
      avgBookingValue,
      occupancyRate,
      monthlyTrend,
      topVendors,
      categoryRevenue,
    ] = await Promise.all([
      prisma.booking.aggregate({
        _sum: { estimatedTotal: true },
      }),
      prisma.booking.count(),
      prisma.vendor.count(),
      prisma.property.count(),
      prisma.booking.count({
        where: { status: BookingStatus.COMPLETED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.CANCELLED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.REJECTED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.CONFIRMED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.REQUESTED },
      }),
      prisma.booking.aggregate({
        _avg: { estimatedTotal: true },
      }),
      prisma.booking.aggregate({
        _avg: { totalNights: true },
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
        WHERE "created_at" >= ${fromDateParam}
          AND "created_at" <= ${toDateParam}
        GROUP BY DATE_TRUNC('month', "created_at")
        ORDER BY DATE_TRUNC('month', "created_at") ASC
      `,
      prisma.$queryRaw<
        Array<{
          vendorId: number;
          businessName: string;
          totalRevenue: number;
          totalBookings: number;
        }>
      >`
        SELECT
          v.id AS "vendorId",
          v.business_name AS "businessName",
          COALESCE(SUM(b.estimated_total), 0) AS "totalRevenue",
          COUNT(b.id) AS "totalBookings"
        FROM "vendors" v
        JOIN "Property" p ON p."vendorId" = v.id
        JOIN "bookings" b ON b."property_id" = p.id
        GROUP BY v.id, v.business_name
        ORDER BY "totalRevenue" DESC
        LIMIT 10
      `,
      prisma.$queryRaw<
        Array<{
          categoryId: string;
          categoryName: string;
          totalRevenue: number;
        }>
      >`
        SELECT
          pc.id AS "categoryId",
          pc.name AS "categoryName",
          COALESCE(SUM(b.estimated_total), 0) AS "totalRevenue"
        FROM "PropertyCategory" pc
        JOIN "Property" p ON p."categoryId" = pc.id
        JOIN "bookings" b ON b."property_id" = p.id
        GROUP BY pc.id, pc.name
        ORDER BY "totalRevenue" DESC
      `,
    ]);

    const totalRevenueValue =
      totalRevenue._sum.estimatedTotal !== null
        ? Number(totalRevenue._sum.estimatedTotal)
        : 0;

    const avgBookingValueValue =
      avgBookingValue._avg.estimatedTotal !== null
        ? Number(avgBookingValue._avg.estimatedTotal)
        : 0;

    const occupancyRateValue =
      totalBookings > 0
        ? Math.round((totalCompletedBookings / totalBookings) * 100)
        : 0;

    const revenueWindow = Array.from({ length: 12 }).map((_, index) => {
      const date = new Date(fromDate.getFullYear(), fromDate.getMonth() + index, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString("en-US", { month: "short" });

      return { monthKey, label };
    });

    const revenueByMonth = revenueWindow.map(() => 0);
    const bookingsByMonth = revenueWindow.map(() => 0);
    const monthlyLabels = revenueWindow.map((entry) => entry.label);

    for (const entry of monthlyTrend) {
      const monthIndex = revenueWindow.findIndex((item) => item.monthKey === entry.month);
      if (monthIndex >= 0) {
        revenueByMonth[monthIndex] = Number(entry.revenue);
        bookingsByMonth[monthIndex] = Number(entry.bookings);
      }
    }

    const topVendorsData = topVendors.map((v) => ({
      id: String(v.vendorId),
      businessName: v.businessName,
      revenue: Number(v.totalRevenue),
      bookings: Number(v.totalBookings),
    }));

    const categoryBreakdown = categoryRevenue.map((c) => ({
      label: c.categoryName,
      value: Number(c.totalRevenue),
      color: `hsl(${Math.abs(c.categoryId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360)}, 70%, 55%)`,
    }));

    return res.status(200).json({
      success: true,
      message: "Analytics fetched successfully",
      data: {
        totalRevenue: totalRevenueValue,
        totalBookings,
        totalVendors,
        totalProperties,
        completedBookings: totalCompletedBookings,
        cancelledBookings: totalCancelledBookings,
        rejectedBookings: totalRejectedBookings,
        confirmedBookings: totalConfirmedBookings,
        requestedBookings: totalRequestedBookings,
        averageBookingValue: avgBookingValueValue,
        occupancyRate: occupancyRateValue,
        monthlyLabels,
        monthlyRevenue: revenueByMonth,
        monthlyBookings: bookingsByMonth,
        topVendors: topVendorsData,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error("Get admin analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch analytics",
    });
  }
};