-- ==============================================================================
-- Migration: Complete QR Access Control System
-- ==============================================================================

-- 1. Update check constraints on qr_permissions and qr_access_requests
ALTER TABLE public.qr_permissions 
  DROP CONSTRAINT IF EXISTS qr_permissions_status_check;

ALTER TABLE public.qr_permissions 
  ADD CONSTRAINT qr_permissions_status_check 
  CHECK (status IN ('active', 'pending', 'revoked'));

ALTER TABLE public.qr_permissions 
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.qr_access_requests 
  DROP CONSTRAINT IF EXISTS qr_access_requests_status_check;

ALTER TABLE public.qr_access_requests 
  ADD CONSTRAINT qr_access_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'revoked'));

ALTER TABLE public.qr_access_requests 
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_qr_permissions_qr_page_id ON public.qr_permissions(qr_page_id);
CREATE INDEX IF NOT EXISTS idx_qr_permissions_qr_biz_page_id ON public.qr_permissions(qr_business_page_id);
CREATE INDEX IF NOT EXISTS idx_qr_permissions_user_email ON public.qr_permissions(lower(user_email));
CREATE INDEX IF NOT EXISTS idx_qr_permissions_user_id ON public.qr_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_permissions_status ON public.qr_permissions(status);

CREATE INDEX IF NOT EXISTS idx_qr_access_requests_qr_page_id ON public.qr_access_requests(qr_page_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_requests_qr_biz_page_id ON public.qr_access_requests(qr_business_page_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_requests_user_email ON public.qr_access_requests(lower(user_email));
CREATE INDEX IF NOT EXISTS idx_qr_access_requests_owner_id ON public.qr_access_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_requests_status ON public.qr_access_requests(status);

-- 3. Ownership and permission verification helper functions
CREATE OR REPLACE FUNCTION public.is_qr_owner(p_page_id uuid, p_is_business boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN p_is_business THEN
    EXISTS (SELECT 1 FROM qr_business_pages WHERE id = p_page_id AND user_id = auth.uid())
  ELSE
    EXISTS (SELECT 1 FROM qr_pages WHERE id = p_page_id AND user_id = auth.uid())
  END;
$$;

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
            AND (
              pm.user_id = auth.uid() 
              OR lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_qr_page(p_page_id uuid)
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
        q.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM qr_permissions pm
          WHERE pm.qr_page_id = q.id
            AND pm.status = 'active'
            AND pm.role = 'editor'
            AND (
              pm.user_id = auth.uid() 
              OR lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
            )
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
            AND (
              pm.user_id = auth.uid() 
              OR lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_qr_business_page(p_page_id uuid)
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
        q.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM qr_permissions pm
          WHERE pm.qr_business_page_id = q.id
            AND pm.status = 'active'
            AND pm.role = 'editor'
            AND (
              pm.user_id = auth.uid() 
              OR lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
            )
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_qr_owner(uuid, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_qr_page(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_qr_page(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_qr_business_page(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_qr_business_page(uuid) TO anon, authenticated, service_role;

-- 4. Secure function to get public access info without leaking private contents
CREATE OR REPLACE FUNCTION public.get_qr_access_info(p_identifier text, p_is_business boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page record;
  v_owner_name text := 'Owner';
  v_user_role text := NULL;
  v_caller_email text;
  v_caller_id uuid := auth.uid();
  v_has_pending_req boolean := false;
  v_pending_req_role text := NULL;
  v_is_uuid boolean;
BEGIN
  v_caller_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_is_uuid := p_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF p_is_business THEN
    IF v_is_uuid THEN
      SELECT id, user_id, business_name AS title, public_id, public_view, allow_requests, is_deleted
      INTO v_page
      FROM qr_business_pages
      WHERE (id = p_identifier::uuid OR public_id = p_identifier) AND COALESCE(is_deleted, false) = false
      LIMIT 1;
    ELSE
      SELECT id, user_id, business_name AS title, public_id, public_view, allow_requests, is_deleted
      INTO v_page
      FROM qr_business_pages
      WHERE public_id = p_identifier AND COALESCE(is_deleted, false) = false
      LIMIT 1;
    END IF;
  ELSE
    IF v_is_uuid THEN
      SELECT id, user_id, title, public_id, public_view, allow_requests, is_deleted
      INTO v_page
      FROM qr_pages
      WHERE (id = p_identifier::uuid OR public_id = p_identifier) AND COALESCE(is_deleted, false) = false
      LIMIT 1;
    ELSE
      SELECT id, user_id, title, public_id, public_view, allow_requests, is_deleted
      INTO v_page
      FROM qr_pages
      WHERE public_id = p_identifier AND COALESCE(is_deleted, false) = false
      LIMIT 1;
    END IF;
  END IF;

  IF v_page.id IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  -- Get owner display name
  SELECT COALESCE(display_name, 'Owner') INTO v_owner_name
  FROM profiles
  WHERE user_id = v_page.user_id;

  -- Determine user role
  IF v_caller_id IS NOT NULL AND v_caller_id = v_page.user_id THEN
    v_user_role := 'owner';
  ELSIF v_caller_id IS NOT NULL OR v_caller_email <> '' THEN
    IF p_is_business THEN
      SELECT role INTO v_user_role
      FROM qr_permissions
      WHERE qr_business_page_id = v_page.id
        AND status = 'active'
        AND (user_id = v_caller_id OR lower(user_email) = v_caller_email)
      LIMIT 1;
    ELSE
      SELECT role INTO v_user_role
      FROM qr_permissions
      WHERE qr_page_id = v_page.id
        AND status = 'active'
        AND (user_id = v_caller_id OR lower(user_email) = v_caller_email)
      LIMIT 1;
    END IF;
  END IF;

  -- Check for existing pending request
  IF v_user_role IS NULL AND (v_caller_id IS NOT NULL OR v_caller_email <> '') THEN
    IF p_is_business THEN
      SELECT true, requested_role INTO v_has_pending_req, v_pending_req_role
      FROM qr_access_requests
      WHERE qr_business_page_id = v_page.id
        AND status = 'pending'
        AND (user_id = v_caller_id OR lower(user_email) = v_caller_email)
      LIMIT 1;
    ELSE
      SELECT true, requested_role INTO v_has_pending_req, v_pending_req_role
      FROM qr_access_requests
      WHERE qr_page_id = v_page.id
        AND status = 'pending'
        AND (user_id = v_caller_id OR lower(user_email) = v_caller_email)
      LIMIT 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'id', v_page.id,
    'title', COALESCE(v_page.title, 'Untitled QR'),
    'public_id', v_page.public_id,
    'owner_id', v_page.user_id,
    'owner_name', COALESCE(v_owner_name, 'Owner'),
    'public_view', COALESCE(v_page.public_view, true),
    'allow_requests', COALESCE(v_page.allow_requests, false),
    'user_role', v_user_role,
    'has_pending_request', COALESCE(v_has_pending_req, false),
    'pending_request_role', v_pending_req_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_qr_access_info(text, boolean) TO anon, authenticated, service_role;

-- 5. Atomic RPC: Approve Request as Viewer or Editor
CREATE OR REPLACE FUNCTION public.approve_qr_access_request(p_request_id uuid, p_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_target_user_id uuid;
BEGIN
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid role: must be viewer or editor';
  END IF;

  SELECT * INTO v_req FROM qr_access_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Validate caller is owner
  IF v_req.qr_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_pages WHERE id = v_req.qr_page_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Only the QR owner can approve requests';
    END IF;
  ELSIF v_req.qr_business_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = v_req.qr_business_page_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Only the QR owner can approve requests';
    END IF;
  END IF;

  -- Update request status
  UPDATE qr_access_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  -- Find user_id from auth.users or profiles if user_email is known
  v_target_user_id := v_req.user_id;
  IF v_target_user_id IS NULL THEN
    SELECT id INTO v_target_user_id FROM auth.users WHERE lower(email) = lower(v_req.user_email) LIMIT 1;
  END IF;

  -- Upsert active permission
  IF v_req.qr_page_id IS NOT NULL THEN
    -- If there's an existing record for this qr + email, update it
    IF EXISTS (
      SELECT 1 FROM qr_permissions 
      WHERE qr_page_id = v_req.qr_page_id AND lower(user_email) = lower(v_req.user_email)
    ) THEN
      UPDATE qr_permissions
      SET role = p_role,
          status = 'active',
          user_id = COALESCE(qr_permissions.user_id, v_target_user_id),
          granted_by = auth.uid(),
          updated_at = now()
      WHERE qr_page_id = v_req.qr_page_id
        AND lower(user_email) = lower(v_req.user_email);
    ELSE
      INSERT INTO qr_permissions (qr_page_id, user_email, user_id, role, status, granted_by, updated_at)
      VALUES (v_req.qr_page_id, lower(v_req.user_email), v_target_user_id, p_role, 'active', auth.uid(), now());
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM qr_permissions 
      WHERE qr_business_page_id = v_req.qr_business_page_id AND lower(user_email) = lower(v_req.user_email)
    ) THEN
      UPDATE qr_permissions
      SET role = p_role,
          status = 'active',
          user_id = COALESCE(qr_permissions.user_id, v_target_user_id),
          granted_by = auth.uid(),
          updated_at = now()
      WHERE qr_business_page_id = v_req.qr_business_page_id
        AND lower(user_email) = lower(v_req.user_email);
    ELSE
      INSERT INTO qr_permissions (qr_business_page_id, user_email, user_id, role, status, granted_by, updated_at)
      VALUES (v_req.qr_business_page_id, lower(v_req.user_email), v_target_user_id, p_role, 'active', auth.uid(), now());
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'role', p_role, 'email', v_req.user_email);
END;
$$;

-- 6. Atomic RPC: Reject Request
CREATE OR REPLACE FUNCTION public.reject_qr_access_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
BEGIN
  SELECT * INTO v_req FROM qr_access_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_req.qr_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_pages WHERE id = v_req.qr_page_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Only the QR owner can reject requests';
    END IF;
  ELSIF v_req.qr_business_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = v_req.qr_business_page_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Only the QR owner can reject requests';
    END IF;
  END IF;

  UPDATE qr_access_requests
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'id', p_request_id);
END;
$$;

-- 7. Atomic RPC: Direct Add Permission
CREATE OR REPLACE FUNCTION public.add_direct_qr_permission(
  p_page_id uuid,
  p_is_business boolean,
  p_email text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text;
  v_target_user_id uuid;
  v_existing_id uuid;
BEGIN
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid role: must be viewer or editor';
  END IF;

  v_clean_email := lower(trim(p_email));
  IF v_clean_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;

  -- Validate owner
  IF NOT public.is_qr_owner(p_page_id, p_is_business) THEN
    RAISE EXCEPTION 'Only the QR owner can grant permissions';
  END IF;

  SELECT id INTO v_target_user_id FROM auth.users WHERE lower(email) = v_clean_email LIMIT 1;

  IF p_is_business THEN
    SELECT id INTO v_existing_id
    FROM qr_permissions
    WHERE qr_business_page_id = p_page_id AND lower(user_email) = v_clean_email;

    IF v_existing_id IS NOT NULL THEN
      UPDATE qr_permissions
      SET role = p_role,
          status = 'active',
          user_id = COALESCE(qr_permissions.user_id, v_target_user_id),
          granted_by = auth.uid(),
          updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO qr_permissions (qr_business_page_id, user_email, user_id, role, status, granted_by, updated_at)
      VALUES (p_page_id, v_clean_email, v_target_user_id, p_role, 'active', auth.uid(), now());
    END IF;
  ELSE
    SELECT id INTO v_existing_id
    FROM qr_permissions
    WHERE qr_page_id = p_page_id AND lower(user_email) = v_clean_email;

    IF v_existing_id IS NOT NULL THEN
      UPDATE qr_permissions
      SET role = p_role,
          status = 'active',
          user_id = COALESCE(qr_permissions.user_id, v_target_user_id),
          granted_by = auth.uid(),
          updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO qr_permissions (qr_page_id, user_email, user_id, role, status, granted_by, updated_at)
      VALUES (p_page_id, v_clean_email, v_target_user_id, p_role, 'active', auth.uid(), now());
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'email', v_clean_email, 'role', p_role);
END;
$$;

-- 8. Atomic RPC: Revoke Permission
CREATE OR REPLACE FUNCTION public.revoke_qr_permission(p_permission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perm record;
BEGIN
  SELECT * INTO v_perm FROM qr_permissions WHERE id = p_permission_id;
  IF v_perm.id IS NULL THEN
    RAISE EXCEPTION 'Permission record not found';
  END IF;

  IF v_perm.qr_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_pages WHERE id = v_perm.qr_page_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Only the QR owner can revoke permissions';
    END IF;
  ELSIF v_perm.qr_business_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = v_perm.qr_business_page_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Only the QR owner can revoke permissions';
    END IF;
  END IF;

  DELETE FROM qr_permissions WHERE id = p_permission_id;

  RETURN jsonb_build_object('success', true, 'id', p_permission_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_qr_access_request(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_qr_access_request(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_direct_qr_permission(uuid, boolean, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_qr_permission(uuid) TO authenticated, service_role;

-- 9. Comprehensive RLS Policies for qr_pages and qr_business_pages
DROP POLICY IF EXISTS "Anyone can view public QR pages" ON public.qr_pages;
DROP POLICY IF EXISTS "Users can view their own QR pages" ON public.qr_pages;
DROP POLICY IF EXISTS "Viewable QR pages" ON public.qr_pages;

CREATE POLICY "Viewable QR pages"
ON public.qr_pages FOR SELECT
USING (
  COALESCE(is_deleted, false) = false
  AND (
    COALESCE(public_view, true) = true
    OR user_id = auth.uid()
    OR allow_requests = true
    OR EXISTS (
      SELECT 1 FROM qr_permissions pm
      WHERE pm.qr_page_id = qr_pages.id
        AND pm.status = 'active'
        AND (
          pm.user_id = auth.uid() 
          OR lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own QR pages" ON public.qr_pages;
DROP POLICY IF EXISTS "Owners and editors can update QR pages" ON public.qr_pages;
CREATE POLICY "Owners and editors can update QR pages"
ON public.qr_pages FOR UPDATE
USING (public.can_edit_qr_page(id))
WITH CHECK (public.can_edit_qr_page(id));

DROP POLICY IF EXISTS "Anyone can view public QR business pages" ON public.qr_business_pages;
DROP POLICY IF EXISTS "Users can view their own QR business pages" ON public.qr_business_pages;
DROP POLICY IF EXISTS "Viewable QR business pages" ON public.qr_business_pages;

CREATE POLICY "Viewable QR business pages"
ON public.qr_business_pages FOR SELECT
USING (
  COALESCE(is_deleted, false) = false
  AND (
    COALESCE(public_view, true) = true
    OR user_id = auth.uid()
    OR allow_requests = true
    OR EXISTS (
      SELECT 1 FROM qr_permissions pm
      WHERE pm.qr_business_page_id = qr_business_pages.id
        AND pm.status = 'active'
        AND (
          pm.user_id = auth.uid() 
          OR lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own QR business pages" ON public.qr_business_pages;
DROP POLICY IF EXISTS "Owners and editors can update QR business pages" ON public.qr_business_pages;
CREATE POLICY "Owners and editors can update QR business pages"
ON public.qr_business_pages FOR UPDATE
USING (public.can_edit_qr_business_page(id))
WITH CHECK (public.can_edit_qr_business_page(id));

-- 10. Items and Link Table RLS Policies
DROP POLICY IF EXISTS "Users can manage their QR page items" ON public.qr_page_items;
DROP POLICY IF EXISTS "Users can update their QR page items" ON public.qr_page_items;
DROP POLICY IF EXISTS "Users can delete their QR page items" ON public.qr_page_items;
DROP POLICY IF EXISTS "Owners and editors can insert QR page items" ON public.qr_page_items;
DROP POLICY IF EXISTS "Owners and editors can update QR page items" ON public.qr_page_items;
DROP POLICY IF EXISTS "Owners and editors can delete QR page items" ON public.qr_page_items;

CREATE POLICY "Owners and editors can insert QR page items"
ON public.qr_page_items FOR INSERT
WITH CHECK (public.can_edit_qr_page(qr_page_id));

CREATE POLICY "Owners and editors can update QR page items"
ON public.qr_page_items FOR UPDATE
USING (public.can_edit_qr_page(qr_page_id));

CREATE POLICY "Owners and editors can delete QR page items"
ON public.qr_page_items FOR DELETE
USING (public.can_edit_qr_page(qr_page_id));

-- Products and Business Link Table RLS Policies
DROP POLICY IF EXISTS "Users can manage their QR business page products" ON public.qr_business_page_products;
DROP POLICY IF EXISTS "Users can update their QR business page products" ON public.qr_business_page_products;
DROP POLICY IF EXISTS "Users can delete their QR business page products" ON public.qr_business_page_products;
DROP POLICY IF EXISTS "Owners and editors can insert QR business products" ON public.qr_business_page_products;
DROP POLICY IF EXISTS "Owners and editors can update QR business products" ON public.qr_business_page_products;
DROP POLICY IF EXISTS "Owners and editors can delete QR business products" ON public.qr_business_page_products;

CREATE POLICY "Owners and editors can insert QR business products"
ON public.qr_business_page_products FOR INSERT
WITH CHECK (public.can_edit_qr_business_page(qr_page_id));

CREATE POLICY "Owners and editors can update QR business products"
ON public.qr_business_page_products FOR UPDATE
USING (public.can_edit_qr_business_page(qr_page_id));

CREATE POLICY "Owners and editors can delete QR business products"
ON public.qr_business_page_products FOR DELETE
USING (public.can_edit_qr_business_page(qr_page_id));

-- Items table: allow editors of associated pages to update/delete items
DROP POLICY IF EXISTS "Users can update their own items" ON public.items;
DROP POLICY IF EXISTS "Owners and editors can update items" ON public.items;
CREATE POLICY "Owners and editors can update items"
ON public.items FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM qr_page_items qpi
    WHERE qpi.item_id = items.id AND public.can_edit_qr_page(qpi.qr_page_id)
  )
);

DROP POLICY IF EXISTS "Users can delete their own items" ON public.items;
DROP POLICY IF EXISTS "Owners and editors can delete items" ON public.items;
CREATE POLICY "Owners and editors can delete items"
ON public.items FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM qr_page_items qpi
    WHERE qpi.item_id = items.id AND public.can_edit_qr_page(qpi.qr_page_id)
  )
);

-- Business products: allow editors of associated pages to update/delete products
DROP POLICY IF EXISTS "Users can update their own business products" ON public.business_products;
DROP POLICY IF EXISTS "Owners and editors can update business products" ON public.business_products;
CREATE POLICY "Owners and editors can update business products"
ON public.business_products FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM qr_business_page_products bpp
    WHERE bpp.product_id = business_products.id AND public.can_edit_qr_business_page(bpp.qr_page_id)
  )
);

DROP POLICY IF EXISTS "Users can delete their own business products" ON public.business_products;
DROP POLICY IF EXISTS "Owners and editors can delete business products" ON public.business_products;
CREATE POLICY "Owners and editors can delete business products"
ON public.business_products FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM qr_business_page_products bpp
    WHERE bpp.product_id = business_products.id AND public.can_edit_qr_business_page(bpp.qr_page_id)
  )
);

-- 11. Add tables to Supabase Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'qr_pages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_pages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'qr_business_pages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_business_pages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'qr_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_permissions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'qr_access_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_access_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'qr_page_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_page_items;
  END IF;
END;
$$;
