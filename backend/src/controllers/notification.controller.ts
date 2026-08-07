import type { Response } from "express";

import {
  NotificationRecipientType,
  NotificationType,
  Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

interface CreateNotificationBody {
  recipientType: string;
  recipientId: number;
  actorId: number;
  type: string;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const recipientTypeMap: Record<string, NotificationRecipientType> = {
  USER: NotificationRecipientType.USER,
  VENDOR: NotificationRecipientType.VENDOR,
  ADMIN: NotificationRecipientType.ADMIN,
};

const notificationTypeMap: Record<string, NotificationType> = {
  BOOKING: NotificationType.BOOKING,
  PAYMENT: NotificationType.PAYMENT,
  REFUND: NotificationType.REFUND,
  SYSTEM: NotificationType.SYSTEM,
};

export const createNotification = async (
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

    const body = req.body as CreateNotificationBody;

    const recipientType =
      recipientTypeMap[body.recipientType];

    if (!recipientType) {
      return res.status(422).json({
        success: false,
        message:
          "Valid recipientType is required (USER, VENDOR, ADMIN)",
      });
    }

    const type =
      notificationTypeMap[body.type] ??
      NotificationType.SYSTEM;

    const metadata = body.metadata
      ? JSON.stringify(body.metadata)
      : null;

    const notification = await prisma.notification.create(
      {
        data: {
          recipientType,
          recipientId: body.recipientId,
          actorId: body.actorId,
          type,
          entityType: body.entityType ?? null,
          entityId: body.entityId ?? null,
          title: body.title,
          message: body.message,
          metadata,
        },
      }
    );

    return res.status(201).json({
      success: true,
      message: "Notification created",
      data: notification,
    });
  } catch (error) {
    console.error(
      "Create notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create notification",
    });
  }
};

export const getNotifications = async (
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

    const page =
      typeof req.query.page === "string"
        ? Math.max(
            1,
            parseInt(req.query.page, 10) || 1
          )
        : 1;

    const limit =
      typeof req.query.limit === "string"
        ? Math.min(
            50,
            Math.max(
              1,
              parseInt(req.query.limit, 10) || 20
            )
          )
        : 20;

    const filter =
      typeof req.query.filter === "string"
        ? req.query.filter
        : "all";

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const where: Prisma.NotificationWhereInput = {
      recipientType:
        req.user.role as NotificationRecipientType,
      recipientId: req.user.id,
    };

    if (filter === "unread") {
      where.isRead = false;
    } else if (filter === "read") {
      where.isRead = true;
     } else if (
       filter === "booking" ||
       filter === "payment" ||
       filter === "refund" ||
       filter === "system" ||
       filter === "contact"
     ) {
       where.type = filter.toUpperCase() as NotificationType;
     }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { message: { contains: search } },
      ];
    }

    const [notifications, total] =
      await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.notification.count({ where }),
      ]);

    return res.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load notifications",
    });
  }
};

export const getUnreadCount = async (
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

    const count =
      await prisma.notification.count({
        where: {
          recipientType:
            req.user.role as NotificationRecipientType,
          recipientId: req.user.id,
          isRead: false,
        },
      });

    return res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error(
      "Get unread count error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load unread count",
    });
  }
};

export const markAsRead = async (
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

    const notificationId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    if (!notificationId) {
      return res.status(422).json({
        success: false,
        message: "Notification ID is required",
      });
    }

    const notification =
      await prisma.notification.findFirst({
        where: {
          id: notificationId,
          recipientType:
            req.user.role as NotificationRecipientType,
          recipientId: req.user.id,
        },
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.isRead) {
      return res.json({
        success: true,
        message: "Already marked as read",
        data: notification,
      });
    }

    const updated =
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

    return res.json({
      success: true,
      message: "Notification marked as read",
      data: updated,
    });
  } catch (error) {
    console.error(
      "Mark notification as read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to mark notification as read",
    });
  }
};

export const markAllAsRead = async (
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

    const updated =
      await prisma.notification.updateMany({
        where: {
          recipientType:
            req.user.role as NotificationRecipientType,
          recipientId: req.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

    return res.json({
      success: true,
      message:
        "All notifications marked as read",
      data: { count: updated.count },
    });
  } catch (error) {
    console.error(
      "Mark all notifications as read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to mark all notifications as read",
    });
  }
};
