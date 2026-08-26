import type { Request, Response } from "express";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  createSettingsImageUpload,
  deletePublicStorageFile,
  getSettingsImageStoragePath,
  processHomeImage,
  HOME_IMAGE_SIZES,
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

interface SmtpSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpFromAddress: string;
  smtpEncryption: string;
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

    const host = req.get("host");
    const isLocalhost = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
    const protocol = isLocalhost ? "http" : req.protocol;
    const baseUrl = `${protocol}://${host}`;

    const resolveUrl = (url: string | null | undefined): string | null => {
      if (!url) {
        return null;
      }

      if (url.startsWith("http://") || url.startsWith("https://")) {
        if (isLocalhost) {
          return url.replace("https://", "http://");
        }
        if (url.startsWith("http://")) {
          return url.replace("http://", "https://");
        }
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

    const host = req.get("host");
    const isLocalhost = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
    const protocol = isLocalhost ? "http" : req.protocol;
    const baseUrl = `${protocol}://${host}`;

    const resolveUrl = (url: string | null | undefined): string | null => {
      if (!url) {
        return null;
      }

      if (url.startsWith("http://") || url.startsWith("https://")) {
        if (isLocalhost) {
          return url.replace("https://", "http://");
        }
        if (url.startsWith("http://")) {
          return url.replace("http://", "https://");
        }
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
      mapProvider: mapProvider || "GOOGLE",
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
          "GOOGLE"
        : "GOOGLE";
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

interface HomeSettings {
  homeHeroImage: string | null;
  homeGrowImage: string | null;
}

const resolveSettingUrl = (
  req: Request,
  url: string | null | undefined
): string | null => {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const host = req.get("host");
  const isLocalhost = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
  const protocol = isLocalhost ? "http" : req.protocol;
  const baseUrl = `${protocol}://${host}`;

  return `${baseUrl}${url}`;
};

export const getHomeSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const [homeHeroImage, homeGrowImage] = await Promise.all([
      getSetting("home_hero_image"),
      getSetting("home_grow_image"),
    ]);

    const settings: HomeSettings = {
      homeHeroImage: resolveSettingUrl(req, homeHeroImage),
      homeGrowImage: resolveSettingUrl(req, homeGrowImage),
    };

    return res.status(200).json({
      success: true,
      message: "Home settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Get home settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch home settings",
    });
  }
};

export const updateHomeSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const files = (
      req as unknown as {
        files?: Record<string, Express.Multer.File[]>;
      }
    ).files;

    const items: Array<{
      key: string;
      size: { width: number; height: number };
      file?: Express.Multer.File;
    }> = [
      {
        key: "home_hero_image",
        size: HOME_IMAGE_SIZES.hero,
        file: files?.hero?.[0],
      },
      {
        key: "home_grow_image",
        size: HOME_IMAGE_SIZES.grow,
        file: files?.grow?.[0],
      },
    ];

    const newValues: Record<string, string> = {};

    for (const item of items) {
      if (!item.file) {
        continue;
      }

      const existing = await getSetting(item.key);

      if (existing) {
        deletePublicStorageFile(existing);
      }

      newValues[item.key] = await processHomeImage(
        item.file,
        item.size.width,
        item.size.height
      );
    }

    if (Object.keys(newValues).length === 0) {
      return res.status(422).json({
        success: false,
        message: "Please upload at least one home page image",
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(newValues)) {
        await tx.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    });

    const [homeHeroImage, homeGrowImage] = await Promise.all([
      getSetting("home_hero_image"),
      getSetting("home_grow_image"),
    ]);

    const settings: HomeSettings = {
      homeHeroImage: resolveSettingUrl(req, homeHeroImage),
      homeGrowImage: resolveSettingUrl(req, homeGrowImage),
    };

    return res.status(200).json({
      success: true,
      message: "Home page images updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Update home settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update home page images",
    });
  }
};

export const getSmtpSettings = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const [
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      smtpFromAddress,
      smtpEncryption,
    ] = await Promise.all([
      getSetting("smtp_host"),
      getSetting("smtp_port"),
      getSetting("smtp_username"),
      getSetting("smtp_password"),
      getSetting("smtp_from_address"),
      getSetting("smtp_encryption"),
    ]);

    const settings: SmtpSettings = {
      smtpHost: smtpHost || "",
      smtpPort: smtpPort ? parseInt(smtpPort, 10) : 587,
      smtpUsername: smtpUsername || "",
      smtpPassword: smtpPassword || "",
      smtpFromAddress: smtpFromAddress || "",
      smtpEncryption: smtpEncryption || "none",
    };

    return res.status(200).json({
      success: true,
      message: "SMTP settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Get SMTP settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch SMTP settings",
    });
  }
};

export const updateSmtpSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const body = req.body as Partial<SmtpSettings> & Record<string, unknown>;

    const smtpHost =
      typeof body.smtpHost === "string"
        ? body.smtpHost.trim()
        : "";
    const smtpPort =
      typeof body.smtpPort === "number"
        ? body.smtpPort
        : typeof body.smtpPort === "string"
          ? parseInt(body.smtpPort, 10)
          : 587;
    const smtpUsername =
      typeof body.smtpUsername === "string"
        ? body.smtpUsername.trim()
        : "";
    const smtpPassword =
      typeof body.smtpPassword === "string"
        ? body.smtpPassword.trim()
        : "";
    const smtpFromAddress =
      typeof body.smtpFromAddress === "string"
        ? body.smtpFromAddress.trim()
        : "";
    const smtpEncryption =
      typeof body.smtpEncryption === "string"
        ? body.smtpEncryption.trim().toLowerCase()
        : "none";

    await prisma.$transaction(async (tx) => {
      await tx.setting.upsert({
        where: { key: "smtp_host" },
        update: { value: smtpHost },
        create: { key: "smtp_host", value: smtpHost },
      });

      await tx.setting.upsert({
        where: { key: "smtp_port" },
        update: { value: String(smtpPort) },
        create: { key: "smtp_port", value: String(smtpPort) },
      });

      await tx.setting.upsert({
        where: { key: "smtp_username" },
        update: { value: smtpUsername },
        create: { key: "smtp_username", value: smtpUsername },
      });

      if (smtpPassword) {
        await tx.setting.upsert({
          where: { key: "smtp_password" },
          update: { value: smtpPassword },
          create: { key: "smtp_password", value: smtpPassword },
        });
      }

      await tx.setting.upsert({
        where: { key: "smtp_from_address" },
        update: { value: smtpFromAddress },
        create: { key: "smtp_from_address", value: smtpFromAddress },
      });

      await tx.setting.upsert({
        where: { key: "smtp_encryption" },
        update: { value: smtpEncryption },
        create: { key: "smtp_encryption", value: smtpEncryption },
      });
    });

    const settings: SmtpSettings = {
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword: smtpPassword ? "******" : "",
      smtpFromAddress,
      smtpEncryption,
    };

    return res.status(200).json({
      success: true,
      message: "SMTP settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Update SMTP settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update SMTP settings",
    });
  }
};

export const syncEnvSmtpSettings = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const smtpHost = process.env.MAIL_HOST || "";
    const smtpPort = process.env.MAIL_PORT || "587";
    const smtpUsername = process.env.MAIL_USERNAME || "";
    const smtpPassword = process.env.MAIL_PASSWORD || "";
    const smtpFromAddress = process.env.MAIL_FROM_ADDRESS || "noreply@farmstaygo.com";
    const smtpEncryption = process.env.MAIL_ENCRYPTION?.toLowerCase() || "none";

    if (!smtpHost || !smtpUsername || !smtpPassword) {
      return res.status(400).json({
        success: false,
        message: "Required SMTP environment variables (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD) are missing",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.setting.upsert({
        where: { key: "smtp_host" },
        update: { value: smtpHost },
        create: { key: "smtp_host", value: smtpHost },
      });

      await tx.setting.upsert({
        where: { key: "smtp_port" },
        update: { value: smtpPort },
        create: { key: "smtp_port", value: smtpPort },
      });

      await tx.setting.upsert({
        where: { key: "smtp_username" },
        update: { value: smtpUsername },
        create: { key: "smtp_username", value: smtpUsername },
      });

      await tx.setting.upsert({
        where: { key: "smtp_password" },
        update: { value: smtpPassword },
        create: { key: "smtp_password", value: smtpPassword },
      });

      await tx.setting.upsert({
        where: { key: "smtp_from_address" },
        update: { value: smtpFromAddress },
        create: { key: "smtp_from_address", value: smtpFromAddress },
      });

      await tx.setting.upsert({
        where: { key: "smtp_encryption" },
        update: { value: smtpEncryption },
        create: { key: "smtp_encryption", value: smtpEncryption },
      });
    });

    return res.status(200).json({
      success: true,
      message: "SMTP settings synced from environment successfully",
    });
  } catch (error) {
    console.error("Sync env SMTP settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to sync SMTP settings from environment",
    });
  }
};

export const getPublicHomeSettings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const [homeHeroImage, homeGrowImage] = await Promise.all([
      getSetting("home_hero_image"),
      getSetting("home_grow_image"),
    ]);

    const settings: HomeSettings = {
      homeHeroImage: resolveSettingUrl(req, homeHeroImage),
      homeGrowImage: resolveSettingUrl(req, homeGrowImage),
    };

    return res.status(200).json({
      success: true,
      message: "Public home settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Get public home settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch public home settings",
    });
  }
};
