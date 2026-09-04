import type { Response } from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import prisma from "../config/database.js";

import type {
  Prisma,
  UserRole,
  UserStatus,
} from "../generated/prisma/client.js";

/*
|--------------------------------------------------------------------------
| Admin: Get User List
|--------------------------------------------------------------------------
|
| Optional query parameters:
| ?search=john
| ?role=ALL
| ?role=USER
| ?role=VENDOR
| ?role=ADMIN
| ?status=ALL
| ?status=ACTIVE
| ?status=INACTIVE
| ?status=BLOCKED
|
*/

export const getAdminUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const requestedRole =
      typeof req.query.role === "string"
        ? req.query.role.trim().toUpperCase()
        : "ALL";

    const requestedStatus =
      typeof req.query.status === "string"
        ? req.query.status.trim().toUpperCase()
        : "ALL";

    const where: Prisma.UserWhereInput = {};

    if (requestedRole !== "ALL") {
      where.role = requestedRole as UserRole;
    }

    if (requestedStatus !== "ALL") {
      where.status = requestedStatus as UserStatus;
    }

    if (search) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
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
          mobile: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        emailVerified: true,
        mobileVerified: true,
        createdAt: true,
        updatedAt: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            kycStatus: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "User list fetched successfully",
      data: users,
      total: users.length,
    });
  } catch (error) {
    console.error(
      "Get admin users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch user list",
    });
  }
};

export const updateAdminUserStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = Number(req.params.id);
    const status = String(req.body?.status || "").trim().toUpperCase();

    if (!Number.isInteger(userId) || !["ACTIVE", "INACTIVE", "BLOCKED"].includes(status)) {
      return res.status(422).json({ success: false, message: "Invalid user ID or status" });
    }

    if (userId === req.user?.id) {
      return res.status(400).json({ success: false, message: "You cannot change your own admin status" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: status as UserStatus },
      select: { id: true, status: true },
    });

    return res.status(200).json({ success: true, message: "User status updated successfully", data: user });
  } catch (error) {
    console.error("Update admin user status error:", error);
    return res.status(500).json({ success: false, message: "Unable to update user status" });
  }
};

export const deleteAdminUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(422).json({ success: false, message: "Invalid user ID" });
    }

    if (userId === req.user?.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own admin account" });
    }

    await prisma.user.delete({ where: { id: userId } });

    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete admin user error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete user" });
  }
};
