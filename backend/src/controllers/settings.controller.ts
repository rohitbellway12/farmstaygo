import type { Response } from "express";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

interface PlatformSettings {
  siteName: string;
  siteLogoUrl: string | null;
  siteFaviconUrl: string | null;
  defaultCurrency: string;
  timezone: string;
}

interface PaymentSettings {
  paymentMethods: string[];
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
  razorpayWebhookUrl: string | null;
}

const getSetting = async (key: string): Promise<string | null> => {
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });

  return setting?.value ?? null;
};

const parseJsonArray = (
  value: unknown,
  fallback: string[] = []
): string[] => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  return fallback;
};

export const getPlatformSettings = async (
  _req: AuthenticatedRequest,
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
      getSetting("site_name"),
      getSetting("site_logo_url"),
      getSetting("site_favicon_url"),
      getSetting("default_currency"),
      getSetting("timezone"),
    ]);

    const settings: PlatformSettings = {
      siteName: siteName || "FarmStay",
      siteLogoUrl: siteLogoUrl,
      siteFaviconUrl: siteFaviconUrl,
      defaultCurrency: defaultCurrency || "INR",
      timezone: timezone || "Asia/Kolkata",
    };

    return res.status(200).json({
      success: true,
      message: "Platform settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error(
      "Get platform settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch platform settings",
    });
  }
};

export const updatePlatformSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const body = req.body as Partial<PlatformSettings> & Record<string, unknown>;

    const siteName =
      typeof body.siteName === "string"
        ? body.siteName.trim()
        : "";
    const siteLogoUrl =
      typeof body.siteLogoUrl === "string"
        ? body.siteLogoUrl.trim() || null
        : null;
    const siteFaviconUrl =
      typeof body.siteFaviconUrl === "string"
        ? body.siteFaviconUrl.trim() || null
        : null;
    const defaultCurrency =
      typeof body.defaultCurrency === "string"
        ? body.defaultCurrency.trim().toUpperCase() || "INR"
        : "INR";
    const timezone =
      typeof body.timezone === "string"
        ? body.timezone.trim() || "Asia/Kolkata"
        : "Asia/Kolkata";

    const errors: Record<string, string> = {};

    if (!siteName) {
      errors.siteName =
        "Site name is required";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message:
          "Please correct the platform settings",
        errors,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.setting.upsert({
        where: { key: "site_name" },
        update: { value: siteName },
        create: { key: "site_name", value: siteName },
      });

      await tx.setting.upsert({
        where: { key: "site_logo_url" },
        update: { value: siteLogoUrl || "" },
        create: {
          key: "site_logo_url",
          value: siteLogoUrl || "",
        },
      });

      await tx.setting.upsert({
        where: { key: "site_favicon_url" },
        update: { value: siteFaviconUrl || "" },
        create: {
          key: "site_favicon_url",
          value: siteFaviconUrl || "",
        },
      });

      await tx.setting.upsert({
        where: { key: "default_currency" },
        update: { value: defaultCurrency },
        create: {
          key: "default_currency",
          value: defaultCurrency,
        },
      });

      await tx.setting.upsert({
        where: { key: "timezone" },
        update: { value: timezone },
        create: { key: "timezone", value: timezone },
      });
    });

    const settings: PlatformSettings = {
      siteName,
      siteLogoUrl,
      siteFaviconUrl,
      defaultCurrency,
      timezone,
    };

    return res.status(200).json({
      success: true,
      message: "Platform settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error(
      "Update platform settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update platform settings",
    });
  }
};

export const getPaymentSettings = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const [
      paymentMethods,
      razorpayKeyId,
      razorpayKeySecret,
      razorpayWebhookUrl,
    ] = await Promise.all([
      getSetting("payment_methods"),
      getSetting("razorpay_key_id"),
      getSetting("razorpay_key_secret"),
      getSetting("razorpay_webhook_url"),
    ]);

    const settings: PaymentSettings = {
      paymentMethods: parseJsonArray(paymentMethods, [
        "ONLINE",
      ]),
      razorpayKeyId: razorpayKeyId,
      razorpayKeySecret: razorpayKeySecret,
      razorpayWebhookUrl: razorpayWebhookUrl,
    };

    return res.status(200).json({
      success: true,
      message: "Payment settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error(
      "Get payment settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payment settings",
    });
  }
};

export const updatePaymentSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const body = req.body as Partial<PaymentSettings> & Record<string, unknown>;

    const paymentMethods = Array.isArray(
      body.paymentMethods
    )
      ? body.paymentMethods.filter(
          (method): method is string =>
            typeof method === "string"
        )
      : ["ONLINE"];
    const razorpayKeyId =
      typeof body.razorpayKeyId === "string"
        ? body.razorpayKeyId.trim() || null
        : null;
    const razorpayKeySecret =
      typeof body.razorpayKeySecret === "string"
        ? body.razorpayKeySecret.trim() || null
        : null;
    const razorpayWebhookUrl =
      typeof body.razorpayWebhookUrl === "string"
        ? body.razorpayWebhookUrl.trim() || null
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.setting.upsert({
        where: { key: "payment_methods" },
        update: {
          value: JSON.stringify(paymentMethods),
        },
        create: {
          key: "payment_methods",
          value: JSON.stringify(paymentMethods),
        },
      });

      await tx.setting.upsert({
        where: { key: "razorpay_key_id" },
        update: { value: razorpayKeyId || "" },
        create: {
          key: "razorpay_key_id",
          value: razorpayKeyId || "",
        },
      });

      await tx.setting.upsert({
        where: { key: "razorpay_key_secret" },
        update: { value: razorpayKeySecret || "" },
        create: {
          key: "razorpay_key_secret",
          value: razorpayKeySecret || "",
        },
      });

      await tx.setting.upsert({
        where: { key: "razorpay_webhook_url" },
        update: { value: razorpayWebhookUrl || "" },
        create: {
          key: "razorpay_webhook_url",
          value: razorpayWebhookUrl || "",
        },
      });
    });

    const settings: PaymentSettings = {
      paymentMethods,
      razorpayKeyId,
      razorpayKeySecret,
      razorpayWebhookUrl,
    };

    return res.status(200).json({
      success: true,
      message: "Payment settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error(
      "Update payment settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update payment settings",
    });
  }
};
