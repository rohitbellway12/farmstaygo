export type UserRole =
  | "USER"
  | "VENDOR"
  | "ADMIN"
  | "STAFF_ADMIN"
  | "SUPPORT";

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string | null;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
}

export interface VendorProfile {
  id: number;
  businessName: string;
  kycStatus:
    | "NOT_SUBMITTED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
}

export interface AuthData {
  user: AuthUser;
  vendor: VendorProfile | null;
  token: string;
}