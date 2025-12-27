-- Add expiration columns to qr_pages
ALTER TABLE public.qr_pages 
ADD COLUMN expires_at timestamp with time zone DEFAULT NULL,
ADD COLUMN is_deleted boolean DEFAULT false,
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient querying of expired/deleted QR codes
CREATE INDEX idx_qr_pages_expires_at ON public.qr_pages(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_qr_pages_deleted_at ON public.qr_pages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies to exclude soft-deleted QR pages from public view
DROP POLICY IF EXISTS "Anyone can view public QR pages" ON public.qr_pages;
CREATE POLICY "Anyone can view public QR pages" 
ON public.qr_pages 
FOR SELECT 
USING (is_deleted = false AND (expires_at IS NULL OR expires_at > now()));

-- Users can view their own QR pages including deleted ones (for recycle bin)
DROP POLICY IF EXISTS "Users can view their own QR pages" ON public.qr_pages;
CREATE POLICY "Users can view their own QR pages" 
ON public.qr_pages 
FOR SELECT 
USING (auth.uid() = user_id);