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

export interface PublicServiceCity {
  id: string;
  name: string;
  state: string;
  country: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PublicServiceCitiesResponse {
  success: boolean;
  message: string;
  data: PublicServiceCity[];
  total: number;
}

export interface PublicCmsPage {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  excerpt: string | null;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
  showInFooter: boolean;
  footerGroup: string;
  sortOrder: number;
}

export interface PublicCmsPagesResponse {
  success: boolean;
  message: string;
  data: PublicCmsPage[];
  total: number;
}

export interface PublicCmsPageResponse {
  success: boolean;
  message: string;
  data: PublicCmsPage;
}

export interface PublicPropertyCard {
  publicId: string;
  displayTitle: string;
  shortDescription: string | null;
  bookingType: PropertyBookingType;
  isFeatured: boolean;
  services: string[];

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
    latitude: number | null;
    longitude: number | null;
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
  images: PublicImage[];
  imageCount: number;
  amenityCount: number;
  roomTypeCount: number;
  ruleCount: number;
  rules: PublicPropertyRule[];

  availability: {
    checked: boolean;
    available: boolean;
    availableModes: Array<
      "ENTIRE_PROPERTY" | "ROOM_WISE"
    >;
    entireProperty?: {
      supported: boolean;
      ready: boolean;
      available: boolean;
      maximumGuests: number | null;
      guestCapacityValid: boolean;
      propertyBlocked: boolean;
      propertyBooked?: boolean;
      roomInventoryConflict: boolean;
      basePrice: number | null;
      weekendPrice: number | null;
    };
    roomBooking?: {
      supported: boolean;
      available: boolean;
      availableRoomTypeCount: number;
      roomTypes: Array<{
        roomTypeId: string;
        name: string;
        totalRooms: number;
        requestedRooms: number;
        maximumGuestsPerRoom: number;
        minimumAvailableRooms: number;
        guestCapacityValid: boolean;
        inventoryValid: boolean;
        available: boolean;
        nightlyAvailability: Array<{
          date: string;
          propertyBlocked: boolean;
          entireBooked?: boolean;
          manuallyBlocked: number;
          bookedRooms?: number;
          availableRooms: number;
        }>;
      }>;
    };
  };
}

export interface PublicAvailabilityResponse {
  success: boolean;
  message: string;
  data: {
    property: {
      publicId: string;
      displayTitle: string;
      bookingType: PropertyBookingType;
      category: PublicPropertyCard["category"];
      location: {
        area: string | null;
        city: string | null;
        state: string | null;
      };
    };
    availability: PublicPropertyDetail["availability"];
    nightlyAvailability: Array<{
      date: string;
      propertyBlocked: boolean;
      entireBooked?: boolean;
      roomTypes: Array<{
        roomTypeId: string;
        name: string;
        totalRooms: number;
        manuallyBlocked: number;
        bookedRooms?: number;
        availableRooms: number;
      }>;
    }>;
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

export interface PublicRelatedPropertiesResponse {
  success: boolean;
  message: string;
  data: PublicPropertyCard[];
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

export interface PublicPropertyRule {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
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
    reservationAmountPerNight: number | null;
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
      reservationAmountPerNight: number | null;
      unit: "PER_NIGHT";
    };
    currency: "INR";
  };

  images: PublicImage[];
  amenities: PublicAmenity[];
  rules: PublicPropertyRule[];
  roomTypes: PublicRoomType[];
  cancellationPolicy: string | null;
  termsConditions: string | null;

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

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicContactInfo {
  email: string | null;
  phone: string | null;
  socialLinks: SocialLink[];
  contactImage?: string | null;
}

export interface PublicContactInfoResponse {
  success: boolean;
  message: string;
  data: PublicContactInfo;
}

export interface ContactMessageResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface MapSettings {
  mapProvider: string;
  mapApiKey: string | null;
}

export interface MapSettingsResponse {
  success: boolean;
  message: string;
  data: MapSettings;
}

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
}

export interface PublicFaqsResponse {
  success: boolean;
  message: string;
  data: PublicFaq[];
}

export interface PublicReview {
  id: string;
  propertyId: string;
  guestName: string;
  guestEmail: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
}

export interface PublicReviewsResponse {
  success: boolean;
  data: {
    reviews: PublicReview[];
    averageRating: number;
    totalReviews: number;
  };
}
