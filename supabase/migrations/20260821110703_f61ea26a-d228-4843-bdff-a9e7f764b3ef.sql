
-- 1. qr_pages public visibility must respect public_view
DROP POLICY IF EXISTS "Anyone can view public QR pages" ON public.qr_pages;
CREATE POLICY "Anyone can view public QR pages"
ON public.qr_pages FOR SELECT
USING (
  COALESCE(is_deleted, false) = false
  AND (expires_at IS NULL OR expires_at > now())
  AND COALESCE(public_view, true) = true
);

-- 2. qr_business_pages public visibility must respect public_view
DROP POLICY IF EXISTS "Anyone can view public QR business pages" ON public.qr_business_pages;
CREATE POLICY "Anyone can view public QR business pages"
ON public.qr_business_pages FOR SELECT
USING (
  COALESCE(is_deleted, false) = false
  AND (expires_at IS NULL OR expires_at > now())
  AND COALESCE(public_view, true) = true
);

-- 3. profiles only visible through a page the caller may actually view
DROP POLICY IF EXISTS "Public can view profiles via QR pages" ON public.profiles;
CREATE POLICY "Public can view profiles via viewable QR pages"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.qr_pages q
    WHERE q.user_id = profiles.user_id
      AND (q.expires_at IS NULL OR q.expires_at > now())
      AND public.can_view_qr_page(q.id)
  )
);

-- 4. items only visible through a viewable page
DROP POLICY IF EXISTS "Public can view items via QR pages" ON public.items;
CREATE POLICY "Public can view items via viewable QR pages"
ON public.items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.qr_page_items qpi
    WHERE qpi.item_id = items.id
      AND public.can_view_qr_page(qpi.qr_page_id)
  )
);

-- 5. categories only visible through a viewable page
DROP POLICY IF EXISTS "Public can view categories via QR pages" ON public.categories;
CREATE POLICY "Public can view categories via viewable QR pages"
ON public.categories FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.items i
    JOIN public.qr_page_items qpi ON qpi.item_id = i.id
    WHERE i.category_id = categories.id
      AND public.can_view_qr_page(qpi.qr_page_id)
  )
);

-- 6. Least privilege on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_qr_password(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_qr_password(text, uuid, text) TO authenticated;
