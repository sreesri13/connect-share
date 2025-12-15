-- Add policy to allow public access to items via qr_page_items
CREATE POLICY "Public can view items via QR pages"
ON public.items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.qr_page_items
    WHERE qr_page_items.item_id = items.id
  )
);

-- Add policy to allow public access to categories for items via QR pages
CREATE POLICY "Public can view categories via QR pages"
ON public.categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.items
    JOIN public.qr_page_items ON qr_page_items.item_id = items.id
    WHERE items.category_id = categories.id
  )
);

-- Add policy to allow public access to profiles via QR pages
CREATE POLICY "Public can view profiles via QR pages"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.qr_pages
    WHERE qr_pages.user_id = profiles.user_id
  )
);