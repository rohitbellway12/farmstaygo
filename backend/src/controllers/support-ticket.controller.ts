import type { Response } from "express";

import {
  SupportTicketPriority,
  SupportTicketStatus,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  sendSupportTicketNotificationEmail,
  sendSupportTicketConfirmationEmail,
} from "../services/email.js";

interface CreateSupportTicketBody {
  subject?: unknown;
  description?: unknown;
  category?: unknown;
  priority?: unknown;
  relatedEntityType?: unknown;
  relatedEntityId?: unknown;
  userEmail?: unknown;
  userName?: unknown;
  autoAssign?: unknown;
}

interface CreateReplyBody {
  message?: unknown;
}

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const cleanOptionalText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const parseId = (value: unknown): string | null => {
  const id = cleanText(value);
  return id || null;
};

const parsePage = (value: unknown): number => {
  if (typeof value !== "string") return 1;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
};

const parseLimit = (value: unknown): number => {
  if (typeof value !== "string") return 20;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1
    ? Math.min(parsed, 50)
    : 20;
};

const parseStatus = (value: unknown): string => {
  if (typeof value !== "string") return "all";
  const normalized = value.trim();
  return ["all", "OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"].includes(normalized)
    ? normalized
    : "all";
};

const parsePriority = (value: unknown): string => {
  if (typeof value !== "string") return "all";
  const normalized = value.trim();
  return ["all", "LOW", "MEDIUM", "HIGH", "URGENT"].includes(normalized)
    ? normalized
    : "all";
};

const normalizePriority = (value: unknown): SupportTicketPriority => {
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";
  return Object.values(SupportTicketPriority).includes(upper as SupportTicketPriority)
    ? (upper as SupportTicketPriority)
    : SupportTicketPriority.MEDIUM;
};

export const createSupportTicket = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const body = req.body as CreateSupportTicketBody & { userEmail?: string; userName?: string };
  const subject = cleanText(body.subject);
  const description = cleanText(body.description);
  const category = cleanOptionalText(body.category);
  const priority = normalizePriority(body.priority);
  const relatedEntityType = cleanOptionalText(body.relatedEntityType);
  const relatedEntityId = cleanOptionalText(body.relatedEntityId);
  const autoAssign = typeof body.autoAssign === "boolean" ? body.autoAssign : false;

  const errors: Record<string, string> = {};

  if (subject.length < 3) {
    errors.subject = "Subject must be at least 3 characters.";
  }

  if (description.length < 10) {
    errors.description = "Description must be at least 10 characters.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      message: "Please correct the support ticket form.",
      errors,
    });
  }

  try {
    const user = req.user;
    let userId: number | null = user?.id ?? null;
    let userEmail: string;
    let userName: string;
    let userRole: string;

    if (user) {
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true, firstName: true, lastName: true, role: true },
      });
      userEmail = userRecord?.email ?? "unknown";
      userName = userRecord?.firstName ?? "User";
      userRole = userRecord?.role ?? "USER";
    } else {
      const providedEmail = cleanOptionalText(body.userEmail);
      const providedName = cleanText(body.userName);

      if (!providedEmail || !isValidEmail(providedEmail)) {
        return res.status(422).json({
          success: false,
          message: "Please provide a valid email address.",
          errors: { userEmail: "Valid email is required for guests." },
        });
      }

      userEmail = providedEmail;
      userName = providedName || "Guest";
      userRole = "USER";
    }

    let assignedToId: number | null = null;

    if (autoAssign) {
      const leastLoaded = await prisma.user.findFirst({
        where: {
          role: { in: ["ADMIN", "STAFF_ADMIN", "SUPPORT"] },
          status: "ACTIVE",
        },
        orderBy: {
          assignedSupportTickets: { _count: "asc" },
        },
        select: { id: true },
      });

      if (leastLoaded) {
        assignedToId = leastLoaded.id;
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        userEmail,
        userName,
        userRole,
        subject,
        description,
        category,
        priority,
        relatedEntityType,
        relatedEntityId,
        assignedToId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    void sendSupportTicketNotificationEmail({
      ticketId: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      customerName: ticket.userName || "Customer",
      customerEmail: ticket.userEmail,
      adminDashboardUrl: `${process.env.PORTAL_URL || "http://localhost:5173"}/admin/support`,
    }).catch((error) => {
      console.error("Send support ticket notification email error:", error);
    });

    void sendSupportTicketConfirmationEmail({
      customerEmail: ticket.userEmail,
      customerName: ticket.userName || "Customer",
      ticketId: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      submissionDate: new Date(ticket.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    }).catch((error) => {
      console.error("Send support ticket confirmation email error:", error);
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      data: ticket,
    });
  } catch (error) {
    console.error("Create support ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create support ticket.",
    });
  }
};

export const getMySupportTickets = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const status = parseStatus(req.query.status);

    const skip = (page - 1) * limit;
    const where: Prisma.SupportTicketWhereInput = {
      userId: req.user.id,
      ...(status !== "all" ? { status: status as SupportTicketStatus } : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return res.json({
      success: true,
      message: "Support tickets fetched successfully",
      data: tickets,
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
    console.error("Get my support tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch support tickets",
    });
  }
};

export const getSupportTickets = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const status = parseStatus(req.query.status);
    const priority = parsePriority(req.query.priority);
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const skip = (page - 1) * limit;
    const where: Prisma.SupportTicketWhereInput = {};

    if (status !== "all") {
      where.status = status as SupportTicketStatus;
    }

    if (priority !== "all") {
      where.priority = priority as SupportTicketPriority;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { userName: { contains: search, mode: "insensitive" } },
        { userEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return res.json({
      success: true,
      message: "Support tickets fetched successfully",
      data: tickets,
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
    console.error("Get support tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch support tickets",
    });
  }
};

export const getSupportTicketById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const ticketId = parseId(req.params.id);

    if (!ticketId) {
      return res.status(422).json({
        success: false,
        message: "Support ticket ID is required",
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    return res.json({
      success: true,
      message: "Support ticket fetched successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Get support ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch support ticket",
    });
  }
};

export const updateSupportTicket = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const ticketId = parseId(req.params.id);

    if (!ticketId) {
      return res.status(422).json({
        success: false,
        message: "Support ticket ID is required",
      });
    }

    const {
      status,
      priority,
      assignedToId,
      category,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (status && Object.values(SupportTicketStatus).includes(status)) {
      updateData.status = status as SupportTicketStatus;
      if (status === "RESOLVED" || status === "CLOSED") {
        updateData.resolvedAt = new Date();
      }
    }

    if (priority && Object.values(SupportTicketPriority).includes(priority)) {
      updateData.priority = priority as SupportTicketPriority;
    }

    if (typeof assignedToId === "number") {
      updateData.assignedToId = assignedToId;
    } else if (assignedToId === null) {
      updateData.assignedToId = null;
    }

    if (typeof category === "string") {
      updateData.category = category.trim() || null;
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: "Support ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Update support ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update support ticket",
    });
  }
};

export const deleteSupportTicket = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const ticketId = parseId(req.params.id);

    if (!ticketId) {
      return res.status(422).json({
        success: false,
        message: "Support ticket ID is required",
      });
    }

    await prisma.supportTicket.delete({
      where: { id: ticketId },
    });

    return res.json({
      success: true,
      message: "Support ticket deleted successfully",
    });
  } catch (error) {
    console.error("Delete support ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete support ticket",
    });
  }
};

export const addSupportTicketReply = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const ticketId = parseId(req.params.id);

    if (!ticketId) {
      return res.status(422).json({
        success: false,
        message: "Support ticket ID is required",
      });
    }

    const body = req.body as CreateReplyBody;
    const message = cleanText(body.message);

    if (message.length < 1) {
      return res.status(422).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const isStaff = ["ADMIN", "STAFF_ADMIN", "SUPPORT"].includes(user.role);
    const userEmail =
      (await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      }))?.email ?? "unknown";

    const fullName =
      (await prisma.user.findUnique({
        where: { id: user.id },
        select: { firstName: true, lastName: true },
      }))?.firstName ?? "User";

    const reply = await prisma.supportTicketReply.create({
      data: {
        ticketId,
        userId: user.id,
        userEmail,
        userName: fullName,
        userRole: user.role,
        message,
        isStaffReply: isStaff,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Reply added successfully",
      data: reply,
    });
  } catch (error) {
    console.error("Add support ticket reply error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to add reply",
    });
  }
};

export const getSupportTicketStats = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const [open, inProgress, waiting, resolved, closed] =
      await Promise.all([
        prisma.supportTicket.count({
          where: { status: SupportTicketStatus.OPEN },
        }),
        prisma.supportTicket.count({
          where: { status: SupportTicketStatus.IN_PROGRESS },
        }),
        prisma.supportTicket.count({
          where: { status: SupportTicketStatus.WAITING_ON_CUSTOMER },
        }),
        prisma.supportTicket.count({
          where: { status: SupportTicketStatus.RESOLVED },
        }),
        prisma.supportTicket.count({
          where: { status: SupportTicketStatus.CLOSED },
        }),
      ]);

    const total = open + inProgress + waiting + resolved + closed;

    return res.json({
      success: true,
      message: "Support ticket stats fetched successfully",
      data: {
        total,
        open,
        inProgress,
        waiting,
        resolved,
        closed,
      },
    });
  } catch (error) {
    console.error("Get support ticket stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch support ticket stats",
    });
  }
};

export const getPublicSupportTicketsByEmail = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const email =
      typeof req.query.email === "string"
        ? req.query.email.trim()
        : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(422).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: {
        userEmail: {
          equals: email,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { replies: true },
        },
      },
    });

    return res.json({
      success: true,
      message: "Support tickets fetched successfully",
      data: tickets,
    });
  } catch (error) {
    console.error("Get public support tickets by email error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch support tickets",
    });
  }
};

export const getPublicSupportTicketById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const ticketId = parseId(req.params.id);

    if (!ticketId) {
      return res.status(422).json({
        success: false,
        message: "Support ticket ID is required",
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    return res.json({
      success: true,
      message: "Support ticket fetched successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Get public support ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch support ticket",
    });
  }
};
