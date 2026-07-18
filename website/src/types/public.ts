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

export interface PublicAmenity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  group: string;
}

export interface PublicRoomType {
  id: string;
  name: string;
  description: string | null;

  inventory: {
    totalRooms: number;
    minimumAvailableRooms: number;
  };

  capacity: {
    maxAdults: number;
    maxChildren: number;
    maxGuests: number;
    beds: number;
    bathrooms: number;
  };

  pricing: {
    basePrice: number | null;
    weekendPrice: number | null;
    unit: "PER_ROOM_PER_NIGHT";
  };

  images: PublicImage[];
  amenities: PublicAmenity[];

  availability: {
    available: boolean;
    minimumAvailableRooms: number;
  };
}

export interface PublicPropertyDetail
  extends Omit<
    PublicPropertyCard,
    | "coverImage"
    | "imageCount"
    | "amenityCount"
    | "roomTypeCount"
    | "pricing"
    | "availability"
  > {
  description: string | null;

  location: PublicPropertyCard["location"] & {
    exactLocationProtected: boolean;
  };

  stayInformation: {
    checkInTime: string | null;
    checkOutTime: string | null;
    minimumStay: number;
    instantBook: boolean;
  };

  pricing: {
    startingPrice: number | null;
    entireProperty: {
      basePrice: number | null;
      weekendPrice: number | null;
      cleaningFee: number | null;
      securityDeposit: number | null;
      unit: "PER_NIGHT";
    };
    currency: "INR";
  };

  images: PublicImage[];
  amenities: PublicAmenity[];
  roomTypes: PublicRoomType[];

  availability: PublicPropertyCard["availability"] & {
    dateRange: {
      checkIn: string;
      checkOut: string;
      totalNights: number;
    } | null;
    requestedGuests: number;
    requestedRooms: number;
  };

  privacy: {
    exactPropertyNameProtected: boolean;
    fullAddressProtected: boolean;
    mapCoordinatesProtected: boolean;
    vendorContactProtected: boolean;
    revealAfterSuccessfulBooking: boolean;
  };
}

export interface PublicPropertyDetailResponse {
  success: boolean;
  message: string;
  data: PublicPropertyDetail;
}
