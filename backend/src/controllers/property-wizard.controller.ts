import type { Response } from "express";

import {
  PropertyStatus,
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

interface PropertyPricingBody {
  basePrice?: unknown;
  weekendPrice?: unknown;
  cleaningFee?: unknown;
  securityDeposit?: unknown;
  reservationAmount?: unknown;
  checkInTime?: unknown;
  checkOutTime?: unknown;
  minimumStay?: unknown;
  instantBook?: unknown;
}

interface PropertyAmenitiesBody {
  amenityIds?: unknown;
}

interface PropertyRulesBody {
  ruleIds?: unknown;
}

interface MissingSection {
  step: number;
  title: string;
  message: string;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getVendorOwnedProperty = async (
  userId: number,
  propertyId: string
) => {
  return prisma.property.findFirst({
    where: {
      id: propertyId,

      vendor: {
        userId,
      },
    },
  });
};

const propertyEditingIsBlocked = (
  status: PropertyStatus
): boolean => {
  return (
    status === PropertyStatus.APPROVED ||
    status === PropertyStatus.SUSPENDED
  );
};

const parseMoney = (
  value: unknown,
  required = false
): {
  isValid: boolean;
  value: number | null;
} => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      isValid: !required,
      value: null,
    };
  }

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0 ||
    (required && parsedValue <= 0)
  ) {
    return {
      isValid: false,
      value: null,
    };
  }

  return {
    isValid: true,
    value:
      Math.round(parsedValue * 100) / 100,
  };
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

const isValidTime = (
  value: unknown
): value is string => {
  return (
    typeof value === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
      value.trim()
    )
  );
};

/*
|--------------------------------------------------------------------------
| Vendor: Update Property Pricing
|--------------------------------------------------------------------------
*/

export const updatePropertyPricing = async (
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
      await getVendorOwnedProperty(
        req.user.id,
        propertyId
      );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    const body =
      req.body as PropertyPricingBody;

    const isRoomWise = property.bookingType === "ROOM_WISE";

    const basePrice =
      parseMoney(body.basePrice, !isRoomWise);

    const weekendPrice =
      parseMoney(body.weekendPrice);

    const cleaningFee =
      parseMoney(body.cleaningFee);

    const securityDeposit =
      parseMoney(body.securityDeposit);

    const reservationAmount =
      parseMoney(body.reservationAmount);

    const errors: Record<string, string> =
      {};

    if (!basePrice.isValid) {
      errors.basePrice =
        "Please enter a valid base price greater than zero.";
    }

    if (!weekendPrice.isValid) {
      errors.weekendPrice =
        "Please enter a valid weekend price.";
    }

    if (!cleaningFee.isValid) {
      errors.cleaningFee =
        "Please enter a valid cleaning fee.";
    }

    if (!securityDeposit.isValid) {
      errors.securityDeposit =
        "Please enter a valid security deposit.";
    }

    if (!reservationAmount.isValid) {
      errors.reservationAmount =
        "Please enter a valid reservation / deposit amount.";
    } else if (
      reservationAmount.value !== null &&
      basePrice.value !== null &&
      reservationAmount.value > basePrice.value
    ) {
      errors.reservationAmount =
        "Deposit amount cannot be greater than the base price.";
    }

    if (!isValidTime(body.checkInTime)) {
      errors.checkInTime =
        "Please select a valid check-in time.";
    }

    if (!isValidTime(body.checkOutTime)) {
      errors.checkOutTime =
        "Please select a valid check-out time.";
    }

    const minimumStay = Number(
      body.minimumStay
    );

    if (
      !Number.isInteger(minimumStay) ||
      minimumStay < 1 ||
      minimumStay > 365
    ) {
      errors.minimumStay =
        "Minimum stay must be between 1 and 365 nights.";
    }

    const instantBook =
      parseBooleanField(body.instantBook);

    if (!instantBook.isValid) {
      errors.instantBook =
        "Please provide a valid instant booking value.";
    }

    if (
      Object.keys(errors).length > 0
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Please correct the pricing information",
        errors,
      });
    }

    const updatedProperty =
      await prisma.property.update({
        where: {
          id: propertyId,
        },

        data: {
          basePrice: basePrice.value,
          weekendPrice:
            weekendPrice.value,
          cleaningFee:
            cleaningFee.value,
          securityDeposit:
            securityDeposit.value,
          reservationAmount:
            reservationAmount.value,

          checkInTime: (
            body.checkInTime as string
          ).trim(),

          checkOutTime: (
            body.checkOutTime as string
          ).trim(),

          minimumStay,

          instantBook:
            instantBook.value ?? false,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Property pricing saved successfully",
      data: updatedProperty,
    });
  } catch (error) {
    console.error(
      "Update property pricing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update property pricing",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Update Property Amenities
|--------------------------------------------------------------------------
*/

export const updatePropertyAmenities =
  async (
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

      const property =
        await getVendorOwnedProperty(
          req.user.id,
          propertyId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      if (
        propertyEditingIsBlocked(
          property.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property cannot currently be edited",
        });
      }

      const body =
        req.body as PropertyAmenitiesBody;

      if (
        !Array.isArray(body.amenityIds)
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please select property amenities",
          errors: {
            amenityIds:
              "Amenity IDs must be provided as an array.",
          },
        });
      }

      const amenityIds =
        body.amenityIds
          .filter(
            (amenityId): amenityId is string =>
              typeof amenityId ===
                "string" &&
              Boolean(amenityId.trim())
          )
          .map((amenityId) =>
            amenityId.trim()
          );

      const uniqueAmenityIds = [
        ...new Set(amenityIds),
      ];

      if (
        uniqueAmenityIds.length === 0
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please select at least one amenity",
          errors: {
            amenityIds:
              "At least one amenity is required.",
          },
        });
      }

      if (
        uniqueAmenityIds.length !==
        amenityIds.length
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Duplicate amenities are not allowed",
        });
      }

      const activeAmenities =
        await prisma.amenity.findMany({
          where: {
            id: {
              in: uniqueAmenityIds,
            },

            isActive: true,
          },

          select: {
            id: true,
          },
        });

      if (
        activeAmenities.length !==
        uniqueAmenityIds.length
      ) {
        return res.status(422).json({
          success: false,
          message:
            "One or more selected amenities are unavailable",
          errors: {
            amenityIds:
              "Please select only active amenities.",
          },
        });
      }

      const updatedProperty =
        await prisma.$transaction(
          async (transaction) => {
            await transaction.propertyAmenity.deleteMany(
              {
                where: {
                  propertyId,
                },
              }
            );

            await transaction.propertyAmenity.createMany(
              {
                data:
                  uniqueAmenityIds.map(
                    (amenityId) => ({
                      propertyId,
                      amenityId,
                    })
                  ),
              }
            );

            return transaction.property.findUnique(
              {
                where: {
                  id: propertyId,
                },

                include: {
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
              }
            );
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Property amenities saved successfully",
        data: updatedProperty,
      });
    } catch (error) {
      console.error(
        "Update property amenities error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update property amenities",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Update Property Rules
|--------------------------------------------------------------------------
*/

export const updatePropertyRules =
  async (
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

      const property =
        await getVendorOwnedProperty(
          req.user.id,
          propertyId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      if (
        propertyEditingIsBlocked(
          property.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property cannot currently be edited",
        });
      }

      const body =
        req.body as PropertyRulesBody;

      if (
        !Array.isArray(body.ruleIds)
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please select property rules",
          errors: {
            ruleIds:
              "Rule IDs must be provided as an array.",
          },
        });
      }

      const ruleIds =
        body.ruleIds
          .filter(
            (ruleId): ruleId is string =>
              typeof ruleId ===
                "string" &&
              Boolean(ruleId.trim())
          )
          .map((ruleId) =>
            ruleId.trim()
          );

      const uniqueRuleIds = [
        ...new Set(ruleIds),
      ];

      if (
        uniqueRuleIds.length !==
        ruleIds.length
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Duplicate rules are not allowed",
        });
      }

      const activeRules =
        await prisma.propertyRule.findMany({
          where: {
            id: {
              in: uniqueRuleIds,
            },

            isActive: true,
          },

          select: {
            id: true,
          },
        });

      if (
        activeRules.length !==
        uniqueRuleIds.length
      ) {
        return res.status(422).json({
          success: false,
          message:
            "One or more selected rules are unavailable",
          errors: {
            ruleIds:
              "Please select only active rules.",
          },
        });
      }

      const updatedProperty =
        await prisma.$transaction(
          async (transaction) => {
            await transaction.propertyRuleAssignment.deleteMany(
              {
                where: {
                  propertyId,
                },
              }
            );

            await transaction.propertyRuleAssignment.createMany(
              {
                data:
                  uniqueRuleIds.map(
                    (ruleId) => ({
                      propertyId,
                      ruleId,
                    })
                  ),
              }
            );

            return transaction.property.findUnique(
              {
                where: {
                  id: propertyId,
                },

                include: {
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

                  ruleAssignments: {
                    include: {
                      rule: true,
                    },

                    orderBy: {
                      rule: {
                        sortOrder: "asc",
                      },
                    },
                  },
                },
              }
            );
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Property rules saved successfully",
        data: updatedProperty,
      });
    } catch (error) {
      console.error(
        "Update property rules error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update property rules",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Submit Property For Approval
|--------------------------------------------------------------------------
*/

export const submitPropertyForApproval =
  async (
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

      const property =
        await prisma.property.findFirst({
          where: {
            id: propertyId,

            vendor: {
              userId: req.user.id,
            },
          },

          include: {
            category: true,

            images: {
              orderBy: {
                sortOrder: "asc",
              },
            },

            amenities: {
              include: {
                amenity: true,
              },
            },

            roomTypes: true,
          },
        });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      if (
        property.status ===
        PropertyStatus.PENDING_APPROVAL
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property is already pending approval",
        });
      }

      if (
        property.status ===
          PropertyStatus.APPROVED ||
        property.status ===
          PropertyStatus.SUSPENDED
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This property cannot be submitted",
        });
      }

      const missingSections: MissingSection[] =
        [];

      /*
      |--------------------------------------------------------------------------
      | Basic Information Validation
      |--------------------------------------------------------------------------
      */

      const basicInformationComplete =
        Boolean(property.title.trim()) &&
        Boolean(property.categoryId) &&
        property.category.isActive &&
        Boolean(property.bookingType) &&
        Boolean(
          property.shortDescription?.trim()
        ) &&
        Boolean(
          property.description?.trim()
        ) &&
        Boolean(
          property.maxGuests &&
            property.maxGuests > 0
        );

      if (!basicInformationComplete) {
        missingSections.push({
          step: 1,
          title: "Basic Information",
          message:
            "Complete the title, category, descriptions, booking type and guest capacity.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Location Validation
      |--------------------------------------------------------------------------
      */

      const locationComplete =
        Boolean(
          property.addressLine1?.trim()
        ) &&
        Boolean(property.city?.trim()) &&
        Boolean(property.state?.trim()) &&
        Boolean(property.country?.trim()) &&
        Boolean(
          property.postalCode?.trim()
        );

      if (!locationComplete) {
        missingSections.push({
          step: 2,
          title: "Location",
          message:
            "Complete the address, city, state, country and postal code.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Photos Validation
      |--------------------------------------------------------------------------
      */

      const hasCoverImage =
        property.images.some(
          (image) => image.isCover
        );

      if (
        property.images.length < 3 ||
        !hasCoverImage
      ) {
        missingSections.push({
          step: 3,
          title: "Photos",
          message:
            "Upload at least 3 property photos and select a cover photo.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Pricing Validation
      |--------------------------------------------------------------------------
      */

      const isRoomWise = property.bookingType === "ROOM_WISE";
      const supportsRoomPricing =
        property.bookingType === "ROOM_WISE" ||
        property.bookingType === "BOTH";
      const hasPricedRoom =
        !supportsRoomPricing ||
        property.roomTypes.some(
          (roomType) =>
            roomType.isActive &&
            Number(roomType.basePrice) > 0
        );

      const pricingComplete =
        (isRoomWise || (property.basePrice !== null && Number(property.basePrice) > 0)) &&
        hasPricedRoom &&
        Boolean(property.checkInTime) &&
        Boolean(property.checkOutTime) &&
        property.minimumStay >= 1;

      if (!pricingComplete) {
        missingSections.push({
          step: 4,
          title: "Pricing",
          message:
            "Set check-in time, check-out time, minimum stay, full-property price when required, and at least one active room price for room-wise booking.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Amenities Validation
      |--------------------------------------------------------------------------
      */

      if (
        property.amenities.length === 0
      ) {
        missingSections.push({
          step: 5,
          title: "Amenities",
          message:
            "Select at least one available property amenity.",
        });
      }

      if (
        missingSections.length > 0
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Complete all required property sections before submission",
          data: {
            missingSections,
          },
        });
      }

      const submittedProperty =
        await prisma.property.update({
          where: {
            id: propertyId,
          },

          data: {
            status:
              PropertyStatus.PENDING_APPROVAL,

            submittedAt: new Date(),
            approvedAt: null,
            rejectionReason: null,
          },

          include: {
            category: true,
            images: true,

            amenities: {
              include: {
                amenity: true,
              },
            },
          },
        });

      return res.status(200).json({
        success: true,
        message:
          "Property submitted for approval successfully",
        data: submittedProperty,
      });
    } catch (error) {
      console.error(
        "Submit property error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to submit property for approval",
      });
    }
  };
