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
