
ALTER TABLE public.qr_business_pages 
ADD COLUMN store_slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX idx_qr_business_pages_store_slug ON public.qr_business_pages(store_slug) WHERE store_slug IS NOT NULL;
