import type { Request, Response, NextFunction } from "express";
import { ReviewStatus } from "../generated/prisma/enums.js";
import prisma from "../config/database.js";

export const getPublicReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const propertyId = req.params.propertyId as string;

    const reviews = await prisma.review.findMany({
      where: {
        propertyId,
        status: ReviewStatus.APPROVED,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const avgRating = await prisma.review.aggregate({
      where: {
        propertyId,
        status: ReviewStatus.APPROVED,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    res.json({
      success: true,
      data: {
        reviews,
        averageRating: avgRating._avg.rating || 0,
        totalReviews: avgRating._count.rating || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { propertyId, guestName, guestEmail, rating, comment } = req.body;

    if (!propertyId || !guestName || !guestEmail || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    const review = await prisma.review.create({
      data: {
        propertyId,
        guestName,
        guestEmail,
        rating,
        comment,
        status: ReviewStatus.APPROVED,
      },
    });

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    const where = status ? { status: status as ReviewStatus } : {};

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          property: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!Object.values(ReviewStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const review = await prisma.review.update({
      where: { id },
      data: { status: status as ReviewStatus },
    });

    res.json({
      success: true,
      message: "Review status updated",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    await prisma.review.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertyReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const propertyId = req.params.propertyId as string;

    const reviews = await prisma.review.findMany({
      where: {
        propertyId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};
