-- Add location lock fields to qr_pages table
ALTER TABLE public.qr_pages
ADD COLUMN location_locked boolean DEFAULT false,
ADD COLUMN location_lat double precision,
ADD COLUMN location_lng double precision,
ADD COLUMN location_name text;

-- Add location lock fields to qr_business_pages table
ALTER TABLE public.qr_business_pages
ADD COLUMN location_locked boolean DEFAULT false,
ADD COLUMN location_lat double precision,
ADD COLUMN location_lng double precision,
ADD COLUMN location_name text;