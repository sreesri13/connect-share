-- Add password_hash and expires_at columns to qr_business_pages table for full QR management
ALTER TABLE public.qr_business_pages 
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Update the public access policy to also check expiration
DROP POLICY IF EXISTS "Anyone can view public QR business pages" ON public.qr_business_pages;

CREATE POLICY "Anyone can view public QR business pages" 
ON public.qr_business_pages 
FOR SELECT 
USING ((is_deleted = false) AND ((expires_at IS NULL) OR (expires_at > now())));