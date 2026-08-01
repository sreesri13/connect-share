
-- ============ password handling: server-side bcrypt ============
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

DROP FUNCTION IF EXISTS public.hash_qr_password(text);

CREATE OR REPLACE FUNCTION public.set_qr_password(p_page_type text, p_page_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_rows int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_page_type NOT IN ('profile','business') THEN
    RAISE EXCEPTION 'Invalid page type';
  END IF;

  IF p_password IS NULL OR length(trim(p_password)) = 0 THEN
    v_hash := NULL;
  ELSIF length(p_password) > 200 THEN
    RAISE EXCEPTION 'Password too long';
  ELSE
    v_hash := crypt(p_password, gen_salt('bf', 10));
  END IF;

  IF p_page_type = 'profile' THEN
    UPDATE qr_pages SET password_hash = v_hash
      WHERE id = p_page_id AND user_id = auth.uid();
  ELSE
    UPDATE qr_business_pages SET password_hash = v_hash
      WHERE id = p_page_id AND user_id = auth.uid();
  END IF;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Page not found or not owned by user';
  END IF;
  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.verify_qr_password(text, text);

CREATE OR REPLACE FUNCTION public.verify_qr_password(qr_public_id text, password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
  found boolean := false;
BEGIN
  IF qr_public_id IS NULL OR length(qr_public_id) > 100 THEN
    RETURN false;
  END IF;

  SELECT p.password_hash, true INTO stored_hash, found
  FROM qr_pages p WHERE p.public_id = qr_public_id LIMIT 1;

  IF NOT found THEN
    SELECT b.password_hash, true INTO stored_hash, found
    FROM qr_business_pages b WHERE b.public_id = qr_public_id LIMIT 1;
  END IF;

  IF NOT found THEN
    RETURN false;
  END IF;

  IF stored_hash IS NULL THEN
    RETURN true;
  END IF;

  IF password IS NULL OR length(password) = 0 OR length(password) > 200 THEN
    RETURN false;
  END IF;

  -- bcrypt hashes
  IF stored_hash LIKE '$2%' THEN
    RETURN stored_hash = crypt(password, stored_hash);
  END IF;

  -- legacy client-side sha256 hex hashes
  RETURN stored_hash = encode(digest(password, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public.set_qr_password(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_qr_password(text, uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.verify_qr_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_qr_password(text, text) TO anon, authenticated, service_role;

-- ============ upi_payments: no public browsing ============
DROP POLICY IF EXISTS "Anyone can resolve UPI by public code" ON public.upi_payments;

CREATE OR REPLACE FUNCTION public.resolve_upi_by_code(p_code text)
RETURNS TABLE (upi_id text, display_name text, amount numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.upi_id, u.display_name, u.amount
  FROM upi_payments u
  WHERE p_code IS NOT NULL
    AND length(p_code) BETWEEN 1 AND 100
    AND u.public_code = p_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_upi_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_upi_by_code(text) TO anon, authenticated, service_role;

-- ============ helper: is a QR page publicly viewable by the caller ============
CREATE OR REPLACE FUNCTION public.can_view_qr_page(p_page_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM qr_pages q
    WHERE q.id = p_page_id
      AND COALESCE(q.is_deleted, false) = false
      AND (
        COALESCE(q.public_view, true) = true
        OR q.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM qr_permissions pm
          WHERE pm.qr_page_id = q.id
            AND pm.status = 'active'
            AND lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_qr_business_page(p_page_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM qr_business_pages q
    WHERE q.id = p_page_id
      AND COALESCE(q.is_deleted, false) = false
      AND (
        COALESCE(q.public_view, true) = true
        OR q.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM qr_permissions pm
          WHERE pm.qr_business_page_id = q.id
            AND pm.status = 'active'
            AND lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_qr_page(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_qr_business_page(uuid) TO anon, authenticated, service_role;

-- ============ link tables: scope reads to viewable pages ============
DROP POLICY IF EXISTS "Anyone can view QR page items" ON public.qr_page_items;
CREATE POLICY "Viewable QR page items"
ON public.qr_page_items FOR SELECT
USING (public.can_view_qr_page(qr_page_id));

DROP POLICY IF EXISTS "Anyone can view QR business page products" ON public.qr_business_page_products;
CREATE POLICY "Viewable QR business page products"
ON public.qr_business_page_products FOR SELECT
USING (public.can_view_qr_business_page(qr_page_id));

-- ============ business_products / categories: scope to viewable pages ============
DROP POLICY IF EXISTS "Public can view active products via QR pages" ON public.business_products;
CREATE POLICY "Public can view active products via viewable QR pages"
ON public.business_products FOR SELECT
USING (
  status = 'active'::product_status
  AND EXISTS (
    SELECT 1 FROM qr_business_page_products qbpp
    WHERE qbpp.product_id = business_products.id
      AND public.can_view_qr_business_page(qbpp.qr_page_id)
  )
);

DROP POLICY IF EXISTS "Public can view categories via QR pages" ON public.business_categories;
CREATE POLICY "Public can view categories via viewable QR pages"
ON public.business_categories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_products bp
    JOIN qr_business_page_products qbpp ON qbpp.product_id = bp.id
    WHERE bp.category_id = business_categories.id
      AND public.can_view_qr_business_page(qbpp.qr_page_id)
  )
);

-- ============ always-true write policies ============
DROP POLICY IF EXISTS "Anyone can record scans" ON public.qr_scans;
CREATE POLICY "Scans can be recorded for existing pages"
ON public.qr_scans FOR INSERT
WITH CHECK (
  (
    (qr_page_id IS NOT NULL AND qr_business_page_id IS NULL
      AND EXISTS (SELECT 1 FROM qr_pages q WHERE q.id = qr_page_id AND COALESCE(q.is_deleted,false) = false))
    OR
    (qr_business_page_id IS NOT NULL AND qr_page_id IS NULL
      AND EXISTS (SELECT 1 FROM qr_business_pages b WHERE b.id = qr_business_page_id AND COALESCE(b.is_deleted,false) = false))
  )
);

DROP POLICY IF EXISTS "Anyone can create access requests" ON public.qr_access_requests;
CREATE POLICY "Requests allowed for pages that accept them"
ON public.qr_access_requests FOR INSERT
WITH CHECK (
  status = 'pending'
  AND requested_role IN ('viewer','editor')
  AND length(user_email) BETWEEN 3 AND 320
  AND (
    auth.uid() IS NULL
    OR lower(user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  AND (
    (qr_page_id IS NOT NULL AND qr_business_page_id IS NULL AND EXISTS (
      SELECT 1 FROM qr_pages q
      WHERE q.id = qr_page_id AND COALESCE(q.is_deleted,false) = false AND q.allow_requests = true))
    OR
    (qr_business_page_id IS NOT NULL AND qr_page_id IS NULL AND EXISTS (
      SELECT 1 FROM qr_business_pages b
      WHERE b.id = qr_business_page_id AND COALESCE(b.is_deleted,false) = false AND b.allow_requests = true))
  )
);
