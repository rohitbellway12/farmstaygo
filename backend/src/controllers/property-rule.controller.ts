import type { Request, Response } from "express";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

/*
|--------------------------------------------------------------------------
| Request Body Types
|--------------------------------------------------------------------------
*/

interface PropertyRuleBody {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  icon?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
}

interface PropertyRulesBody {
  ruleIds?: unknown;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const cleanOptionalString = (
  value: unknown
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const cleanedValue = value.trim();

  return cleanedValue || null;
};

const parseBooleanField = (
  value: unknown
): {
  isValid: boolean;
  value?: boolean;
} => {
  if (typeof value === "boolean") {
    return {
      isValid: true,
      value,
    };
  }

  if (typeof value === "string") {
    const normalizedValue =
      value.trim().toLowerCase();

    if (
      normalizedValue === "true" ||
      normalizedValue === "1"
    ) {
      return {
        isValid: true,
        value: true,
      };
    }

    if (
      normalizedValue === "false" ||
      normalizedValue === "0"
    ) {
      return {
        isValid: true,
        value: false,
      };
    }
  }

  return {
    isValid: false,
  };
};

const parseSortOrder = (
  value: unknown
): {
  isValid: boolean;
  value: number;
} => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return {
      isValid: true,
      value,
    };
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (
      Number.isInteger(parsed) &&
      Number.isFinite(parsed)
    ) {
      return {
        isValid: true,
        value: parsed,
      };
    }
  }

  return {
    isValid: false,
    value: 0,
  };
};

/*
|--------------------------------------------------------------------------
| Admin: Get All Property Rules
|--------------------------------------------------------------------------
*/

export const getPropertyRules = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const search = cleanOptionalString(req.query.search);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const statusFilter =
      req.query.status;

    if (
      typeof statusFilter === "string" &&
      statusFilter.toLowerCase() === "inactive"
    ) {
      where.isActive = false;
    } else {
      where.isActive = true;
    }

    const rules = await prisma.propertyRule.findMany({
      where,
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    const total = await prisma.propertyRule.count({
      where,
    });

    return res.status(200).json({
      success: true,
      message: "Property rules fetched successfully",
      data: rules,
      total,
    });
  } catch (error) {
    console.error(
      "Get property rules error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch property rules",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Get Property Rule By ID
|--------------------------------------------------------------------------
*/

export const getPropertyRuleById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const ruleId = String(
      req.params.id || ""
    ).trim();

    if (!ruleId) {
      return res.status(422).json({
        success: false,
        message: "Rule ID is required",
      });
    }

    const rule =
      await prisma.propertyRule.findUnique({
        where: {
          id: ruleId,
        },
      });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Property rule not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property rule fetched successfully",
      data: rule,
    });
  } catch (error) {
    console.error(
      "Get property rule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch property rule",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Create Property Rule
|--------------------------------------------------------------------------
*/

export const createPropertyRule = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const body =
      req.body as PropertyRuleBody;

    const name = cleanOptionalString(body.name);

    if (!name) {
      return res.status(422).json({
        success: false,
        message: "Rule name is required",
        errors: {
          name: "Please enter a valid rule name",
        },
      });
    }

    const slugInput =
      typeof body.slug === "string" &&
      body.slug.trim()
        ? body.slug.trim()
        : name;

    const slug = slugify(slugInput);

    const description = cleanOptionalString(
      body.description
    );

    const icon = cleanOptionalString(body.icon);

    const isActiveResult = parseBooleanField(
      body.isActive
    );

    if (!isActiveResult.isValid) {
      return res.status(422).json({
        success: false,
        message: "Invalid active status",
        errors: {
          isActive:
            "Please provide a valid active status",
        },
      });
    }

    const sortOrderResult = parseSortOrder(
      body.sortOrder
    );

    if (!sortOrderResult.isValid) {
      return res.status(422).json({
        success: false,
        message: "Invalid sort order",
        errors: {
          sortOrder:
            "Sort order must be a whole number",
        },
      });
    }

    const existingRule =
      await prisma.propertyRule.findFirst({
        where: {
          slug,
        },
      });

    if (existingRule) {
      return res.status(409).json({
        success: false,
        message: "A rule with this slug already exists",
        errors: {
          slug:
            "Please use a different name or slug",
        },
      });
    }

    const rule =
      await prisma.propertyRule.create({
        data: {
          name,
          slug,
          description,
          icon,
          isActive:
            isActiveResult.value ?? true,
          sortOrder: sortOrderResult.value,
        },
      });

    return res.status(201).json({
      success: true,
      message: "Property rule created successfully",
      data: rule,
    });
  } catch (error) {
    console.error(
      "Create property rule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create property rule",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Update Property Rule
|--------------------------------------------------------------------------
*/

export const updatePropertyRule = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const ruleId = String(
      req.params.id || ""
    ).trim();

    if (!ruleId) {
      return res.status(422).json({
        success: false,
        message: "Rule ID is required",
      });
    }

    const existingRule =
      await prisma.propertyRule.findUnique({
        where: {
          id: ruleId,
        },
      });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: "Property rule not found",
      });
    }

    const body =
      req.body as PropertyRuleBody;

    const name = cleanOptionalString(body.name);

    let slug: string | undefined;

    if (name) {
      const slugInput =
        typeof body.slug === "string" &&
        body.slug.trim()
          ? body.slug.trim()
          : name;

      slug = slugify(slugInput);

      const duplicateRule =
        await prisma.propertyRule.findFirst({
          where: {
            slug,
            id: {
              not: ruleId,
            },
          },
        });

      if (duplicateRule) {
        return res.status(409).json({
          success: false,
          message:
            "A rule with this slug already exists",
          errors: {
            slug:
              "Please use a different name or slug",
          },
        });
      }
    }

    const description = cleanOptionalString(
      body.description
    );

    const icon = cleanOptionalString(body.icon);

    let isActive: boolean | undefined;

    if (body.isActive !== undefined) {
      const isActiveResult =
        parseBooleanField(body.isActive);

      if (!isActiveResult.isValid) {
        return res.status(422).json({
          success: false,
          message: "Invalid active status",
          errors: {
            isActive:
              "Please provide a valid active status",
          },
        });
      }

      isActive = isActiveResult.value;
    }

    let sortOrder: number | undefined;

    if (body.sortOrder !== undefined) {
      const sortOrderResult = parseSortOrder(
        body.sortOrder
      );

      if (!sortOrderResult.isValid) {
        return res.status(422).json({
          success: false,
          message: "Invalid sort order",
          errors: {
            sortOrder:
              "Sort order must be a whole number",
          },
        });
      }

      sortOrder = sortOrderResult.value;
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (slug !== undefined) {
      updateData.slug = slug;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (icon !== undefined) {
      updateData.icon = icon;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder;
    }

    const updatedRule =
      await prisma.propertyRule.update({
        where: {
          id: ruleId,
        },

        data: updateData,
      });

    return res.status(200).json({
      success: true,
      message: "Property rule updated successfully",
      data: updatedRule,
    });
  } catch (error) {
    console.error(
      "Update property rule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update property rule",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Delete Property Rule
|--------------------------------------------------------------------------
*/

export const deletePropertyRule = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const ruleId = String(
      req.params.id || ""
    ).trim();

    if (!ruleId) {
      return res.status(422).json({
        success: false,
        message: "Rule ID is required",
      });
    }

    const existingRule =
      await prisma.propertyRule.findUnique({
        where: {
          id: ruleId,
        },
      });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: "Property rule not found",
      });
    }

    await prisma.propertyRuleAssignment.deleteMany(
      {
        where: {
          ruleId,
        },
      }
    );

    await prisma.propertyRule.delete({
      where: {
        id: ruleId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Property rule deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete property rule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete property rule",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Get Active Property Rules
|--------------------------------------------------------------------------
*/

export const getActivePropertyRules =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const rules =
        await prisma.propertyRule.findMany({
          where: {
            isActive: true,
          },

          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              name: "asc",
            },
          ],
        });

      return res.status(200).json({
        success: true,
        message:
          "Active property rules fetched successfully",
        data: rules,
      });
    } catch (error) {
      console.error(
        "Get active property rules error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch property rules",
      });
    }
  };
