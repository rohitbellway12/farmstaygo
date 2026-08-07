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

export const getAdminReports = async (
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
      totalPaidRevenue,
      totalPendingRevenue,
      totalRequestedBookings,
      totalConfirmedBookings,
      totalCompletedBookings,
      totalCancelledBookings,
      totalRejectedBookings,
      monthlyTrend,
      topProperties,
    ] = await Promise.all([
      prisma.booking.aggregate({
        _sum: { estimatedTotal: true },
      }),
      prisma.booking.count(),
      prisma.vendor.count(),
      prisma.property.count(),
      prisma.booking.aggregate({
        where: { paymentStatus: "COMPLETED" },
        _sum: { estimatedTotal: true },
      }),
      prisma.booking.aggregate({
        where: { paymentStatus: "PENDING" },
        _sum: { estimatedTotal: true },
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
          propertyId: string;
          title: string;
          city: string | null;
          state: string | null;
          totalRevenue: number;
          totalBookings: number;
        }>
      >`
        SELECT
          p.id AS "propertyId",
          p.title AS "title",
          p.city AS "city",
          p.state AS "state",
          COALESCE(SUM(b.estimated_total), 0) AS "totalRevenue",
          COUNT(b.id) AS "totalBookings"
        FROM "Property" p
        JOIN "bookings" b ON b."property_id" = p.id
        GROUP BY p.id, p.title, p.city, p.state
        ORDER BY "totalRevenue" DESC
        LIMIT 10
      `,
    ]);

    const totalRevenueValue =
      totalRevenue._sum.estimatedTotal !== null
        ? Number(totalRevenue._sum.estimatedTotal)
        : 0;

    const totalPaidRevenueValue =
      totalPaidRevenue._sum.estimatedTotal !== null
        ? Number(totalPaidRevenue._sum.estimatedTotal)
        : 0;

    const totalPendingRevenueValue =
      totalPendingRevenue._sum.estimatedTotal !== null
        ? Number(totalPendingRevenue._sum.estimatedTotal)
        : 0;

    const revenueWindow = Array.from({ length: 12 }).map((_, index) => {
      const date = new Date(fromDate.getFullYear(), fromDate.getMonth() + index, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString("en-US", { month: "short" });

      return { monthKey, label };
    });

    const revenueByMonth = revenueWindow.map(() => 0);
    const bookingsByMonth = revenueWindow.map(() => 0);
    const monthlyLabels = revenueWindow.map((item) => item.label);

    for (const entry of monthlyTrend) {
      const monthIndex = revenueWindow.findIndex((item) => item.monthKey === entry.month);
      if (monthIndex >= 0) {
        revenueByMonth[monthIndex] = Number(entry.revenue);
        bookingsByMonth[monthIndex] = Number(entry.bookings);
      }
    }

    const topPropertiesData = topProperties
      .map((prop) => ({
        id: prop.propertyId,
        title: prop.title,
        city: prop.city,
        state: prop.state,
        bookings: Number(prop.totalBookings),
        revenue: Number(prop.totalRevenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const aggregatedProperties = topPropertiesData.reduce(
      (acc, curr) => {
        const existing = acc.find((p) => p.id === curr.id);
        if (existing) {
          existing.bookings += curr.bookings;
          existing.revenue += curr.revenue;
        } else {
          acc.push(curr);
        }
        return acc;
      },
      [] as Array<{ id: string; title: string; city: string | null; bookings: number; revenue: number }>
    );

    return res.status(200).json({
      success: true,
      message: "Reports fetched successfully",
      data: {
        totalRevenue: totalRevenueValue,
        totalPaidRevenue: totalPaidRevenueValue,
        totalPendingRevenue: totalPendingRevenueValue,
        totalBookings,
        totalVendors,
        totalProperties,
        totalRequestedBookings,
        totalConfirmedBookings,
        totalCompletedBookings,
        totalCancelledBookings,
        totalRejectedBookings,
        monthlyLabels,
        monthlyRevenue: revenueByMonth,
        monthlyBookings: bookingsByMonth,
        topProperties: aggregatedProperties,
      },
    });
  } catch (error) {
    console.error("Get admin reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch reports",
    });
  }
};