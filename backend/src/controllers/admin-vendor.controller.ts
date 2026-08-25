import type { Response } from "express";

import bcrypt from "bcryptjs";
import { z } from "zod";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import prisma from "../config/database.js";

import {
  KycStatus,
  Prisma,
} from "../generated/prisma/client.js";

import {
  CommissionStatus,
} from "../generated/prisma/enums.js";

import { sendAccountCreatedEmail } from "../services/email.js";

/*
|--------------------------------------------------------------------------
| Request Body Types
|--------------------------------------------------------------------------
*/

interface CreateVendorBody {
  firstName: string;
  lastName?: string;
  businessName: string;
  email: string;
  mobile: string;
  password: string;
  commissionRate?: string | number;
}

interface RejectVendorBody {
  reason?: unknown;
}

/*
|--------------------------------------------------------------------------
| Admin: Get Vendor List
|--------------------------------------------------------------------------
|
| Optional query parameters:
| ?search=villa
| ?status=ALL
| ?status=PENDING
| ?status=APPROVED
| ?status=REJECTED
| ?status=NOT_SUBMITTED
|
*/

export const getAdminVendors = async (
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

    const where: Prisma.VendorWhereInput = {};

    if (requestedStatus !== "ALL") {
      where.kycStatus = requestedStatus as KycStatus;
    }

    if (search) {
      where.OR = [
        {
          businessName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          user: {
            firstName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            lastName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            mobile: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        businessName: true,
        kycStatus: true,
        panNumber: true,
        aadhaarNumber: true,
        addressLine: true,
        city: true,
        state: true,
        postalCode: true,
        bankAccountName: true,
        bankAccountNumber: true,
        bankIfscCode: true,
        gstNumber: true,
        commissionRate: true,
        kycSubmittedAt: true,
        kycReviewedAt: true,
        kycRejectionReason: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            status: true,
            emailVerified: true,
            mobileVerified: true,
            createdAt: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Vendor list fetched successfully",
      data: vendors,
      total: vendors.length,
    });
  } catch (error) {
    console.error(
      "Get admin vendors error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch vendor list",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Create Vendor
|--------------------------------------------------------------------------
|
| Vendors created directly by admin are auto-approved.
|
*/

export const createAdminVendor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const schema = z.object({
      firstName: z.string().trim().min(2, "First name is required"),
      lastName: z.string().trim().optional(),
      businessName: z.string().trim().min(2, "Business name is required"),
      email: z.string().trim().email("Valid email is required"),
      mobile: z.string().trim().min(10).max(15),
      password: z.string().min(8, "Password must be at least 8 characters"),
      commissionRate: z
        .string()
        .trim()
        .optional()
        .refine(
          (val) => {
            if (!val) return true;
            const num = Number(val);
            return !Number.isNaN(num) && num >= 0 && num <= 100;
          },
          {
            message: "Commission rate must be between 0 and 100",
          }
        ),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      firstName,
      lastName,
      businessName,
      email,
      mobile,
      password,
      commissionRate,
    } = validation.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { mobile }],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const commissionRateValue = commissionRate
      ? Number(commissionRate)
      : null;

    const result = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          firstName,
          lastName,
          email,
          mobile,
          password: hashedPassword,
          role: "VENDOR",
          status: "ACTIVE",
        },
      });

      const vendor = await transaction.vendor.create({
        data: {
          userId: user.id,
          businessName,
          kycStatus: "APPROVED",
          commissionRate: commissionRateValue,
        },
      });

      return { user, vendor };
    });

    void sendAccountCreatedEmail({
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      role: result.user.role,
    }).catch((error) => {
      console.error("Send account created email error:", error);
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: {
        id: result.vendor.id,
        businessName: result.vendor.businessName,
        kycStatus: result.vendor.kycStatus,
        commissionRate: result.vendor.commissionRate,
        user: {
          id: result.user.id,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          email: result.user.email,
          mobile: result.user.mobile,
          role: result.user.role,
          status: result.user.status,
        },
      },
    });
  } catch (error) {
    console.error(
      "Create admin vendor error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create vendor",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Approve Vendor
|--------------------------------------------------------------------------
*/

export const approveAdminVendor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const vendorId = String(
      req.params.id || ""
    ).trim();

    if (!vendorId) {
      return res.status(422).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    const vendorIdNumber = Number(vendorId);

    if (Number.isNaN(vendorIdNumber)) {
      return res.status(422).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const existingVendor =
      await prisma.vendor.findUnique({
        where: {
          id: vendorIdNumber,
        },
        select: {
          id: true,
          kycStatus: true,
        },
      });

    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (existingVendor.kycStatus === "APPROVED") {
      return res.status(409).json({
        success: false,
        message: "Vendor is already approved",
      });
    }

    if (existingVendor.kycStatus !== "PENDING") {
      return res.status(409).json({
        success: false,
        message:
          "Vendor KYC must be submitted before approval",
      });
    }

    const approvedVendor =
      await prisma.$transaction(async (transaction) => {
        const vendor = await transaction.vendor.update({
          where: {
            id: vendorIdNumber,
          },
          data: {
            kycStatus: "APPROVED",
            kycReviewedAt: new Date(),
            kycRejectionReason: null,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                status: true,
              },
            },
          },
        });

        if (vendor.user.status !== "ACTIVE") {
          await transaction.user.update({
            where: {
              id: vendor.user.id,
            },
            data: {
              status: "ACTIVE",
            },
          });

          return transaction.vendor.findUnique({
            where: {
              id: vendorIdNumber,
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  mobile: true,
                  status: true,
                },
              },
            },
          });
        }

        return vendor;
      });

    return res.status(200).json({
      success: true,
      message: "Vendor approved successfully",
      data: approvedVendor,
    });
  } catch (error) {
    console.error(
      "Approve vendor error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to approve vendor",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Deactivate Vendor
|--------------------------------------------------------------------------
*/

export const deactivateAdminVendor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const vendorIdNumber = Number(
      String(req.params.id || "").trim()
    );

    if (Number.isNaN(vendorIdNumber)) {
      return res.status(422).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const existingVendor =
      await prisma.vendor.findUnique({
        where: {
          id: vendorIdNumber,
        },
        select: {
          id: true,
          userId: true,
        },
      });

    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: existingVendor.userId,
        },
        data: {
          status: "INACTIVE",
        },
      }),
      prisma.vendor.update({
        where: {
          id: existingVendor.id,
        },
        data: {
          kycStatus: "PENDING",
          kycReviewedAt: null,
          kycRejectionReason:
            "Vendor account was deactivated by admin.",
        },
      }),
    ]);

    await prisma.property.updateMany({
      where: {
        vendorId: existingVendor.id,
        status: {
          in: ["APPROVED", "PENDING_APPROVAL"],
        },
      },
      data: {
        status: "SUSPENDED",
      },
    });

    const vendor = await prisma.vendor.findUnique({
      where: {
        id: vendorIdNumber,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            status: true,
            emailVerified: true,
            mobileVerified: true,
            createdAt: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Vendor deactivated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error(
      "Deactivate vendor error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to deactivate vendor",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Activate Vendor
|--------------------------------------------------------------------------
*/

export const activateAdminVendor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const vendorIdNumber = Number(
      String(req.params.id || "").trim()
    );

    if (Number.isNaN(vendorIdNumber)) {
      return res.status(422).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const existingVendor =
      await prisma.vendor.findUnique({
        where: {
          id: vendorIdNumber,
        },
        select: {
          id: true,
          userId: true,
        },
      });

    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await prisma.user.update({
      where: {
        id: existingVendor.userId,
      },
      data: {
        status: "ACTIVE",
      },
    });

    const vendor = await prisma.vendor.findUnique({
      where: {
        id: vendorIdNumber,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            status: true,
            emailVerified: true,
            mobileVerified: true,
            createdAt: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Vendor activated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error(
      "Activate vendor error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to activate vendor",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Delete Vendor
|--------------------------------------------------------------------------
*/

export const deleteAdminVendor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const vendorIdNumber = Number(
      String(req.params.id || "").trim()
    );

    if (Number.isNaN(vendorIdNumber)) {
      return res.status(422).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const existingVendor =
      await prisma.vendor.findUnique({
        where: {
          id: vendorIdNumber,
        },
        select: {
          id: true,
          userId: true,
        },
      });

    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await prisma.user.delete({
      where: {
        id: existingVendor.userId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete vendor",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Reject Vendor
|--------------------------------------------------------------------------
*/

export const rejectAdminVendor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const vendorId = String(
      req.params.id || ""
    ).trim();

    if (!vendorId) {
      return res.status(422).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    const vendorIdNumber = Number(vendorId);

    if (Number.isNaN(vendorIdNumber)) {
      return res.status(422).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const body = req.body as RejectVendorBody;

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (reason.length < 5) {
      return res.status(422).json({
        success: false,
        message:
          "Please provide a valid rejection reason",
        errors: {
          reason:
            "Rejection reason must contain at least 5 characters.",
        },
      });
    }

    const existingVendor =
      await prisma.vendor.findUnique({
        where: {
          id: vendorIdNumber,
        },
        select: {
          id: true,
          kycStatus: true,
        },
      });

    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (existingVendor.kycStatus === "REJECTED") {
      return res.status(409).json({
        success: false,
        message: "Vendor is already rejected",
      });
    }

    const rejectedVendor =
      await prisma.vendor.update({
        where: {
          id: vendorIdNumber,
        },
        data: {
          kycStatus: "REJECTED",
          kycReviewedAt: new Date(),
          kycRejectionReason: reason,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobile: true,
              status: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message: "Vendor rejected successfully",
      data: rejectedVendor,
    });
  } catch (error) {
    console.error(
      "Reject vendor error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to reject vendor",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Update Vendor Commission Rate
|--------------------------------------------------------------------------
|
| PATCH /api/admin/vendors/:id/commission
|
| Request body:
| {
|   "commissionRate": "15.5"
| }
|
*/

export const updateVendorCommission =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const vendorId =
        typeof req.params.id ===
        "string"
          ? req.params.id.trim()
          : "";

      const commissionRate =
        typeof req.body.commissionRate ===
        "number"
          ? req.body.commissionRate
          : Number(
              req.body.commissionRate
            );

      if (
        !vendorId ||
        !Number.isFinite(
          commissionRate
        ) ||
        commissionRate < 0 ||
        commissionRate > 100
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Valid vendor ID and commission rate (0-100) are required",
        });
      }

      const vendorIdNumber =
        typeof vendorId === "string"
          ? Number(vendorId)
          : vendorId;

      const vendor =
        await prisma.vendor.findFirst({
          where: { id: vendorIdNumber },
        });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message:
            "Vendor not found",
        });
      }

      const updatedVendor =
        await prisma.vendor.update({
          where: { id: vendorIdNumber },
          data: {
            commissionRate: new Prisma.Decimal(
              commissionRate
            ),
          },
          select: {
            id: true,
            businessName: true,
            commissionRate: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

      return res.status(200).json({
        success: true,
        message:
          "Commission rate updated successfully",
        data: updatedVendor,
      });
    } catch (error) {
      console.error(
        "Update vendor commission error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update commission rate",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Admin: Get Vendor Commission History
|--------------------------------------------------------------------------
|
| GET /api/admin/vendors/:id/commissions
|
| Optional query parameters:
|
| ?status=PENDING
| ?status=PAID
| ?status=CANCELLED
|
*/

export const getVendorCommissions =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const vendorId =
        typeof req.params.id ===
        "string"
          ? req.params.id.trim()
          : "";

      const requestedStatus =
        typeof req.query.status ===
        "string"
          ? req.query.status
              .trim()
              .toUpperCase()
          : "ALL";

      if (!vendorId) {
        return res.status(422).json({
          success: false,
          message:
            "Vendor ID is required",
        });
      }

      const vendorIdNumber =
        typeof vendorId === "string"
          ? Number(vendorId)
          : vendorId;

      const where: Prisma.VendorCommissionWhereInput =
        {
          vendorId: vendorIdNumber,
        };

      if (requestedStatus !== "ALL") {
        where.status =
          requestedStatus as CommissionStatus;
      }

      const commissions =
        await prisma.vendorCommission.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          include: {
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
                    id: true,
                    title: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
        });

      const summary =
        await prisma.vendorCommission.aggregate(
          {
            where,
            _sum: {
              bookingAmount: true,
              commissionAmount: true,
              vendorEarning: true,
            },
            _count: {
              id: true,
            },
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Vendor commissions fetched successfully",
        data: commissions,
        summary: {
          totalCommissions:
            summary._count.id || 0,
          totalBookingAmount:
            summary._sum.bookingAmount
              ? Number(
                  summary._sum.bookingAmount
                )
              : 0,
          totalCommissionAmount:
            summary._sum.commissionAmount
              ? Number(
                  summary._sum.commissionAmount
                )
              : 0,
          totalVendorEarning:
            summary._sum.vendorEarning
              ? Number(
                  summary._sum.vendorEarning
                )
              : 0,
        },
      });
    } catch (error) {
      console.error(
        "Get vendor commissions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch vendor commissions",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Admin: Get All Commissions Across Vendors
|--------------------------------------------------------------------------
|
| GET /api/admin/vendors/commissions
|
| Optional query parameters:
|
| ?status=PENDING
| ?status=PAID
| ?status=CANCELLED
|
*/

export const getAllCommissions =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const requestedStatus =
        typeof req.query.status ===
        "string"
          ? req.query.status
              .trim()
              .toUpperCase()
          : "ALL";

      const where: Prisma.VendorCommissionWhereInput =
        {};

      if (requestedStatus !== "ALL") {
        where.status =
          requestedStatus as CommissionStatus;
      }

      const commissions =
        await prisma.vendorCommission.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            vendor: {
              select: {
                id: true,
                businessName: true,
                user: {
                  select: {
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
                    id: true,
                    title: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
        });

      const summary =
        await prisma.vendorCommission.aggregate(
          {
            where,
            _sum: {
              bookingAmount: true,
              commissionAmount: true,
              vendorEarning: true,
            },
            _count: {
              id: true,
            },
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Commissions fetched successfully",
        data: commissions,
        summary: {
          totalCommissions:
            summary._count.id || 0,
          totalBookingAmount:
            summary._sum.bookingAmount
              ? Number(
                  summary._sum.bookingAmount
                )
              : 0,
          totalCommissionAmount:
            summary._sum.commissionAmount
              ? Number(
                  summary._sum.commissionAmount
                )
              : 0,
          totalVendorEarning:
            summary._sum.vendorEarning
              ? Number(
                  summary._sum.vendorEarning
                )
              : 0,
        },
      });
    } catch (error) {
      console.error(
        "Get all commissions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch commissions",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Admin: Mark Commission as Paid
|--------------------------------------------------------------------------
|
| PATCH /api/admin/commissions/:id/pay
|
*/

export const payVendorCommission =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const commissionId =
        typeof req.params.id ===
        "string"
          ? req.params.id.trim()
          : "";

      if (!commissionId) {
        return res.status(422).json({
          success: false,
          message:
            "Commission ID is required",
        });
      }

      const commission =
        await prisma.vendorCommission.findFirst({
          where: { id: commissionId },
        });

      if (!commission) {
        return res.status(404).json({
          success: false,
          message:
            "Commission record not found",
        });
      }

      if (
        commission.status ===
        CommissionStatus.PAID
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This commission has already been paid",
        });
      }

      const updatedCommission =
        await prisma.vendorCommission.update(
          {
            where: { id: commissionId },
            data: {
              status:
                CommissionStatus.PAID,
              paidAt: new Date(),
            },
            include: {
              vendor: {
                select: {
                  businessName: true,
                  user: {
                    select: {
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
                  property: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
            },
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Commission marked as paid successfully",
        data: updatedCommission,
      });
    } catch (error) {
      console.error(
        "Pay vendor commission error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to process commission payment",
      });
    }
  };
