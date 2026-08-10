import type { Request, Response } from "express";

import prisma from "../config/database.js";

export const getPublicPaymentSettings = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const paymentMethodsSetting =
      await prisma.setting.findUnique({
        where: { key: "payment_methods" },
        select: { value: true },
      });

    const rawPaymentMethods = paymentMethodsSetting?.value;
    let paymentMethods: string[] = ["ONLINE"];

    if (typeof rawPaymentMethods === "string" && rawPaymentMethods.trim()) {
      try {
        const parsed = JSON.parse(rawPaymentMethods);

        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (method): method is string =>
              typeof method === "string" &&
              ["ONLINE", "CASH", "BANK_TRANSFER"].includes(
                method.toUpperCase()
              )
          );

          if (valid.length > 0) {
            paymentMethods = valid.map((m) =>
              m.toUpperCase()
            );
          }
        }
      } catch {
        // ignore invalid JSON
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Public payment settings fetched successfully",
      data: {
        paymentMethods,
      },
    });
  } catch (error) {
    console.error(
      "Get public payment settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch payment settings",
    });
  }
};

export const getPublicVendorBankDetails = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const propertyId = typeof req.query.propertyId === "string"
      ? req.query.propertyId.trim()
      : "";

    if (!propertyId) {
      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        vendor: {
          select: {
            bankAccountName: true,
            bankAccountNumber: true,
            bankIfscCode: true,
          },
        },
      },
    });

    if (!property || !property.vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor bank details not found",
      });
    }

    const { bankAccountName, bankAccountNumber, bankIfscCode } = property.vendor;

    if (!bankAccountName || !bankAccountNumber || !bankIfscCode) {
      return res.status(404).json({
        success: false,
        message: "Vendor bank details not configured",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor bank details fetched successfully",
      data: {
        bankAccountName,
        bankAccountNumber,
        bankIfscCode,
      },
    });
  } catch (error) {
    console.error(
      "Get public vendor bank details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch vendor bank details",
    });
  }
};
