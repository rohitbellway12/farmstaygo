import type { NextFunction, Response } from "express";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "./auth.middleware.js";

export const requireApprovedVendorKyc = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
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
        kycStatus: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile was not found",
      });
    }

    if (vendor.kycStatus !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message:
          "Please submit KYC and wait for admin approval before managing properties.",
      });
    }

    next();
  } catch (error) {
    console.error("Vendor KYC guard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify vendor KYC status",
    });
  }
};
