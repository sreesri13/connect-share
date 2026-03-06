
-- Add scan limit columns to qr_pages
ALTER TABLE public.qr_pages 
  ADD COLUMN IF NOT EXISTS scan_limit_type TEXT NOT NULL DEFAULT 'unlimited',
  ADD COLUMN IF NOT EXISTS max_scans INTEGER,
  ADD COLUMN IF NOT EXISTS daily_limit INTEGER;

-- Add scan limit columns to qr_business_pages
ALTER TABLE public.qr_business_pages 
  ADD COLUMN IF NOT EXISTS scan_limit_type TEXT NOT NULL DEFAULT 'unlimited',
  ADD COLUMN IF NOT EXISTS max_scans INTEGER,
  ADD COLUMN IF NOT EXISTS daily_limit INTEGER;
