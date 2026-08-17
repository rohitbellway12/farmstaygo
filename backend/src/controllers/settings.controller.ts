import type { Response } from "express";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  createSettingsImageUpload,
  deletePublicStorageFile,
  getSettingsImageStoragePath,
} from "../config/upload.js";

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

interface MapSettings {
  mapProvider: string;
  mapApiKey: string | null;
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
  req: AuthenticatedRequest,
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

    const settings: PlatformSettings = {
      siteName: siteName || "FarmStay",
      siteLogoUrl: resolveUrl(siteLogoUrl),
      siteFaviconUrl: resolveUrl(siteFaviconUrl),
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
    const isFormData =
      req.body instanceof FormData ||
      (typeof req.headers?.["content-type"] === "string" &&
        req.headers["content-type"].includes("multipart/form-data"));

    let siteName = "";
    let defaultCurrency = "INR";
    let timezone = "Asia/Kolkata";
    let siteLogoUrl: string | null = null;
    let siteFaviconUrl: string | null = null;

    if (isFormData) {
      const body = req.body as Record<string, unknown>;

      siteName =
        typeof body.siteName === "string"
          ? body.siteName.trim()
          : "";
      defaultCurrency =
        typeof body.defaultCurrency === "string"
          ? body.defaultCurrency.trim().toUpperCase() || "INR"
          : "INR";
      timezone =
        typeof body.timezone === "string"
          ? body.timezone.trim() || "Asia/Kolkata"
          : "Asia/Kolkata";

      const files = (req as unknown as { files?: Record<string, Express.Multer.File[]> }).files;

      if (files?.logo && files.logo[0]) {
        siteLogoUrl = getSettingsImageStoragePath(
          files.logo[0].filename
        );
      }

      if (files?.favicon && files.favicon[0]) {
        siteFaviconUrl = getSettingsImageStoragePath(
          files.favicon[0].filename
        );
      }
    } else {
      const body = req.body as Partial<PlatformSettings> & Record<string, unknown>;

      siteName =
        typeof body.siteName === "string"
          ? body.siteName.trim()
          : "";
      siteLogoUrl =
        typeof body.siteLogoUrl === "string"
          ? body.siteLogoUrl.trim() || null
          : null;
      siteFaviconUrl =
        typeof body.siteFaviconUrl === "string"
          ? body.siteFaviconUrl.trim() || null
          : null;
      defaultCurrency =
        typeof body.defaultCurrency === "string"
          ? body.defaultCurrency.trim().toUpperCase() || "INR"
          : "INR";
      timezone =
        typeof body.timezone === "string"
          ? body.timezone.trim() || "Asia/Kolkata"
          : "Asia/Kolkata";
    }

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

    const existingLogoUrl = await getSetting("site_logo_url");
    const existingFaviconUrl = await getSetting("site_favicon_url");

    if (siteLogoUrl && existingLogoUrl && existingLogoUrl !== siteLogoUrl) {
      deletePublicStorageFile(existingLogoUrl);
    }

    if (siteFaviconUrl && existingFaviconUrl && existingFaviconUrl !== siteFaviconUrl) {
      deletePublicStorageFile(existingFaviconUrl);
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

    const settings: PlatformSettings = {
      siteName,
      siteLogoUrl: resolveUrl(siteLogoUrl || existingLogoUrl),
      siteFaviconUrl: resolveUrl(siteFaviconUrl || existingFaviconUrl),
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
      message:
        "Unable to fetch payment settings",
    });
  }
};

export const getMapSettings = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const [mapProvider, mapApiKey] =
      await Promise.all([
        getSetting("map_provider"),
        getSetting("map_api_key"),
      ]);

    const settings: MapSettings = {
      mapProvider: mapProvider || "OPENSTREETMAP",
      mapApiKey: mapApiKey,
    };

    return res.status(200).json({
      success: true,
      message: "Map settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error(
      "Get map settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch map settings",
    });
  }
};

export const updateMapSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const body = req.body as Partial<MapSettings> &
      Record<string, unknown>;

    const mapProvider =
      typeof body.mapProvider === "string"
        ? body.mapProvider.trim().toUpperCase() ||
          "OPENSTREETMAP"
        : "OPENSTREETMAP";
    const mapApiKey =
      typeof body.mapApiKey === "string"
        ? body.mapApiKey.trim() || null
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.setting.upsert({
        where: { key: "map_provider" },
        update: { value: mapProvider },
        create: {
          key: "map_provider",
          value: mapProvider,
        },
      });

      await tx.setting.upsert({
        where: { key: "map_api_key" },
        update: { value: mapApiKey || "" },
        create: {
          key: "map_api_key",
          value: mapApiKey || "",
        },
      });
    });

    const settings: MapSettings = {
      mapProvider,
      mapApiKey,
    };

    return res.status(200).json({
      success: true,
      message: "Map settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error(
      "Update map settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update map settings",
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
