import type { Response } from "express";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  BookingStatus,
  CommissionStatus,
} from "../generated/prisma/enums.js";

export const getVendorEarnings = async (
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
        message: "You are not authorized to access this resource",
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile was not found",
      });
    }

    const [
      pendingCommissionAgg,
      paidCommissionAgg,
      totalBookingsCount,
      completedBookingsCount,
      totalRevenueAgg,
    ] = await Promise.all([
      prisma.vendorCommission.aggregate({
        where: {
          vendorId: vendor.id,
          status: CommissionStatus.PENDING,
        },
        _sum: {
          commissionAmount: true,
        },
      }),
      prisma.vendorCommission.aggregate({
        where: {
          vendorId: vendor.id,
          status: CommissionStatus.PAID,
        },
        _sum: {
          commissionAmount: true,
        },
      }),
      prisma.booking.count({
        where: {
          property: {
            vendorId: vendor.id,
          },
        },
      }),
      prisma.booking.count({
        where: {
          property: {
            vendorId: vendor.id,
          },
          status: BookingStatus.COMPLETED,
        },
      }),
      prisma.booking.aggregate({
        where: {
          property: {
            vendorId: vendor.id,
          },
        },
        _sum: {
          estimatedTotal: true,
        },
      }),
    ]);

    const pendingCommission =
      pendingCommissionAgg._sum.commissionAmount !== null
        ? Number(pendingCommissionAgg._sum.commissionAmount)
        : 0;

    const paidCommission =
      paidCommissionAgg._sum.commissionAmount !== null
        ? Number(paidCommissionAgg._sum.commissionAmount)
        : 0;

    const totalBookingsRevenue =
      totalRevenueAgg._sum.estimatedTotal !== null
        ? Number(totalRevenueAgg._sum.estimatedTotal)
        : 0;

    return res.status(200).json({
      success: true,
      message: "Vendor earnings fetched successfully",
      data: {
        totalEarnings: Number(vendor.totalEarnings),
        totalCommission: Number(vendor.totalCommission),
        pendingCommission,
        paidCommission,
        totalBookings: totalBookingsCount,
        completedBookings: completedBookingsCount,
        totalBookingsRevenue,
      },
    });
  } catch (error) {
    console.error("Get vendor earnings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch earnings details",
    });
  }
};

export const getVendorPayouts = async (
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
        message: "You are not authorized to access this resource",
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile was not found",
      });
    }

    const payouts = await prisma.vendorCommission.findMany({
      where: {
        vendorId: vendor.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
        booking: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            guestName: true,
            property: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    const formattedPayouts = payouts.map((payout) => ({
      id: payout.id,
      status: payout.status,
      bookingAmount: Number(payout.bookingAmount),
      commissionRate: Number(payout.commissionRate),
      commissionAmount: Number(payout.commissionAmount),
      vendorEarning: Number(payout.vendorEarning),
      paidAt: payout.paidAt,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
      vendor: payout.vendor,
      booking: {
        id: payout.booking.id,
        property: {
          title: payout.booking.property.title,
        },
        checkIn: payout.booking.checkIn,
        checkOut: payout.booking.checkOut,
        guestName: payout.booking.guestName,
      },
    }));

    return res.status(200).json({
      success: true,
      message: "Vendor payouts fetched successfully",
      data: formattedPayouts,
    });
  } catch (error) {
    console.error("Get vendor payouts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payout details",
    });
  }
};
