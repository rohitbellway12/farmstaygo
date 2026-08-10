import type { Response } from "express";
import { z } from "zod";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const vendorBankSchema = z.object({
  bankAccountName: z
    .string()
    .trim()
    .min(2, "Account holder name is required"),
  bankAccountNumber: z
    .string()
    .trim()
    .min(6, "Bank account number is required"),
  bankIfscCode: z
    .string()
    .trim()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Please enter a valid IFSC code"),
});

export const getVendorBankDetails = async (
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

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        bankAccountName: true,
        bankAccountNumber: true,
        bankIfscCode: true,
        kycStatus: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile was not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor bank details fetched successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Get vendor bank details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch bank details",
    });
  }
};

export const updateVendorBankDetails = async (
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

    const validation = vendorBankSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Please correct the bank details",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile was not found",
      });
    }

    const data = validation.data;

    const vendor = await prisma.vendor.update({
      where: {
        id: existingVendor.id,
      },
      data: {
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankIfscCode: data.bankIfscCode.toUpperCase(),
      },
      select: {
        id: true,
        bankAccountName: true,
        bankAccountNumber: true,
        bankIfscCode: true,
        kycStatus: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Update vendor bank details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update bank details",
    });
  }
};
