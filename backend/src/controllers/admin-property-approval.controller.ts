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

interface RejectPropertyBody {
  reason?: unknown;
}

/*
|--------------------------------------------------------------------------
| Helper Functions
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

const approvalStatuses = [
  PropertyStatus.PENDING_APPROVAL,
  PropertyStatus.APPROVED,
  PropertyStatus.REJECTED,
] as const;

const getApprovalStatistics = async () => {
  const statusCounts =
    await prisma.property.groupBy({
      by: ["status"],

      where: {
        status: {
          in: [...approvalStatuses],
        },
      },

      _count: {
        _all: true,
      },
    });

  const statistics = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  statusCounts.forEach((statusItem) => {
    const count = statusItem._count._all;

    statistics.total += count;

    switch (statusItem.status) {
      case PropertyStatus.PENDING_APPROVAL:
        statistics.pending = count;
        break;

      case PropertyStatus.APPROVED:
        statistics.approved = count;
        break;

      case PropertyStatus.REJECTED:
        statistics.rejected = count;
        break;
    }
  });

  return statistics;
};

/*
|--------------------------------------------------------------------------
| Admin: Get Property Approval List
|--------------------------------------------------------------------------
|
| Default status:
| PENDING_APPROVAL
|
| Optional query parameters:
| ?search=villa
| ?status=PENDING_APPROVAL
| ?status=APPROVED
| ?status=REJECTED
| ?status=ALL
|
*/

export const getAdminPropertyApprovals =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const requestedStatus =
        typeof req.query.status === "string"
          ? req.query.status
              .trim()
              .toUpperCase()
          : PropertyStatus.PENDING_APPROVAL;

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

      const where: Prisma.PropertyWhereInput =
        {};

      /*
      |--------------------------------------------------------------------------
      | Apply Status Filter
      |--------------------------------------------------------------------------
      */

      if (requestedStatus === "ALL") {
        where.status = {
          in: [...approvalStatuses],
        };
      } else {
        where.status =
          requestedStatus as PropertyStatus;
      }

      /*
      |--------------------------------------------------------------------------
      | Apply Search Filter
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
              submittedAt: "desc",
            },
            {
              updatedAt: "desc",
            },
          ],

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
                kycStatus: true,

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

            _count: {
              select: {
                images: true,
                amenities: true,
              },
            },
          },
        });

      const statistics =
        await getApprovalStatistics();

      return res.status(200).json({
        success: true,
        message:
          "Property approval list fetched successfully",
        data: properties,
        total: properties.length,
        statistics,
      });
    } catch (error) {
      console.error(
        "Get admin property approvals error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch property approval list",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Admin: Get Property Review Details
|--------------------------------------------------------------------------
*/

export const getAdminPropertyApprovalById =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const propertyId = String(
        req.params.id || ""
      ).trim();

      if (!propertyId) {
        return res.status(422).json({
          success: false,
          message: "Property ID is required",
        });
      }

      const property =
        await prisma.property.findUnique({
          where: {
            id: propertyId,
          },

          include: {
            category: true,

            vendor: {
              select: {
                id: true,
                businessName: true,
                kycStatus: true,
                commissionRate: true,
                createdAt: true,

                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    mobile: true,
                    status: true,
                    emailVerified: true,
                    mobileVerified: true,
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
              ],
            },

            amenities: {
              include: {
                amenity: true,
              },

              orderBy: {
                amenity: {
                  sortOrder: "asc",
                },
              },
            },
          },
        });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Property review details fetched successfully",
        data: property,
      });
    } catch (error) {
      console.error(
        "Get admin property review error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch property review details",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Admin: Approve Property
|--------------------------------------------------------------------------
*/

export const approveProperty = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const propertyId = String(
      req.params.id || ""
    ).trim();

    if (!propertyId) {
      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const existingProperty =
      await prisma.property.findUnique({
        where: {
          id: propertyId,
        },

        select: {
          id: true,
          title: true,
          status: true,
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
    | Only Pending Properties Can Be Approved
    |--------------------------------------------------------------------------
    */

    if (
      existingProperty.status !==
      PropertyStatus.PENDING_APPROVAL
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Only properties pending approval can be approved",
      });
    }

    const approvedProperty =
      await prisma.property.update({
        where: {
          id: propertyId,
        },

        data: {
          status: PropertyStatus.APPROVED,
          approvedAt: new Date(),
          rejectionReason: null,
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
      message:
        "Property approved successfully",
      data: approvedProperty,
    });
  } catch (error) {
    console.error(
      "Approve property error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to approve property",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin: Reject Property
|--------------------------------------------------------------------------
*/

export const rejectProperty = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const propertyId = String(
      req.params.id || ""
    ).trim();

    if (!propertyId) {
      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const body =
      req.body as RejectPropertyBody;

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    /*
    |--------------------------------------------------------------------------
    | Validate Rejection Reason
    |--------------------------------------------------------------------------
    */

    if (reason.length < 5) {
      return res.status(422).json({
        success: false,
        message:
          "Please provide a valid rejection reason",
        errors: {
          reason:
            "Rejection reason must contain at least 5 characters.",
        },
      });
    }

    const existingProperty =
      await prisma.property.findUnique({
        where: {
          id: propertyId,
        },

        select: {
          id: true,
          title: true,
          status: true,
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
    | Only Pending Properties Can Be Rejected
    |--------------------------------------------------------------------------
    */

    if (
      existingProperty.status !==
      PropertyStatus.PENDING_APPROVAL
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Only properties pending approval can be rejected",
      });
    }

    const rejectedProperty =
      await prisma.property.update({
        where: {
          id: propertyId,
        },

        data: {
          status: PropertyStatus.REJECTED,
          rejectionReason: reason,
          approvedAt: null,
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
      message:
        "Property rejected successfully",
      data: rejectedProperty,
    });
  } catch (error) {
    console.error(
      "Reject property error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reject property",
    });
  }
};
