-- 06_rewrite_storage_urls.sql
-- Run in the NEW project AFTER 03_data_public.sql and after the files are copied (05).
-- Rewrites every stored file URL from the old project host to the new one.

DO $$
DECLARE
  old_host_1 text := 'https://kyzazsmsqrqwbjpkqjqm.supabase.co';
  old_host_2 text := 'https://kyzazsmsqrqwbjpkqjqm.lovable.cloud';
  new_host   text := 'https://sizxlgxdawklesbkxmfb.supabase.co';
BEGIN
  UPDATE public.profiles
     SET avatar_url = replace(replace(avatar_url, old_host_1, new_host), old_host_2, new_host)
   WHERE avatar_url IS NOT NULL;

  UPDATE public.business_products
     SET image_url = replace(replace(image_url, old_host_1, new_host), old_host_2, new_host)
   WHERE image_url IS NOT NULL;

  UPDATE public.qr_business_pages
     SET business_logo_url = replace(replace(business_logo_url, old_host_1, new_host), old_host_2, new_host),
         qr_logo_url       = replace(replace(qr_logo_url, old_host_1, new_host), old_host_2, new_host);

  UPDATE public.qr_pages
     SET qr_logo_url = replace(replace(qr_logo_url, old_host_1, new_host), old_host_2, new_host)
   WHERE qr_logo_url IS NOT NULL;

  -- items.content holds uploaded file URLs for pdf/image/video/audio/largefile items
  UPDATE public.items
     SET content = replace(replace(content, old_host_1, new_host), old_host_2, new_host)
   WHERE content LIKE '%supabase%' OR content LIKE '%lovable.cloud%';
END $$;

-- Sanity check: should return 0 rows
SELECT 'items' AS tbl, id, content FROM public.items WHERE content LIKE '%kyzazsmsqrqwbjpkqjqm%'
UNION ALL SELECT 'products', id, image_url FROM public.business_products WHERE image_url LIKE '%kyzazsmsqrqwbjpkqjqm%';
