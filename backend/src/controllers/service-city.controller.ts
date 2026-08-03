import type {
  Request,
  Response,
} from "express";

import {
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

interface ServiceCityBody {
  name?: unknown;
  state?: unknown;
  country?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
}

const cleanText = (
  value: unknown
): string => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const parseBoolean = (
  value: unknown,
  fallback: boolean
): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
};

const parseSortOrder = (
  value: unknown
): number => {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed >= 0
    ? parsed
    : 0;
};

const findDuplicateCity = async (
  name: string,
  state: string,
  country: string,
  excludeId?: string
) => {
  return prisma.serviceCity.findFirst({
    where: {
      id: excludeId
        ? {
            not: excludeId,
          }
        : undefined,
      name: {
        equals: name,
        mode: "insensitive",
      },
      state: {
        equals: state,
        mode: "insensitive",
      },
      country: {
        equals: country,
        mode: "insensitive",
      },
    },
  });
};

export const getServiceCities = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const search = cleanText(req.query.search);
    const status =
      cleanText(req.query.status).toLowerCase() ||
      "all";

    const where: Prisma.ServiceCityWhereInput = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          state: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          country: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (status === "active") {
      where.isActive = true;
    }

    if (status === "inactive") {
      where.isActive = false;
    }

    const cities =
      await prisma.serviceCity.findMany({
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

    return res.status(200).json({
      success: true,
      message:
        "Service cities fetched successfully",
      data: cities,
      total: cities.length,
    });
  } catch (error) {
    console.error(
      "Get service cities error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch service cities",
    });
  }
};

export const getActiveServiceCities = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const cities =
      await prisma.serviceCity.findMany({
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
        "Active service cities fetched successfully",
      data: cities,
      total: cities.length,
    });
  } catch (error) {
    console.error(
      "Get active service cities error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch active service cities",
    });
  }
};

export const createServiceCity = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const body = req.body as ServiceCityBody;
    const name = cleanText(body.name);
    const state = cleanText(body.state);
    const country =
      cleanText(body.country) || "India";
    const errors: Record<string, string> = {};

    if (name.length < 2) {
      errors.name =
        "Please enter a valid city name.";
    }

    if (state.length < 2) {
      errors.state =
        "Please enter a valid state.";
    }

    if (country.length < 2) {
      errors.country =
        "Please enter a valid country.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message:
          "Please correct the city information",
        errors,
      });
    }

    const duplicate =
      await findDuplicateCity(
        name,
        state,
        country
      );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "This city is already added for the selected state and country.",
      });
    }

    const city =
      await prisma.serviceCity.create({
        data: {
          name,
          state,
          country,
          isActive: parseBoolean(
            body.isActive,
            true
          ),
          sortOrder: parseSortOrder(
            body.sortOrder
          ),
        },
      });

    return res.status(201).json({
      success: true,
      message: "Service city created successfully",
      data: city,
    });
  } catch (error) {
    console.error(
      "Create service city error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create service city",
    });
  }
};

export const updateServiceCity = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const cityId = cleanText(req.params.id);

    if (!cityId) {
      return res.status(422).json({
        success: false,
        message: "City ID is required",
      });
    }

    const existingCity =
      await prisma.serviceCity.findUnique({
        where: {
          id: cityId,
        },
      });

    if (!existingCity) {
      return res.status(404).json({
        success: false,
        message: "Service city not found",
      });
    }

    const body = req.body as ServiceCityBody;
    const name = cleanText(body.name);
    const state = cleanText(body.state);
    const country =
      cleanText(body.country) || "India";
    const errors: Record<string, string> = {};

    if (name.length < 2) {
      errors.name =
        "Please enter a valid city name.";
    }

    if (state.length < 2) {
      errors.state =
        "Please enter a valid state.";
    }

    if (country.length < 2) {
      errors.country =
        "Please enter a valid country.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message:
          "Please correct the city information",
        errors,
      });
    }

    const duplicate =
      await findDuplicateCity(
        name,
        state,
        country,
        cityId
      );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "This city is already added for the selected state and country.",
      });
    }

    const city =
      await prisma.serviceCity.update({
        where: {
          id: cityId,
        },
        data: {
          name,
          state,
          country,
          isActive: parseBoolean(
            body.isActive,
            existingCity.isActive
          ),
          sortOrder: parseSortOrder(
            body.sortOrder
          ),
        },
      });

    return res.status(200).json({
      success: true,
      message: "Service city updated successfully",
      data: city,
    });
  } catch (error) {
    console.error(
      "Update service city error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update service city",
    });
  }
};

export const updateServiceCityStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const cityId = cleanText(req.params.id);
    const isActive = parseBoolean(
      (req.body as ServiceCityBody).isActive,
      true
    );

    const city =
      await prisma.serviceCity.update({
        where: {
          id: cityId,
        },
        data: {
          isActive,
        },
      });

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Service city activated successfully"
        : "Service city deactivated successfully",
      data: city,
    });
  } catch (error) {
    console.error(
      "Update service city status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update service city status",
    });
  }
};

export const deleteServiceCity = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const cityId = cleanText(req.params.id);

    if (!cityId) {
      return res.status(422).json({
        success: false,
        message: "City ID is required",
      });
    }

    await prisma.serviceCity.delete({
      where: {
        id: cityId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Service city deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete service city error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to delete service city",
    });
  }
};
