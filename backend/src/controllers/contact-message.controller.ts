import type { Response } from "express";

import {
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const parseId = (value: unknown): string | null => {
  const id = cleanText(value);
  return id || null;
};

interface ContactMessageResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

const parsePage = (value: unknown): number => {
  if (typeof value !== "string") {
    return 1;
  }

  const parsed = parseInt(value, 10);

  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
};

const parseLimit = (value: unknown): number => {
  if (typeof value !== "string") {
    return 20;
  }

  const parsed = parseInt(value, 10);

  return Number.isInteger(parsed) && parsed >= 1
    ? Math.min(parsed, 50)
    : 20;
};

const parseFilter = (value: unknown): string => {
  if (typeof value !== "string") {
    return "all";
  }

  const normalized = value.trim();

  return ["all", "read", "unread"].includes(normalized)
    ? normalized
    : "all";
};

export const getContactMessages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const filter = parseFilter(req.query.filter);
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const skip = (page - 1) * limit;

    const where: Prisma.ContactMessageWhereInput = {};

    if (filter === "read") {
      where.isRead = true;
    } else if (filter === "unread") {
      where.isRead = false;
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          subject: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contactMessage.count({ where }),
    ]);

    const totalPages =
      total === 0 ? 0 : Math.ceil(total / limit);

    return res.json({
      success: true,
      message: "Contact messages fetched successfully",
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: totalPages > 0 && page < totalPages,
      },
    });
  } catch (error) {
    console.error("Get contact messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch contact messages",
    });
  }
};

export const getContactMessageById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const messageId = parseId(req.params.id);

    if (!messageId) {
      return res.status(422).json({
        success: false,
        message: "Contact message ID is required",
      });
    }

    const message = await prisma.contactMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    if (!message.isRead) {
      await prisma.contactMessage.update({
        where: { id: message.id },
        data: { isRead: true },
      });
    }

    return res.json({
      success: true,
      message: "Contact message fetched successfully",
      data: { ...message, isRead: true },
    });
  } catch (error) {
    console.error("Get contact message error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch contact message",
    });
  }
};

export const markContactMessageRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const messageId = parseId(req.params.id);

    if (!messageId) {
      return res.status(422).json({
        success: false,
        message: "Contact message ID is required",
      });
    }

    const isRead =
      typeof req.body.isRead === "boolean"
        ? req.body.isRead
        : true;

    const message = await prisma.contactMessage.update({
      where: { id: messageId },
      data: { isRead },
    });

    return res.json({
      success: true,
      message: "Contact message marked as read",
      data: message,
    });
  } catch (error) {
    console.error("Mark contact message read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update contact message",
    });
  }
};

export const markAllContactMessagesRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const updated = await prisma.contactMessage.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    return res.json({
      success: true,
      message:
        "All contact messages marked as read",
      data: { count: updated.count },
    });
  } catch (error) {
    console.error(
      "Mark all contact messages read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update contact messages",
    });
  }
};

export const deleteContactMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const messageId = parseId(req.params.id);

    if (!messageId) {
      return res.status(422).json({
        success: false,
        message: "Contact message ID is required",
      });
    }

    await prisma.contactMessage.delete({
      where: { id: messageId },
    });

    return res.json({
      success: true,
      message: "Contact message deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete contact message error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete contact message",
    });
  }
};

export const getUnreadContactMessageCount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const count = await prisma.contactMessage.count({
      where: { isRead: false },
    });

    return res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error(
      "Get unread contact message count error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch unread contact message count",
    });
  }
};
