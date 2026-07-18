import type { Response } from "express";
import { z } from "zod";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const vendorKycSchema = z.object({
  panNumber: z
    .string()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Please enter a valid PAN number"),
  aadhaarNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{12}$/, "Please enter a valid 12 digit Aadhaar number"),
  addressLine: z.string().trim().min(5, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  postalCode: z.string().trim().min(3, "Postal code is required"),
  bankAccountName: z.string().trim().min(2, "Account holder name is required"),
  bankAccountNumber: z.string().trim().min(6, "Bank account number is required"),
  bankIfscCode: z
    .string()
    .trim()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Please enter a valid IFSC code"),
  gstNumber: z.string().trim().optional(),
});

export const getVendorKyc = async (
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
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile was not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor KYC fetched successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Get vendor KYC error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch KYC details",
    });
  }
};

export const submitVendorKyc = async (
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

    const validation = vendorKycSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Please correct the KYC information",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        kycStatus: true,
      },
    });

    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile was not found",
      });
    }

    if (existingVendor.kycStatus === "APPROVED") {
      return res.status(409).json({
        success: false,
        message: "KYC is already approved and cannot be changed from here",
      });
    }

    const data = validation.data;

    const vendor = await prisma.vendor.update({
      where: {
        id: existingVendor.id,
      },
      data: {
        panNumber: data.panNumber.toUpperCase(),
        aadhaarNumber: data.aadhaarNumber,
        addressLine: data.addressLine,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankIfscCode: data.bankIfscCode.toUpperCase(),
        gstNumber: data.gstNumber?.toUpperCase() || null,
        kycStatus: "PENDING",
        kycSubmittedAt: new Date(),
        kycReviewedAt: null,
        kycRejectionReason: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "KYC submitted successfully. Please wait for admin approval.",
      data: vendor,
    });
  } catch (error) {
    console.error("Submit vendor KYC error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit KYC details",
    });
  }
};
