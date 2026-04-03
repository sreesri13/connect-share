
-- Add 'largefile' to item_type enum
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'largefile';

-- Add branding/toggle columns to qr_pages
ALTER TABLE public.qr_pages
  ADD COLUMN IF NOT EXISTS qr_logo_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_install_popup boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_footer_branding boolean NOT NULL DEFAULT true;

-- Add branding/toggle columns to qr_business_pages
ALTER TABLE public.qr_business_pages
  ADD COLUMN IF NOT EXISTS qr_logo_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_install_popup boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_footer_branding boolean NOT NULL DEFAULT true;
