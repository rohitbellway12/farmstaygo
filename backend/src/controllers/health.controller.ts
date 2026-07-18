import type { Request, Response } from "express";
import prisma from "../config/database.js";

export const healthCheck = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: "FarmStayGo API is running",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);

    return res.status(500).json({
      success: false,
      message: "API is running but database connection failed",
      database: "disconnected",
    });
  }
};