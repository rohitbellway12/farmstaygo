import type { Request, Response } from "express";

import prisma from "../config/database.js";

interface FaqBody {
  question?: unknown;
  answer?: unknown;
  category?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
}

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const cleanOptionalText = (
  value: unknown
): string | null =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

const parseBoolean = (
  value: unknown,
  fallback: boolean
): boolean =>
  typeof value === "boolean" ? value : fallback;

const parseSortOrder = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : 0;
};

const validateFaqBody = (body: FaqBody) => {
  const question = cleanText(body.question);
  const answer = cleanText(body.answer);

  const errors: Record<string, string> = {};

  if (question.length < 3) {
    errors.question =
      "Please enter a question (at least 3 characters).";
  }

  if (answer.length < 5) {
    errors.answer =
      "Please enter an answer (at least 5 characters).";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
    values: {
      question,
      answer,
      category: cleanOptionalText(body.category),
      isActive: parseBoolean(body.isActive, true),
      sortOrder: parseSortOrder(body.sortOrder),
    },
  };
};

export const getPublicFaqs = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const faqs = await prisma.faq.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        sortOrder: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "FAQs fetched successfully",
      data: faqs,
    });
  } catch (error) {
    console.error(
      "Get public FAQs error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch FAQs at this time.",
    });
  }
};

export const getAdminFaqs = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const faqs = await prisma.faq.findMany({
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "FAQs fetched successfully",
      data: faqs,
    });
  } catch (error) {
    console.error(
      "Get admin FAQs error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch FAQs at this time.",
    });
  }
};

export const createFaq = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { success, errors, values } =
      validateFaqBody(req.body);

    if (!success) {
      return res.status(422).json({
        success: false,
        message:
          "Please fix the validation errors.",
        errors,
      });
    }

    const faq = await prisma.faq.create({
      data: {
        question: values.question,
        answer: values.answer,
        category: values.category,
        isActive: values.isActive,
        sortOrder: values.sortOrder,
      },
    });

    return res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (error) {
    console.error(
      "Create FAQ error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create FAQ at this time.",
    });
  }
};

export const updateFaq = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = cleanText(req.params.id);

    if (!id) {
      return res.status(422).json({
        success: false,
        message: "FAQ id is required",
      });
    }

    const existing = await prisma.faq.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const { success, errors, values } =
      validateFaqBody(req.body);

    if (!success) {
      return res.status(422).json({
        success: false,
        message:
          "Please fix the validation errors.",
        errors,
      });
    }

    const faq = await prisma.faq.update({
      where: { id },
      data: {
        question: values.question,
        answer: values.answer,
        category: values.category,
        isActive: values.isActive,
        sortOrder: values.sortOrder,
      },
    });

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: faq,
    });
  } catch (error) {
    console.error(
      "Update FAQ error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update FAQ at this time.",
    });
  }
};

export const deleteFaq = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = cleanText(req.params.id);

    if (!id) {
      return res.status(422).json({
        success: false,
        message: "FAQ id is required",
      });
    }

    const existing = await prisma.faq.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    await prisma.faq.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete FAQ error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete FAQ at this time.",
    });
  }
};
