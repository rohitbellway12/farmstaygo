import { apiFetch, ApiRequestError } from "./api";

export interface VendorPropertyRule {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPropertyRulesResponse {
  success: boolean;
  message: string;
  data: VendorPropertyRule[];
}

export async function getVendorPropertyRules(): Promise<VendorPropertyRule[]> {
  const response =
    await apiFetch<VendorPropertyRulesResponse>(
      "/vendor/property-rules"
    );

  return response.data;
}

export interface UpdatePropertyRulesPayload {
  ruleIds: string[];
}

export interface PropertyUpdateResponse {
  success: boolean;
  message: string;
  data: unknown;
}

export async function updatePropertyRules(
  propertyId: string,
  ruleIds: string[]
): Promise<unknown> {
  const response =
    await apiFetch<PropertyUpdateResponse>(
      `/vendor/properties/${propertyId}/rules`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ruleIds }),
      }
    );

  return response.data;
}
