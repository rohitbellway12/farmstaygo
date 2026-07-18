import type {
  Request,
  Response,
} from "express";

import {
  PropertyStatus,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

/*
|--------------------------------------------------------------------------
| Public: Get Active Property Categories
|--------------------------------------------------------------------------
|
| GET /api/public/property-categories
|
| No authentication required.
|
*/

export const getPublicPropertyCategories =
  async (
    _req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const categories =
        await prisma.propertyCategory.findMany({
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

          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            image: true,
            sortOrder: true,

            _count: {
              select: {
                properties: {
                  where: {
                    status:
                      PropertyStatus.APPROVED,

                    images: {
                      some: {},
                    },
                  },
                },
              },
            },
          },
        });

      const data = categories.map(
        (category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description:
            category.description,
          icon: category.icon,
          image: category.image,
          sortOrder:
            category.sortOrder,

          propertyCount:
            category._count.properties,
        })
      );

      return res.status(200).json({
        success: true,
        message:
          "Public property categories fetched successfully",
        data,
        total: data.length,
      });
    } catch (error) {
      console.error(
        "Get public property categories error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch property categories",
      });
    }
  };