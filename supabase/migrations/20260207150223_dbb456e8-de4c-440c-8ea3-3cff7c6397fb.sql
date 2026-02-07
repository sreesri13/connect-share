
-- Add business information columns to qr_business_pages
ALTER TABLE public.qr_business_pages
ADD COLUMN business_name TEXT,
ADD COLUMN business_logo_url TEXT,
ADD COLUMN business_address TEXT,
ADD COLUMN business_phone TEXT,
ADD COLUMN business_email TEXT,
ADD COLUMN business_website TEXT,
ADD COLUMN business_instagram TEXT,
ADD COLUMN business_facebook TEXT,
ADD COLUMN business_twitter TEXT,
ADD COLUMN business_whatsapp TEXT;
