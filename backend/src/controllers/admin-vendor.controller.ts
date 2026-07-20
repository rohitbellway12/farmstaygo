import type { Response } from "express";

import bcrypt from "bcryptjs";
import { z } from "zod";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import prisma from "../config/database.js";

import type {
  KycStatus,
  Prisma,
} from "../generated/prisma/client.js";

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
