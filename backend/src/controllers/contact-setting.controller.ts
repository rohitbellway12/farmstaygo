import type { Response } from "express";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

interface SocialLinkInput {
  platform: string;
  url: string;
  isActive?: boolean;
  sortOrder?: number;
}

interface ContactSettingsBody {
  contactEmail?: unknown;
  contactPhone?: unknown;
  socialLinks?: unknown;
}

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const cleanOptionalText = (value: unknown): string | null =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const upsertSetting = async (
  key: string,
  value: string
): Promise<void> => {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
};

export const getContactSettings = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const [email, phone, socialLinks] = await Promise.all([
      prisma.setting
        .findUnique({ where: { key: "contact_email" } })
        .then((s) => s?.value ?? null),
      prisma.setting
        .findUnique({ where: { key: "contact_phone" } })
        .then((s) => s?.value ?? null),
      prisma.socialLink.findMany({
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return res.json({
      success: true,
      message:
        "Contact settings fetched successfully",
      data: {
        contactEmail: email,
        contactPhone: phone,
        socialLinks,
      },
    });
  } catch (error) {
    console.error(
      "Get contact settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch contact settings",
    });
  }
};

export const updateContactSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const body = req.body as ContactSettingsBody;
  const errors: Record<string, string> = {};

  const contactEmail = cleanOptionalText(body.contactEmail);

  if (contactEmail && !isValidEmail(contactEmail)) {
    errors.contactEmail =
      "Please enter a valid email address.";
  }

  const contactPhone = cleanOptionalText(body.contactPhone);

  const socialLinksInput = Array.isArray(body.socialLinks)
    ? (body.socialLinks as SocialLinkInput[])
    : [];

  const validatedSocialLinks: SocialLinkInput[] = [];

  for (const link of socialLinksInput) {
    if (!link || typeof link !== "object") {
      continue;
    }

    const platform = cleanText(link.platform);

    if (!platform) {
      errors.socialLinks =
        "Each social link requires a platform name.";
      continue;
    }

    const url = cleanText(link.url);

    if (!url) {
      errors[`socialLink_${platform}`] =
        "Each social link requires a URL.";
      continue;
    }

    validatedSocialLinks.push({
      platform,
      url,
      isActive:
        typeof link.isActive === "boolean"
          ? link.isActive
          : true,
      sortOrder:
        typeof link.sortOrder === "number"
          ? link.sortOrder
          : 0,
    });
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      message:
        "Please correct the contact settings",
      errors,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (contactEmail !== null) {
        await tx.setting.upsert({
          where: { key: "contact_email" },
          update: { value: contactEmail },
          create: {
            key: "contact_email",
            value: contactEmail,
          },
        });
      }

      if (contactPhone !== null) {
        await tx.setting.upsert({
          where: { key: "contact_phone" },
          update: { value: contactPhone },
          create: {
            key: "contact_phone",
            value: contactPhone,
          },
        });
      }

      if (validatedSocialLinks.length > 0) {
        await tx.socialLink.deleteMany({});

        await tx.socialLink.createMany({
          data: validatedSocialLinks.map((link) => ({
            platform: link.platform,
            url: link.url,
            isActive: link.isActive,
            sortOrder: link.sortOrder,
          })),
        });
      }
    });

    const updatedSocialLinks =
      await prisma.socialLink.findMany({
        orderBy: { sortOrder: "asc" },
      });

    return res.json({
      success: true,
      message:
        "Contact settings updated successfully",
      data: {
        contactEmail,
        contactPhone,
        socialLinks: updatedSocialLinks,
      },
    });
  } catch (error) {
    console.error(
      "Update contact settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update contact settings",
    });
  }
};
