"use client";

import { useState } from "react";

type ServiceConfig = {
  name: string;
  logo: string;
  bg: string;
  textColor?: string;
};

const serviceConfigs: Record<string, ServiceConfig> = {
  swiggy: {
    name: "Swiggy",
    logo: "https://logo.clearbit.com/swiggy.com",
    bg: "#fc8019",
    textColor: "#ffffff",
  },
  zomato: {
    name: "Zomato",
    logo: "https://logo.clearbit.com/zomato.com",
    bg: "#e23744",
    textColor: "#ffffff",
  },
  uber: {
    name: "Uber",
    logo: "https://logo.clearbit.com/uber.com",
    bg: "#000000",
    textColor: "#ffffff",
  },
  ola: {
    name: "Ola Cabs",
    logo: "https://logo.clearbit.com/olacabs.com",
    bg: "#1c9e0f",
    textColor: "#ffffff",
  },
  zepto: {
    name: "Zepto",
    logo: "https://logo.clearbit.com/zeptonow.com",
    bg: "#4c1d95",
    textColor: "#ffffff",
  },
  asag_travels: {
    name: "ASAG Travels",
    logo: "",
    bg: "#1b3a27",
    textColor: "#ffffff",
  },
};

type ServiceCardProps = {
  serviceId: string;
};

export default function ServiceCard({ serviceId }: ServiceCardProps) {
  const [imageError, setImageError] = useState(false);

  const config = serviceConfigs[serviceId] || {
    name: serviceId,
    logo: "",
    bg: "#64748b",
    textColor: "#ffffff",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-ink-100 bg-white p-4 text-center shadow-[0_4px_12px_rgba(27,58,39,0.08)] hover:shadow-[0_8px_20px_rgba(27,58,39,0.12)] transition-shadow">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl overflow-hidden"
        style={{ backgroundColor: config.bg }}
      >
        {config.logo && !imageError ? (
          <img
            src={config.logo}
            alt={config.name}
            className="h-full w-full object-contain p-1.5"
            onError={() => setImageError(true)}
          />
        ) : (
          <span
            style={{ color: config.textColor || "#fff" }}
            className="font-black text-sm"
          >
            {config.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span className="block text-xs font-bold leading-tight text-ink-700 line-clamp-2">
        {config.name}
      </span>
    </div>
  );
}
