import type { Response } from "express";

import {
  PropertyStatus,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

/*
|--------------------------------------------------------------------------
| Request Body Types
|--------------------------------------------------------------------------
*/

interface AdminPropertyStatusBody {
  status?: unknown;
}

interface AdminPropertyFeaturedBody {
  isFeatured?: unknown;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const isPropertyStatus = (
  value: unknown
): value is PropertyStatus => {
  return (
    typeof value === "string" &&
    Object.values(PropertyStatus).includes(
      value as PropertyStatus
    )
  );
};

const manageablePropertyStatuses = [
  PropertyStatus.APPROVED,
  PropertyStatus.INACTIVE,
  PropertyStatus.SUSPENDED,
] as const;

type ManageablePropertyStatus =
  (typeof manageablePropertyStatuses)[number];

const isManageablePropertyStatus = (
  value: unknown
): value is ManageablePropertyStatus => {
  return (
    typeof value === "string" &&
    manageablePropertyStatuses.includes(
      value as ManageablePropertyStatus
    )
  );
};

const parseFeaturedFilter = (
  value: unknown
):
  | {
      isValid: true;
      value?: boolean;
    }
  | {
      isValid: false;
    } => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "ALL"
  ) {
    return {
      isValid: true,
    };
  }

  if (
    value === true ||
    value === "true" ||
    value === "1"
  ) {
    return {
      isValid: true,
      value: true,
    };
  }

  if (
    value === false ||
    value === "false" ||
    value === "0"
  ) {
    return {
      isValid: true,
      value: false,
    };
  }

  return {
    isValid: false,
  };
};

/*
|--------------------------------------------------------------------------
| Admin: Get All Properties
|--------------------------------------------------------------------------
|
| Optional query parameters:
|
| ?search=farm
| ?status=APPROVED
| ?status=ALL
| ?categoryId=category-id
| ?featured=true
| ?featured=false
|
*/

export const getAdminProperties = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Resolve Query Parameters
    |--------------------------------------------------------------------------
    */

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const requestedStatus =
      typeof req.query.status === "string"
        ? req.query.status
            .trim()
            .toUpperCase()
        : "ALL";

    const categoryId =
      typeof req.query.categoryId ===
      "string"
        ? req.query.categoryId.trim()
        : "";

    const featuredFilter =
      parseFeaturedFilter(
        req.query.featured
      );

    /*
    |--------------------------------------------------------------------------
    | Validate Status Filter
    |--------------------------------------------------------------------------
    */

    if (
      requestedStatus !== "ALL" &&
      !isPropertyStatus(requestedStatus)
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Please provide a valid property status",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Featured Filter
    |--------------------------------------------------------------------------
    */

    if (!featuredFilter.isValid) {
      return res.status(422).json({
        success: false,
        message:
          "Featured filter must be true, false or ALL",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Build Property Query
    |--------------------------------------------------------------------------
    */

    const where: Prisma.PropertyWhereInput =
      {};

    if (requestedStatus !== "ALL") {
      where.status =
        requestedStatus as PropertyStatus;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (
      featuredFilter.value !== undefined
    ) {
      where.isFeatured =
        featuredFilter.value;
    }

    /*
    |--------------------------------------------------------------------------
    | Search Property, Vendor, Category and Location
    |--------------------------------------------------------------------------
    */

    if (search) {
      where.OR = [
        {
          title: {
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
          city: {
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

        {
          category: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },

        {
          vendor: {
            businessName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },

        {
          vendor: {
            user: {
              firstName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },

        {
          vendor: {
            user: {
              lastName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },

        {
          vendor: {
            user: {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },

        {
          vendor: {
            user: {
              mobile: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Fetch Properties
    |--------------------------------------------------------------------------
    */

    const properties =
      await prisma.property.findMany({
        where,

        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
              isActive: true,
            },
          },

          vendor: {
            select: {
              id: true,
              businessName: true,
              kycStatus: true,
              commissionRate: true,

              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  mobile: true,
                  status: true,
                },
              },
            },
          },

          images: {
            where: {
              isCover: true,
            },

            orderBy: {
              sortOrder: "asc",
            },

            take: 1,
          },

          roomTypes: {
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
              name: true,
              totalRooms: true,
              basePrice: true,
              weekendPrice: true,
              isActive: true,
            },
          },

          _count: {
            select: {
              images: true,
              amenities: true,
              roomTypes: true,
            },
          },
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Property Status Statistics
    |--------------------------------------------------------------------------
    */

    const statusCounts =
      await prisma.property.groupBy({
        by: ["status"],

        _count: {
          _all: true,
        },
      });

    const statistics = {
      total: 0,
      draft: 0,
      pendingApproval: 0,
      approved: 0,
      rejected: 0,
      inactive: 0,
      suspended: 0,
      featured: 0,
    };

    statusCounts.forEach(
      (statusItem) => {
        const count =
          statusItem._count._all;

        statistics.total += count;

        switch (statusItem.status) {
          case PropertyStatus.DRAFT:
            statistics.draft = count;
            break;

          case PropertyStatus.PENDING_APPROVAL:
            statistics.pendingApproval =
              count;
            break;

          case PropertyStatus.APPROVED:
            statistics.approved = count;
            break;

          case PropertyStatus.REJECTED:
            statistics.rejected = count;
            break;

          case PropertyStatus.INACTIVE:
            statistics.inactive = count;
            break;

          case PropertyStatus.SUSPENDED:
            statistics.suspended = count;
            break;
        }
      }
    );

    statistics.featured =
      await prisma.property.count({
        where: {
          isFeatured: true,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Admin properties fetched successfully",
      data: properties,
      total: properties.length,
      statistics,
      filters: {
        search,
        status: requestedStatus,
        categoryId:
          categoryId || null,
        featured:
          featuredFilter.value ??
          "ALL",
      },
    });
  } catch (error) {
    console.error(
      "Get admin properties error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch admin properties",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Get Single Property
|--------------------------------------------------------------------------
|
| Returns complete property information for Admin property management.
|
*/

export const getAdminPropertyById =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Resolve Property ID
      |--------------------------------------------------------------------------
      */

      const propertyId = String(
        req.params.id || ""
      ).trim();

      if (!propertyId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID is required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Fetch Complete Property
      |--------------------------------------------------------------------------
      */

      const property =
        await prisma.property.findUnique({
          where: {
            id: propertyId,
          },

          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                icon: true,
                image: true,
                isActive: true,
                sortOrder: true,
                createdAt: true,
                updatedAt: true,
              },
            },

            vendor: {
              select: {
                id: true,
                businessName: true,
                kycStatus: true,
                commissionRate: true,
                createdAt: true,
                updatedAt: true,

                user: {
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
                  },
                },
              },
            },

            images: {
              orderBy: [
                {
                  isCover: "desc",
                },
                {
                  sortOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
            },

            amenities: {
              include: {
                amenity: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    icon: true,
                    image: true,
                    group: true,
                    isActive: true,
                    sortOrder: true,
                  },
                },
              },

              orderBy: {
                amenity: {
                  sortOrder: "asc",
                },
              },
            },

            ruleAssignments: {
              include: {
                rule: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    icon: true,
                    isActive: true,
                    sortOrder: true,
                  },
                },
              },

              orderBy: {
                rule: {
                  sortOrder: "asc",
                },
              },
            },

            roomTypes: {
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
                name: true,
                totalRooms: true,
                basePrice: true,
                weekendPrice: true,
                isActive: true,
              },
            },

            _count: {
              select: {
                images: true,
                amenities: true,
                roomTypes: true,
              },
            },
          },
        });

      /*
      |--------------------------------------------------------------------------
      | Property Not Found
      |--------------------------------------------------------------------------
      */

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Admin property details fetched successfully",
        data: property,
      });
    } catch (error) {
      console.error(
        "Get admin property details error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch property details",
      });
    }
  };

  /*
|--------------------------------------------------------------------------
| Admin: Update Property Status
|--------------------------------------------------------------------------
|
| Supported management statuses:
|
| APPROVED
| INACTIVE
| SUSPENDED
|
| Approval and rejection must continue through the Property Approval module.
|
*/

export const updateAdminPropertyStatus =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Resolve Property ID
      |--------------------------------------------------------------------------
      */

      const propertyId = String(
        req.params.id || ""
      ).trim();

      if (!propertyId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID is required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Resolve Requested Status
      |--------------------------------------------------------------------------
      */

      const body =
        req.body as AdminPropertyStatusBody;

      const requestedStatus =
        typeof body.status === "string"
          ? body.status
              .trim()
              .toUpperCase()
          : "";

      if (
        !isManageablePropertyStatus(
          requestedStatus
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please provide a valid property management status",
          errors: {
            status:
              "Status must be APPROVED, INACTIVE or SUSPENDED.",
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Fetch Existing Property
      |--------------------------------------------------------------------------
      */

      const existingProperty =
        await prisma.property.findUnique({
          where: {
            id: propertyId,
          },

          select: {
            id: true,
            title: true,
            status: true,
            isFeatured: true,
            approvedAt: true,
          },
        });

      if (!existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Prevent Approval Workflow Bypass
      |--------------------------------------------------------------------------
      |
      | DRAFT, PENDING_APPROVAL and REJECTED properties cannot be managed
      | through this endpoint.
      |
      */

      if (
        existingProperty.status ===
          PropertyStatus.DRAFT ||
        existingProperty.status ===
          PropertyStatus.PENDING_APPROVAL ||
        existingProperty.status ===
          PropertyStatus.REJECTED
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property must complete the approval workflow before its management status can be changed",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Prevent Same Status Update
      |--------------------------------------------------------------------------
      */

      if (
        existingProperty.status ===
        requestedStatus
      ) {
        return res.status(409).json({
          success: false,
          message: `Property is already ${requestedStatus
            .toLowerCase()
            .replace(/_/g, " ")}`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Status Transition
      |--------------------------------------------------------------------------
      */

     const allowedTransitions: Record<
  ManageablePropertyStatus,
  ManageablePropertyStatus[]
> = {
  [PropertyStatus.APPROVED]: [
    PropertyStatus.INACTIVE,
    PropertyStatus.SUSPENDED,
  ],

  [PropertyStatus.INACTIVE]: [
    PropertyStatus.APPROVED,
    PropertyStatus.SUSPENDED,
  ],

  [PropertyStatus.SUSPENDED]: [
    PropertyStatus.APPROVED,
    PropertyStatus.INACTIVE,
  ],
};

  const currentStatus =
  existingProperty.status as ManageablePropertyStatus;

      if (
        !allowedTransitions[
          currentStatus
        ].includes(requestedStatus)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property status transition is not allowed",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Prepare Update Data
      |--------------------------------------------------------------------------
      */

      const updateData: Prisma.PropertyUpdateInput =
        {
          status: requestedStatus,
        };

      /*
      |--------------------------------------------------------------------------
      | Reactivate Property
      |--------------------------------------------------------------------------
      |
      | Preserve the original approval date whenever it exists.
      |
      */

      if (
        requestedStatus ===
        PropertyStatus.APPROVED
      ) {
        updateData.approvedAt =
          existingProperty.approvedAt ||
          new Date();

        updateData.rejectionReason =
          null;
      }

      /*
      |--------------------------------------------------------------------------
      | Remove Featured Status From Hidden Properties
      |--------------------------------------------------------------------------
      |
      | An inactive or suspended property must not remain featured.
      |
      */

      if (
        requestedStatus ===
          PropertyStatus.INACTIVE ||
        requestedStatus ===
          PropertyStatus.SUSPENDED
      ) {
        updateData.isFeatured = false;
      }

      /*
      |--------------------------------------------------------------------------
      | Update Property
      |--------------------------------------------------------------------------
      */

      const updatedProperty =
        await prisma.property.update({
          where: {
            id: propertyId,
          },

          data: updateData,

          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                image: true,
              },
            },

            vendor: {
              select: {
                id: true,
                businessName: true,

                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },

            images: {
              where: {
                isCover: true,
              },

              orderBy: {
                sortOrder: "asc",
              },

              take: 1,
            },
          },
        });

      /*
      |--------------------------------------------------------------------------
      | Success Message
      |--------------------------------------------------------------------------
      */

     const statusMessages: Record<
  ManageablePropertyStatus,
  string
> = {
  [PropertyStatus.APPROVED]:
    "Property activated successfully",

  [PropertyStatus.INACTIVE]:
    "Property marked as inactive successfully",

  [PropertyStatus.SUSPENDED]:
    "Property suspended successfully",
};
      return res.status(200).json({
        success: true,
        message:
          statusMessages[
            requestedStatus
          ],
        data: updatedProperty,
      });
    } catch (error) {
      console.error(
        "Update admin property status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update property status",
      });
    }
  };

  /*
|--------------------------------------------------------------------------
| Admin: Update Featured Property Status
|--------------------------------------------------------------------------
|
| Only APPROVED properties can be marked as featured.
|
*/

export const updateAdminPropertyFeatured =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Resolve Property ID
      |--------------------------------------------------------------------------
      */

      const propertyId = String(
        req.params.id || ""
      ).trim();

      if (!propertyId) {
        return res.status(422).json({
          success: false,
          message: "Property ID is required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Featured Value
      |--------------------------------------------------------------------------
      */

      const body =
        req.body as AdminPropertyFeaturedBody;

      if (
        typeof body.isFeatured !==
        "boolean"
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please provide a valid featured status",
          errors: {
            isFeatured:
              "Featured status must be true or false.",
          },
        });
      }

      const requestedFeaturedStatus =
        body.isFeatured;

      /*
      |--------------------------------------------------------------------------
      | Fetch Existing Property
      |--------------------------------------------------------------------------
      */

      const existingProperty =
        await prisma.property.findUnique({
          where: {
            id: propertyId,
          },

          select: {
            id: true,
            title: true,
            status: true,
            isFeatured: true,
          },
        });

      if (!existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Only Approved Properties Can Be Featured
      |--------------------------------------------------------------------------
      */

      if (
        requestedFeaturedStatus &&
        existingProperty.status !==
          PropertyStatus.APPROVED
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Only approved properties can be marked as featured",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Prevent Same Featured Status
      |--------------------------------------------------------------------------
      */

      if (
        existingProperty.isFeatured ===
        requestedFeaturedStatus
      ) {
        return res.status(409).json({
          success: false,
          message: requestedFeaturedStatus
            ? "Property is already featured"
            : "Property is already not featured",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Update Featured Status
      |--------------------------------------------------------------------------
      */

      const updatedProperty =
        await prisma.property.update({
          where: {
            id: propertyId,
          },

          data: {
            isFeatured:
              requestedFeaturedStatus,
          },

          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                image: true,
              },
            },

            vendor: {
              select: {
                id: true,
                businessName: true,

                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },

            images: {
              where: {
                isCover: true,
              },

              orderBy: {
                sortOrder: "asc",
              },

              take: 1,
            },
          },
        });

      return res.status(200).json({
        success: true,
        message: requestedFeaturedStatus
          ? "Property marked as featured successfully"
          : "Property removed from featured properties successfully",
        data: updatedProperty,
      });
    } catch (error) {
      console.error(
        "Update admin property featured status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update featured property status",
      });
    }
  };
