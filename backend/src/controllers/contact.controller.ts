import type { Request, Response } from "express";

import {
  NotificationType,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import { sendContactMessageNotificationEmail, sendEnquiryReceivedEmail, sendEnquiryAdminEmail } from "../services/email.js";
import { notifyAdmins } from "../services/notification.service.js";

interface ContactMessageBody {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  subject?: unknown;
  message?: unknown;
}

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const cleanOptionalText = (value: unknown): string | null =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validateContactBody = (body: ContactMessageBody) => {
  const name = cleanText(body.name);
  const email = cleanText(body.email);
  const phone = cleanOptionalText(body.phone);
  const subject = cleanText(body.subject);
  const message = cleanText(body.message);

  const errors: Record<string, string> = {};

  if (name.length < 2) {
    errors.name = "Please enter your name.";
  }

  if (!email || !isValidEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (subject.length < 2) {
    errors.subject = "Please enter a subject.";
  }

  if (message.length < 10) {
    errors.message =
      "Please enter a message of at least 10 characters.";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
    values: { name, email, phone, subject, message },
  };
};

const getSetting = async (key: string): Promise<string | null> => {
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });

  return setting?.value ?? null;
};

export const getPublicContactInfo = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const [email, phone, socialLinks] = await Promise.all([
      getSetting("contact_email"),
      getSetting("contact_phone"),
      prisma.socialLink.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          platform: true,
          url: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      message: "Contact information fetched successfully",
      data: {
        email,
        phone,
        socialLinks,
      },
    });
  } catch (error) {
    console.error("Get public contact info error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch contact information",
    });
  }
};

export const createContactMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const validation = validateContactBody(req.body as ContactMessageBody);

  if (!validation.success) {
    return res.status(422).json({
      success: false,
      message: "Please correct the contact form",
      errors: validation.errors,
    });
  }

  try {
    const contactMessage = await prisma.contactMessage.create({
      data: {
        ...validation.values,
        phone: validation.values.phone,
      },
    });

    const adminEmail = await getSetting("contact_email");

    if (adminEmail && isValidEmail(adminEmail)) {
      void sendContactMessageNotificationEmail(
        adminEmail,
        {
          name: contactMessage.name,
          email: contactMessage.email,
          phone: contactMessage.phone,
          subject: contactMessage.subject,
          message: contactMessage.message,
        }
      ).catch((error) => {
        console.error(
          "Send contact notification email error:",
          error
        );
      });
    }

    void sendEnquiryAdminEmail({
      enquiryId: `ENQ-${contactMessage.id.slice(0, 8)}`,
      customerName: contactMessage.name,
      customerEmail: contactMessage.email,
      customerPhone: contactMessage.phone || "N/A",
      propertyName: contactMessage.subject,
      propertyId: "N/A",
      location: "N/A",
      checkIn: "N/A",
      checkOut: "N/A",
      guests: 1,
      message: contactMessage.message,
      dateTime: new Date(
        contactMessage.createdAt
      ).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      adminDashboardUrl:
        process.env.PORTAL_URL ||
        "http://localhost:5173",
    }).catch((error) => {
      console.error(
        "Send enquiry admin email error:",
        error
      );
    });

    void sendEnquiryReceivedEmail({
      email: contactMessage.email,
      firstName: contactMessage.name.split(" ")[0],
      enquiryId: `ENQ-${contactMessage.id.slice(0, 8)}`,
      propertyName: contactMessage.subject,
      propertyLocation: "N/A",
      checkIn: "N/A",
      checkOut: "N/A",
      guests: 1,
      submissionDate: new Date(
        contactMessage.createdAt
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      dashboardUrl:
        process.env.PORTAL_URL ||
        "http://localhost:5173",
    }).catch((error) => {
      console.error(
        "Send enquiry received email error:",
        error
      );
    });

    void notifyAdmins({
      type: NotificationType.CONTACT,
      title: "New Contact Message",
      message: `${contactMessage.name} sent a message: ${contactMessage.subject}`,
      entityType: "ContactMessage",
      entityId: contactMessage.id,
      metadata: {
        contactMessageId: contactMessage.id,
        senderEmail: contactMessage.email,
      },
    }).catch((error) => {
      console.error(
        "Create contact notification error:",
        error
      );
    });

    return res.status(201).json({
      success: true,
      message:
        "Your message has been sent successfully. We will get back to you soon.",
      data: contactMessage,
    });
  } catch (error) {
    console.error("Create contact message error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to send your message. Please try again later.",
    });
  }
};
