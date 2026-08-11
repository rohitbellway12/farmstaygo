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

export const getPublicPlatformSettings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const [
      siteName,
      siteLogoUrl,
      siteFaviconUrl,
      defaultCurrency,
      timezone,
    ] = await Promise.all([
      prisma.setting.findUnique({
        where: { key: "site_name" },
        select: { value: true },
      }),
      prisma.setting.findUnique({
        where: { key: "site_logo_url" },
        select: { value: true },
      }),
      prisma.setting.findUnique({
        where: { key: "site_favicon_url" },
        select: { value: true },
      }),
      prisma.setting.findUnique({
        where: { key: "default_currency" },
        select: { value: true },
      }),
      prisma.setting.findUnique({
        where: { key: "timezone" },
        select: { value: true },
      }),
    ]);

    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    const resolveUrl = (url: string | null | undefined): string | null => {
      if (!url) {
        return null;
      }

      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }

      return `${baseUrl}${url}`;
    };

    return res.status(200).json({
      success: true,
      message: "Public platform settings fetched successfully",
      data: {
        siteName: siteName?.value || "FarmStay",
        siteLogoUrl: resolveUrl(siteLogoUrl?.value),
        siteFaviconUrl: resolveUrl(siteFaviconUrl?.value),
        defaultCurrency: defaultCurrency?.value || "INR",
        timezone: timezone?.value || "Asia/Kolkata",
      },
    });
  } catch (error) {
    console.error(
      "Get public platform settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch platform settings",
    });
  }
};
