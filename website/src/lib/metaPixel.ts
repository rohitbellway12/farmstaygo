export const FB_PIXEL_ID =
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || "1815534316115430";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/**
 * Standard Meta Pixel Event Names
 */
export type MetaStandardEvent =
  | "PageView"
  | "ViewContent"
  | "Search"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead"
  | "Contact"
  | "CompleteRegistration"
  | "AddToWishlist"
  | "AddToCart"
  | "AddPaymentInfo";

/**
 * Common event parameters for Meta Pixel
 */
export interface MetaEventParams {
  content_name?: string;
  content_category?: string;
  content_ids?: Array<string | number>;
  content_type?: string;
  contents?: Array<{
    id: string | number;
    quantity?: number;
    item_price?: number;
  }>;
  currency?: string;
  value?: number;
  search_string?: string;
  num_items?: number;
  status?: boolean | string;
  [key: string]: unknown;
}

/**
 * Triggers standard PageView event.
 */
export function pageview(): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "PageView");
  }
}

let lastEventKey = "";
let lastEventTime = 0;

/**
 * Triggers a standard Meta Pixel event.
 * Automatically deduplicates identical events fired in rapid succession (<1.5s)
 * which commonly happens in React Strict Mode (dev) or on accidental double-clicks.
 */
export function trackEvent(
  name: MetaStandardEvent,
  params?: MetaEventParams
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    const currentKey = `${name}:${JSON.stringify(params || {})}`;
    const now = Date.now();

    if (currentKey === lastEventKey && now - lastEventTime < 1500) {
      return;
    }

    lastEventKey = currentKey;
    lastEventTime = now;

    if (params && Object.keys(params).length > 0) {
      window.fbq("track", name, params);
    } else {
      window.fbq("track", name);
    }
  }
}

/**
 * Triggers a custom Meta Pixel event.
 */
export function trackCustomEvent(
  name: string,
  params?: Record<string, unknown>
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    const currentKey = `custom_${name}:${JSON.stringify(params || {})}`;
    const now = Date.now();

    if (currentKey === lastEventKey && now - lastEventTime < 1500) {
      return;
    }

    lastEventKey = currentKey;
    lastEventTime = now;

    if (params && Object.keys(params).length > 0) {
      window.fbq("trackCustom", name, params);
    } else {
      window.fbq("trackCustom", name);
    }
  }
}
