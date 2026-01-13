-- Add show_expires_at column to qr_pages table
ALTER TABLE public.qr_pages 
ADD COLUMN show_expires_at boolean DEFAULT false;

-- Add show_expires_at column to qr_business_pages table
ALTER TABLE public.qr_business_pages 
ADD COLUMN show_expires_at boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.qr_pages.show_expires_at IS 'Whether to show the expiry countdown to visitors who scan the QR code';
COMMENT ON COLUMN public.qr_business_pages.show_expires_at IS 'Whether to show the expiry countdown to visitors who scan the QR code';