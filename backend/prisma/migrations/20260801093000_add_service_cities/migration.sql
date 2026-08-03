CREATE TABLE "service_cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_cities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_cities_name_state_country_key" ON "service_cities"("name", "state", "country");
CREATE INDEX "service_cities_isActive_sortOrder_idx" ON "service_cities"("isActive", "sortOrder");
