import type { Response } from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import prisma from "../config/database.js";

import type {
  Prisma,
} from "../generated/prisma/client.js";

import {
  PropertyBookingType,
  PropertyStatus,
} from "../generated/prisma/client.js";

const toNumber = (
  value: unknown
): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsedValue =
    Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
};

const buildPublicDisplayTitle = (
  property: WishlistPropertyRecord
): string => {
  const title = (property?.title || "").trim();

  if (title) {
    return title;
  }

  const approximateLocation =
    property?.locality ||
    property?.city ||
    property?.state ||
    "a peaceful destination";

  return `${property?.category?.name || "Property"} near ${approximateLocation}`;
};

const roomIsPublicReady = (
  roomType: WishlistPropertyRecord["roomTypes"][number]
): boolean => {
  return (
    Boolean(roomType?.isActive) &&
    (roomType?.totalRooms ?? 0) > 0 &&
    toNumber(roomType?.basePrice) !== null &&
    Number(roomType?.basePrice) > 0
  );
};

const supportsEntireProperty = (
  bookingType: PropertyBookingType
): boolean => {
  return (
    bookingType === PropertyBookingType.ENTIRE_PROPERTY ||
    bookingType === PropertyBookingType.BOTH
  );
};

const supportsRoomBooking = (
  bookingType: PropertyBookingType
): boolean => {
  return (
    bookingType === PropertyBookingType.ROOM_WISE ||
    bookingType === PropertyBookingType.BOTH
  );
};

const getStartingPrice = (
  property: WishlistPropertyRecord
): number | null => {
  const availablePrices: number[] = [];

  if (supportsEntireProperty(property.bookingType)) {
    const propertyPrice =
      toNumber(property?.basePrice);

    if (
      propertyPrice !== null &&
      propertyPrice > 0
    ) {
      availablePrices.push(propertyPrice);
    }
  }

  if (supportsRoomBooking(property.bookingType)) {
    (property?.roomTypes || [])
      .filter(roomIsPublicReady)
      .forEach((roomType) => {
        const roomPrice =
          toNumber(roomType?.basePrice);

        if (
          roomPrice !== null &&
          roomPrice > 0
        ) {
          availablePrices.push(roomPrice);
        }
      });
  }

  if (availablePrices.length === 0) {
    return null;
  }

  return Math.min(...availablePrices);
};

const mapWishlistProperty = (
  property: WishlistPropertyRecord
) => {
  const images = Array.isArray(property?.images) ? property.images : [];
  const roomTypes = Array.isArray(property?.roomTypes) ? property.roomTypes : [];

  const coverImage =
    images.find(
      (image) => image?.isCover
    ) ||
    images[0] ||
    null;

  return {
    publicId: property.id,

    displayTitle:
      buildPublicDisplayTitle(property),

    shortDescription:
      property.shortDescription || null,

    bookingType:
      property.bookingType,

    isFeatured:
      Boolean(property.isFeatured),

    category:
      property.category || null,

    location: {
      area:
        property.locality || null,
      city:
        property.city || null,
      state:
        property.state || null,
      country:
        property.country || "India",
    },

    capacity: {
      maxGuests:
        property.maxGuests ?? null,
      bedrooms:
        property.bedrooms ?? null,
      bathrooms:
        property.bathrooms ?? null,
      beds:
        property.beds ?? null,
      totalRooms:
        property.totalRooms ?? null,
    },

    pricing: {
      startingPrice:
        getStartingPrice(property),
      basePrice:
        toNumber(property.basePrice),
      currency:
        "INR" as const,
      unit:
        property.bookingType ===
        PropertyBookingType.ROOM_WISE
          ? ("PER_ROOM_PER_NIGHT" as const)
          : ("PER_NIGHT" as const),
    },

    coverImage,

    imageCount:
      images.length,

    amenityCount: 0,

    roomTypeCount:
      roomTypes.filter(
        roomIsPublicReady
      ).length,

    availability: {
      checked: false,
      available: true,
      availableModes:
        supportsRoomBooking(
          property.bookingType
        )
          ? supportsEntireProperty(
              property.bookingType
            )
            ? [
                "ENTIRE_PROPERTY",
                "ROOM_WISE",
              ]
            : ["ROOM_WISE"]
          : ["ENTIRE_PROPERTY"],
    },
  };
};

const wishlistPropertyInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      image: true,
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
    select: {
      id: true,
      image: true,
      altText: true,
      isCover: true,
      sortOrder: true,
    },
  },
  roomTypes: {
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      totalRooms: true,
      maxAdults: true,
      maxChildren: true,
      maxGuests: true,
      beds: true,
      bathrooms: true,
      basePrice: true,
      weekendPrice: true,
      isActive: true,
      sortOrder: true,
    },
  },
} satisfies Prisma.PropertyInclude;

type WishlistPropertyRecord =
  Prisma.PropertyGetPayload<{
    include: typeof wishlistPropertyInclude;
  }>;

/*
|--------------------------------------------------------------------------
| Customer: Get Wishlist
|--------------------------------------------------------------------------
|
| Returns all wishlisted properties for the authenticated user.
|
*/

export const getWishlist = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userId = Number(req.user.id);
    if (isNaN(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication token",
      });
    }

    const wishlists = await prisma.wishlist.findMany({
      where: {
        userId,
        property: {
          status: PropertyStatus.APPROVED,
          category: {
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        property: {
          include:
            wishlistPropertyInclude,
        },
      },
    });

    const properties = wishlists
      .filter((item) => Boolean(item && item.property))
      .map((item) => mapWishlistProperty(item.property));

    return res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      data: properties,
      total: properties.length,
    });
  } catch (error) {
    console.error(
      "Get wishlist error:",
      error instanceof Error ? error.message : error,
      error instanceof Error ? error.stack : ""
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch wishlist",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Customer: Add to Wishlist
|--------------------------------------------------------------------------
|
| Request body:
| {
|   "propertyId": "property-id"
| }
|
*/

export const addToWishlist = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userId = Number(req.user.id);
    if (isNaN(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication token",
      });
    }

    const propertyId = String(
      req.body.propertyId || ""
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
          status: true,
        },
      });

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (existingProperty.status !== "APPROVED") {
      return res.status(409).json({
        success: false,
        message:
          "Only approved properties can be added to wishlist",
      });
    }

    const existingWishlist =
      await prisma.wishlist.findUnique({
        where: {
          userId_propertyId: {
            userId,
            propertyId,
          },
        },
      });

    if (existingWishlist) {
      return res.status(409).json({
        success: false,
        message: "Property is already in your wishlist",
      });
    }

    await prisma.wishlist.create({
      data: {
        userId,
        propertyId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Property added to wishlist",
    });
  } catch (error) {
    console.error(
      "Add to wishlist error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to add to wishlist",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Customer: Remove from Wishlist
|--------------------------------------------------------------------------
|
| Request body:
| {
|   "propertyId": "property-id"
| }
|
*/

export const removeFromWishlist = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userId = Number(req.user.id);
    if (isNaN(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication token",
      });
    }

    const propertyId = String(
      req.body.propertyId || ""
    ).trim();

    if (!propertyId) {
      return res.status(422).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const existingWishlist =
      await prisma.wishlist.findUnique({
        where: {
          userId_propertyId: {
            userId,
            propertyId,
          },
        },
      });

    if (!existingWishlist) {
      return res.status(404).json({
        success: false,
        message: "Property is not in your wishlist",
      });
    }

    await prisma.wishlist.delete({
      where: {
        id: existingWishlist.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Property removed from wishlist",
    });
  } catch (error) {
    console.error(
      "Remove from wishlist error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to remove from wishlist",
    });
  }
};
