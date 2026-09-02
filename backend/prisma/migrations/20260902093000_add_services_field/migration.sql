-- Add services field to Property table
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT ARRAY[]::TEXT[];
