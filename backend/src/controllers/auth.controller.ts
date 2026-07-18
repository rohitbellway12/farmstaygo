import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../config/database.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const createToken = (userId: number, role: string): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is missing in .env");
  }

  return jwt.sign(
    {
      id: userId,
      role,
    },
    jwtSecret,
    {
      expiresIn: "7d",
    }
  );
};

export const registerUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const schema = z.object({
      firstName: z.string().trim().min(2, "First name is required"),
      lastName: z.string().trim().optional(),
      email: z.string().trim().email("Valid email is required"),
      mobile: z.string().trim().min(10).max(15).optional(),
      password: z.string().min(8, "Password must be at least 8 characters"),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { firstName, lastName, email, mobile, password } = validation.data;

    const emailExists = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    if (mobile) {
      const mobileExists = await prisma.user.findUnique({
        where: {
          mobile,
        },
      });

      if (mobileExists) {
        return res.status(409).json({
          success: false,
          message: "Mobile number is already registered",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        mobile,
        password: hashedPassword,
        role: "USER",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const token = createToken(user.id, user.role);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error("Register user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register user",
    });
  }
};

export const registerVendor = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const schema = z.object({
      firstName: z.string().trim().min(2, "First name is required"),
      lastName: z.string().trim().optional(),
      businessName: z.string().trim().min(2, "Business name is required"),
      email: z.string().trim().email("Valid email is required"),
      mobile: z.string().trim().min(10).max(15),
      password: z.string().min(8, "Password must be at least 8 characters"),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      firstName,
      lastName,
      businessName,
      email,
      mobile,
      password,
    } = validation.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { mobile }],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          firstName,
          lastName,
          email,
          mobile,
          password: hashedPassword,
          role: "VENDOR",
        },
      });

      const vendor = await transaction.vendor.create({
        data: {
          userId: user.id,
          businessName,
        },
      });

      return {
        user,
        vendor,
      };
    });

    const token = createToken(result.user.id, result.user.role);

    return res.status(201).json({
      success: true,
      message: "Vendor registered successfully",
      data: {
        user: {
          id: result.user.id,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          email: result.user.email,
          mobile: result.user.mobile,
          role: result.user.role,
          status: result.user.status,
        },
        vendor: {
          id: result.vendor.id,
          businessName: result.vendor.businessName,
          kycStatus: result.vendor.kycStatus,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Register vendor error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register vendor",
    });
  }
};

export const login = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const schema = z.object({
      email: z.string().trim().email("Valid email is required"),
      password: z.string().min(1, "Password is required"),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        vendor: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatched = await bcrypt.compare(password, user.password);

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status === "BLOCKED") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    if (user.status === "INACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const token = createToken(user.id, user.role);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          status: user.status,
        },
        vendor: user.vendor
          ? {
              id: user.vendor.id,
              businessName: user.vendor.businessName,
              kycStatus: user.vendor.kycStatus,
            }
          : null,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
};

export const getProfile = async (
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

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
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
        vendor: {
          select: {
            id: true,
            businessName: true,
            kycStatus: true,
            commissionRate: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch profile",
    });
  }
};