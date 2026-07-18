export type PropertyBookingType =
  | "ENTIRE_PROPERTY"
  | "ROOM_WISE"
  | "BOTH";

export interface PublicImage {
  id: string;
  image: string;
  altText: string | null;
  isCover: boolean;
  sortOrder: number;
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  sortOrder: number;
  propertyCount: number;
}

export interface PublicPropertyCard {
  publicId: string;
  displayTitle: string;
  shortDescription: string | null;
  bookingType: PropertyBookingType;
  isFeatured: boolean;

  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    image: string | null;
  };

  location: {
    area: string | null;
    city: string | null;
    state: string | null;
    country: string;
  };

  capacity: {
    maxGuests: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    beds: number | null;
    totalRooms: number | null;
  };

  pricing: {
    startingPrice: number | null;
    basePrice: number | null;
    currency: "INR";
    unit: "PER_ROOM_PER_NIGHT" | "PER_NIGHT";
  };

  coverImage: PublicImage | null;
  imageCount: number;
  amenityCount: number;
  roomTypeCount: number;

  availability: {
    checked: boolean;
    available: boolean;
    availableModes: Array<
      "ENTIRE_PROPERTY" | "ROOM_WISE"
    >;
  };
}

export interface PublicCategoriesResponse {
  success: boolean;
  message: string;
  data: PublicCategory[];
  total: number;
}

export interface PublicPropertiesResponse {
  success: boolean;
  message: string;
  data: PublicPropertyCard[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
