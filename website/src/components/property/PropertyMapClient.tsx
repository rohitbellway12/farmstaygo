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

type MapProvider = "OPENSTREETMAP" | "GOOGLE" | "MAPBOX";

type LeafletMap = {
  remove: () => void;
  invalidateSize: () => void;
  fitBounds: (
    bounds: [[number, number], [number, number]],
    options?: Record<string, unknown>
  ) => void;
};

type LeafletTileLayer = {
  addTo: (map: LeafletMap) => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (content: string) => LeafletMarker;
};

type LeafletPolyline = {
  addTo: (map: LeafletMap) => LeafletPolyline;
  remove: () => void;
};

type LeafletApi = {
  map: (
    container: string | HTMLElement,
    options: Record<string, unknown>
  ) => LeafletMap;
  tileLayer: (
    url: string,
    options: Record<string, unknown>
  ) => LeafletTileLayer;
  marker: (
    latlng: [number, number],
    options?: Record<string, unknown>
  ) => LeafletMarker;
  polyline: (
    latlngs: [number, number][],
    options: Record<string, unknown>
  ) => LeafletPolyline;
  control: {
    zoom: () => {
      addTo: (map: LeafletMap) => void;
    };
  };
};

export default function PropertyMap({
  latitude,
  longitude,
  area,
  city,
  state,
  country,
}: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef =
    useRef<LeafletMap | null>(null);
  const markerRef =
    useRef<LeafletMarker | null>(null);
  const routeLayerRef =
    useRef<LeafletPolyline | null>(null);
  const [leafletLoaded, setLeafletLoaded] =
    useState(false);
  const [mapSettings, setMapSettings] =
    useState<{
      mapProvider: MapProvider;
      mapApiKey: string | null;
    }>({
      mapProvider: "OPENSTREETMAP",
      mapApiKey: null,
    });
  const [userLocation, setUserLocation] =
    useState<{ lat: number; lng: number } | null>(null);
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
            mapProvider: (data.data.mapProvider ||
              "OPENSTREETMAP") as MapProvider,
            mapApiKey: data.data.mapApiKey,
          });
        }
      } catch {
        if (!cancelled) {
          setMapSettings({
            mapProvider: "OPENSTREETMAP",
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
    const existingLeaflet = (window as unknown as {
      L?: LeafletApi;
    }).L;

    if (existingLeaflet) {
      setLeafletLoaded(true);
      return;
    }

    const stylesheetId = "leaflet-map-styles-website";
    const scriptId = "leaflet-map-script-website";

    if (
      !document.getElementById(stylesheetId)
    ) {
      const link = document.createElement("link");
      link.id = stylesheetId;
      link.rel = "stylesheet";
      link.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(
      scriptId
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => setLeafletLoaded(true),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.addEventListener(
      "load",
      () => setLeafletLoaded(true),
      { once: true }
    );
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (
      !leafletLoaded ||
      !mapContainerRef.current ||
      !latitude ||
      !longitude
    ) {
      return;
    }

    const leaflet = (window as unknown as {
      L?: LeafletApi;
    }).L;

    if (!leaflet) {
      return;
    }

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    markerRef.current = null;
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    const map = leaflet.map(
      mapContainerRef.current,
      {
        center: [latitude, longitude] as [
          number,
          number,
        ],
        zoom: 15,
        scrollWheelZoom: false,
      }
    );

    leaflet.control.zoom().addTo(map);

    const tileConfig = (() => {
      switch (mapSettings.mapProvider) {
        case "GOOGLE":
          return {
            url:
              `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}` +
              (mapSettings.mapApiKey
                ? `&key=${mapSettings.mapApiKey}`
                : ""),
            attribution:
              '&copy; <a href="https://maps.google.com">Google Maps</a>',
          };
        case "MAPBOX":
          return {
            url:
              mapSettings.mapApiKey &&
              `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapSettings.mapApiKey}`,
            attribution:
              '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
          };
        default:
          return {
            url:
              "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          };
      }
    })();

    if (tileConfig.url) {
      leaflet
        .tileLayer(tileConfig.url, {
          attribution: tileConfig.attribution,
          maxZoom: 19,
        })
        .addTo(map);
    }

    const marker = leaflet
      .marker([latitude, longitude] as [
        number,
        number,
      ])
      .addTo(map);

    const locationStr = [
      area,
      city,
      state,
      country,
    ]
      .filter(Boolean)
      .join(", ");

    marker.bindPopup(
      locationStr || "Property location"
    );

    mapRef.current = map;
    markerRef.current = marker;

    window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      routeLayerRef.current?.remove();
      routeLayerRef.current = null;
    };
  }, [
    leafletLoaded,
    latitude,
    longitude,
    area,
    city,
    state,
    country,
    mapSettings.mapProvider,
    mapSettings.mapApiKey,
  ]);

  const handleGetDirections = () => {
    if (!latitude || !longitude) return;

    if (navigator.geolocation) {
      setLocationError(null);
      setRouteLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setUserLocation({
            lat: userLat,
            lng: userLng,
          });

          drawRoute(userLat, userLng, latitude, longitude);
          setRouteLoading(false);
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
    } else {
      setLocationError(
        "Geolocation is not supported by your browser"
      );
    }
  };

  const drawRoute = async (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ) => {
    const leaflet = (window as unknown as {
      L?: LeafletApi;
    }).L;

    if (!leaflet || !mapRef.current) {
      return;
    }

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch route");
      }

      const data = (await response.json()) as {
        routes?: Array<{
          geometry: {
            coordinates: [number, number][];
          };
        }>;
      };

      if (data.routes && data.routes[0]) {
        const coordinates =
          data.routes[0].geometry.coordinates.map(
            (coord) => [coord[1], coord[0]] as [
              number,
              number
            ]
          );

        const routeLine = leaflet.polyline(
          coordinates,
          {
            color: "#2563eb",
            weight: 5,
            opacity: 0.8,
          }
        );

        routeLine.addTo(mapRef.current);
        routeLayerRef.current = routeLine;

        const bounds = coordinates.reduce(
          (bounds: [[number, number], [number, number]], coord) => {
            bounds[0][0] = Math.min(
              bounds[0][0],
              coord[0]
            );
            bounds[0][1] = Math.min(
              bounds[0][1],
              coord[1]
            );
            bounds[1][0] = Math.max(
              bounds[1][0],
              coord[0]
            );
            bounds[1][1] = Math.max(
              bounds[1][1],
              coord[1]
            );
            return bounds;
          },
          [
            [coordinates[0][0], coordinates[0][1]],
            [coordinates[0][0], coordinates[0][1]],
          ]
        );

        mapRef.current.fitBounds(
          bounds,
          { padding: [50, 50] }
        );
      }
    } catch {
      setLocationError(
        "Unable to calculate route. Please try again."
      );
    }
  };

  const locationText = [
    area,
    city,
    state,
    country,
  ]
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
