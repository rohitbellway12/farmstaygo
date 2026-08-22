"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

interface PropertyMapProps {
  latitude: number | null;
  longitude: number | null;
  area: string | null;
  city: string | null;
  state: string | null;
  country: string;
}

type MapProvider = "GOOGLE";

interface MapSettings {
  mapProvider: MapProvider;
  mapApiKey: string | null;
}

const loadGoogleMaps = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const w = window as unknown as {
      google?: { maps?: unknown };
    };
    if (w.google?.maps) {
      resolve();
      return;
    }

    const existing = document.getElementById(
      "google-maps-script"
    );

    if (existing) {
      const interval = window.setInterval(() => {
        if (w.google?.maps) {
          window.clearInterval(interval);
          resolve();
        }
      }, 100);
      window.setTimeout(() => {
        window.clearInterval(interval);
        resolve();
      }, 10000);
      return;
    }

    const callbackName = "__fsgMapsCallback";
    (window as unknown as Record<string, () => void>)[
      callbackName
    ] = () => resolve();

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&libraries=places,geometry&loading=async&callback=${callbackName}`;
    script.async = true;
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
};

export default function PropertyMap({
  latitude,
  longitude,
  area,
  city,
  state,
  country,
}: PropertyMapProps) {
  const mapContainerRef =
    useRef<HTMLDivElement>(null);
  const googleMapRef =
    useRef<unknown>(null);
  const googleDirectionsRef =
    useRef<unknown>(null);
  const [googleReady, setGoogleReady] =
    useState(false);
  const [mapSettings, setMapSettings] =
    useState<MapSettings>({
      mapProvider: "GOOGLE",
      mapApiKey: null,
    });
  const [userLocation, setUserLocation] =
    useState<{ lat: number; lng: number } | null>(
      null
    );
  const [locationError, setLocationError] =
    useState<string | null>(null);
  const [routeLoading, setRouteLoading] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMapSettings = async () => {
      try {
        const data = await apiFetch<{
          success: boolean;
          data: {
            mapProvider: string;
            mapApiKey: string | null;
          };
        }>("/public/settings/map");

        if (!cancelled) {
          setMapSettings({
            mapProvider: "GOOGLE",
            mapApiKey: data.data.mapApiKey,
          });
        }
      } catch {
        if (!cancelled) {
          setMapSettings({
            mapProvider: "GOOGLE",
            mapApiKey: null,
          });
        }
      }
    };

    void loadMapSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapSettings.mapApiKey) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps(mapSettings.mapApiKey)
      .then(() => {
        if (!cancelled) setGoogleReady(true);
      })
      .catch(() => {
        if (!cancelled) setGoogleReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mapSettings.mapApiKey]);

  useEffect(() => {
    if (!mapContainerRef.current || !latitude || !longitude) {
      return;
    }

    if (!googleReady || !mapSettings.mapApiKey) {
      return;
    }

    renderGoogleMap();
    return () => cleanupGoogleMap();
  }, [
    googleReady,
    latitude,
    longitude,
    area,
    city,
    state,
    country,
    mapSettings.mapApiKey,
  ]);

  const renderGoogleMap = () => {
    const w = window as unknown as {
      google?: {
        maps?: {
          Map: new (
            el: HTMLElement,
            opts: Record<string, unknown>
          ) => unknown;
          Marker: new (
            opts: Record<string, unknown>
          ) => unknown;
          InfoWindow: new (
            opts: Record<string, unknown>
          ) => {
            open: (
              m: unknown,
              anchor?: unknown
            ) => void;
          };
          DirectionsService: new () => {
            route: (
              req: Record<string, unknown>,
              cb: (
                res: unknown,
                status: string
              ) => void
            ) => void;
          };
          DirectionsRenderer: new (
            opts?: Record<string, unknown>
          ) => {
            setMap: (m: unknown) => void;
            setDirections: (d: unknown) => void;
          };
          TravelMode: { DRIVING: string };
          LatLng: new (
            lat: number,
            lng: number
          ) => unknown;
        };
      };
    };

    const maps = w.google?.maps;
    if (!maps || !mapContainerRef.current) return;

    const map = new maps.Map(mapContainerRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom: 15,
      mapTypeControl: false,
    });

    const marker = new maps.Marker({
      position: { lat: latitude, lng: longitude },
      map,
    });

    const locationStr = [area, city, state, country]
      .filter(Boolean)
      .join(", ");

    const infoWindow = new maps.InfoWindow({
      content: locationStr || "Property location",
    });
    infoWindow.open(map, marker);

    googleMapRef.current = map;
    googleDirectionsRef.current = null;
  };

  const cleanupGoogleMap = () => {
    googleMapRef.current = null;
    googleDirectionsRef.current = null;
  };

  const handleGetDirections = () => {
    if (!latitude || !longitude) return;
    startGoogleDirections();
  };

  const startGoogleDirections = () => {
    if (!latitude || !longitude) return;
    const w = window as unknown as {
      google?: {
        maps?: {
          DirectionsService: new () => {
            route: (
              req: Record<string, unknown>,
              cb: (
                res: unknown,
                status: string
              ) => void
            ) => void;
          };
          DirectionsRenderer: new (
            opts?: Record<string, unknown>
          ) => {
            setMap: (m: unknown) => void;
            setDirections: (d: unknown) => void;
          };
          TravelMode: { DRIVING: string };
          LatLng: new (
            lat: number,
            lng: number
          ) => unknown;
        };
      };
    };

    const maps = w.google?.maps;
    const map = googleMapRef.current as
      | (Record<string, unknown> | null)
      | null;
    if (!maps || !map) return;

    setLocationError(null);
    setRouteLoading(true);

    const service = new maps.DirectionsService();
    const renderer = new maps.DirectionsRenderer();
    renderer.setMap(map);
    googleDirectionsRef.current = renderer;

    if (!window.isSecureContext || !navigator.geolocation) {
      setLocationError(
        "Location access needs HTTPS or localhost. Please open the site over a secure (https) connection."
      );
      setRouteLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        service.route(
          {
            origin: new maps.LatLng(
              position.coords.latitude,
              position.coords.longitude
            ),
            destination: new maps.LatLng(latitude, longitude),
            travelMode: maps.TravelMode.DRIVING,
          },
          (res: unknown, status: string) => {
            if (status === "OK") {
              renderer.setDirections(res);
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            } else {
              setLocationError(
                "Unable to calculate route."
              );
            }
            setRouteLoading(false);
          }
        );
      },
      (error) => {
        const insecure =
          !window.isSecureContext ||
          /secure origin/i.test(error.message || "");
        setLocationError(
          insecure
            ? "Location access needs HTTPS or localhost. Please open the site over a secure (https) connection."
            : (error.message ||
              "Unable to get your location")
        );
        setRouteLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const locationText = [area, city, state, country]
    .filter(Boolean)
    .join(", ");

  const openInGoogleMaps = () => {
    if (!latitude || !longitude) return;
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!latitude || !longitude) {
    return (
      <div className="rounded-xl border border-border bg-surface-soft p-6 text-center">
        <p className="text-sm text-text-muted">
          Exact location map is not available for this
          property.
        </p>
      </div>
    );
  }

  if (!mapSettings.mapApiKey) {
    return (
      <div className="rounded-xl border border-border bg-surface-soft p-6 text-center">
        <p className="text-sm text-text-muted">
          Google Maps API key is not configured. Please
          contact the administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-lg font-extrabold text-ink-900">
          Location
        </h3>
        <p className="mt-1 text-sm text-ink-600">
          {locationText}
        </p>
      </div>

      <div
        ref={mapContainerRef}
        className="h-[320px] w-full"
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={openInGoogleMaps}
          className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-4 text-xs font-bold text-text-secondary transition hover:bg-surface-muted"
        >
          Open in Google Maps
        </button>

        <button
          type="button"
          onClick={handleGetDirections}
          disabled={routeLoading}
          className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-4 text-xs font-bold text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {routeLoading
            ? "Calculating route..."
            : "Get Directions"}
        </button>
      </div>

      {locationError && (
        <div className="border-t border-border px-5 py-3">
          <p className="text-xs font-semibold text-red-600">
            {locationError}
          </p>
        </div>
      )}

      {userLocation && (
        <div className="flex items-center gap-4 border-t border-border px-5 py-3 text-xs text-text-secondary">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            Your location
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            Property location
          </span>
        </div>
      )}
    </div>
  );
}
