-- ==============================================================================
-- Migration: Fix QR Access Control, Direct Permissions, and Access Requests
-- ==============================================================================

-- 1. Ensure RLS on qr_permissions allows permitted users to view by email as well as user_id
DROP POLICY IF EXISTS "Owners can view permissions for their QR pages" ON public.qr_permissions;
DROP POLICY IF EXISTS "Owners and permitted users can view permissions" ON public.qr_permissions;
CREATE POLICY "Owners and permitted users can view permissions"
ON public.qr_permissions FOR SELECT
USING (
  user_id = auth.uid()
  OR lower(user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  OR (EXISTS (
    SELECT 1 FROM public.qr_pages
    WHERE qr_pages.id = qr_permissions.qr_page_id
      AND qr_pages.user_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM public.qr_business_pages
    WHERE qr_business_pages.id = qr_permissions.qr_business_page_id
      AND qr_business_pages.user_id = auth.uid()
  ))
);

-- 2. Ensure RLS on qr_access_requests allows owners and requesters to view by email
DROP POLICY IF EXISTS "Owners and requesters can view requests" ON public.qr_access_requests;
CREATE POLICY "Owners and requesters can view requests"
ON public.qr_access_requests FOR SELECT
USING (
  user_id = auth.uid()
  OR lower(user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  OR (EXISTS (
    SELECT 1 FROM public.qr_pages
    WHERE qr_pages.id = qr_access_requests.qr_page_id
      AND qr_pages.user_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM public.qr_business_pages
    WHERE qr_business_pages.id = qr_access_requests.qr_business_page_id
      AND qr_business_pages.user_id = auth.uid()
  ))
);

-- 3. Dedicated RPC: update_qr_access_settings
-- Safely updates public_view and allow_requests for owner
CREATE OR REPLACE FUNCTION public.update_qr_access_settings(
  p_page_id uuid,
  p_is_business boolean,
  p_public_view boolean,
  p_allow_requests boolean,
  p_owner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_effective_id uuid;
BEGIN
  v_effective_id := COALESCE(v_caller_id, p_owner_id);
  IF v_effective_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_is_business THEN
    IF NOT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = p_page_id AND user_id = v_effective_id) THEN
      RAISE EXCEPTION 'Only the QR owner can update access settings';
    END IF;

    UPDATE qr_business_pages
    SET public_view = p_public_view,
        allow_requests = p_allow_requests,
        updated_at = now()
    WHERE id = p_page_id;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM qr_pages WHERE id = p_page_id AND user_id = v_effective_id) THEN
      RAISE EXCEPTION 'Only the QR owner can update access settings';
    END IF;

    UPDATE qr_pages
    SET public_view = p_public_view,
        allow_requests = p_allow_requests
    WHERE id = p_page_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'page_id', p_page_id,
    'public_view', p_public_view,
    'allow_requests', p_allow_requests
  );
END;
$$;

-- 4. Enhanced add_direct_qr_permission with owner fallback & auto-linking
CREATE OR REPLACE FUNCTION public.add_direct_qr_permission(
  p_page_id uuid,
  p_is_business boolean,
  p_email text,
  p_role text,
  p_owner_id uuid DEFAULT NULL
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
  v_caller_id uuid := auth.uid();
  v_effective_owner_id uuid;
BEGIN
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid role: must be viewer or editor';
  END IF;

  v_clean_email := lower(trim(p_email));
  IF v_clean_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;

  v_effective_owner_id := COALESCE(v_caller_id, p_owner_id);
  IF v_effective_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate that effective caller is indeed the owner
  IF p_is_business THEN
    IF NOT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = p_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can grant permissions';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM qr_pages WHERE id = p_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can grant permissions';
    END IF;
  END IF;

  -- Look up target user by email in auth.users
  SELECT id INTO v_target_user_id FROM auth.users WHERE lower(email) = v_clean_email LIMIT 1;

  IF p_is_business THEN
    SELECT id INTO v_existing_id
    FROM qr_permissions
    WHERE qr_business_page_id = p_page_id AND lower(user_email) = v_clean_email;

    IF v_existing_id IS NOT NULL THEN
      UPDATE qr_permissions
      SET role = p_role,
          status = 'active',
          user_id = COALESCE(v_target_user_id, qr_permissions.user_id),
          granted_by = v_effective_owner_id,
          updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO qr_permissions (qr_business_page_id, user_email, user_id, role, status, granted_by, updated_at)
      VALUES (p_page_id, v_clean_email, v_target_user_id, p_role, 'active', v_effective_owner_id, now());
    END IF;
  ELSE
    SELECT id INTO v_existing_id
    FROM qr_permissions
    WHERE qr_page_id = p_page_id AND lower(user_email) = v_clean_email;

    IF v_existing_id IS NOT NULL THEN
      UPDATE qr_permissions
      SET role = p_role,
          status = 'active',
          user_id = COALESCE(v_target_user_id, qr_permissions.user_id),
          granted_by = v_effective_owner_id,
          updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO qr_permissions (qr_page_id, user_email, user_id, role, status, granted_by, updated_at)
      VALUES (p_page_id, v_clean_email, v_target_user_id, p_role, 'active', v_effective_owner_id, now());
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_clean_email,
    'role', p_role,
    'user_id', v_target_user_id
  );
END;
$$;

-- 5. Dedicated RPC for submitting access requests (works for logged-in or guest users)
CREATE OR REPLACE FUNCTION public.submit_qr_access_request(
  p_page_id uuid,
  p_is_business boolean,
  p_email text,
  p_role text,
  p_note text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text;
  v_owner_id uuid;
  v_allow_requests boolean;
  v_is_deleted boolean;
  v_caller_user_id uuid := auth.uid();
  v_effective_user_id uuid;
  v_existing_id uuid;
  v_new_req_id uuid;
BEGIN
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid role requested: must be viewer or editor';
  END IF;

  v_clean_email := lower(trim(p_email));
  IF v_clean_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;

  v_effective_user_id := COALESCE(v_caller_user_id, p_user_id);
  IF v_effective_user_id IS NULL THEN
    SELECT id INTO v_effective_user_id FROM auth.users WHERE lower(email) = v_clean_email LIMIT 1;
  END IF;

  -- Validate target page and check allow_requests
  IF p_is_business THEN
    SELECT user_id, allow_requests, is_deleted
    INTO v_owner_id, v_allow_requests, v_is_deleted
    FROM qr_business_pages
    WHERE id = p_page_id;
  ELSE
    SELECT user_id, allow_requests, is_deleted
    INTO v_owner_id, v_allow_requests, v_is_deleted
    FROM qr_pages
    WHERE id = p_page_id;
  END IF;

  IF v_owner_id IS NULL OR COALESCE(v_is_deleted, false) = true THEN
    RAISE EXCEPTION 'QR page not found or is inactive';
  END IF;

  IF COALESCE(v_allow_requests, false) = false THEN
    RAISE EXCEPTION 'Access requests are currently disabled for this QR page';
  END IF;

  -- Check if already has active permission
  IF p_is_business THEN
    IF EXISTS (
      SELECT 1 FROM qr_permissions
      WHERE qr_business_page_id = p_page_id
        AND lower(user_email) = v_clean_email
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'You already have access to this QR page';
    END IF;

    SELECT id INTO v_existing_id
    FROM qr_access_requests
    WHERE qr_business_page_id = p_page_id
      AND lower(user_email) = v_clean_email
      AND status = 'pending';
  ELSE
    IF EXISTS (
      SELECT 1 FROM qr_permissions
      WHERE qr_page_id = p_page_id
        AND lower(user_email) = v_clean_email
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'You already have access to this QR page';
    END IF;

    SELECT id INTO v_existing_id
    FROM qr_access_requests
    WHERE qr_page_id = p_page_id
      AND lower(user_email) = v_clean_email
      AND status = 'pending';
  END IF;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing pending request
    UPDATE qr_access_requests
    SET requested_role = p_role,
        user_id = COALESCE(v_effective_user_id, qr_access_requests.user_id),
        owner_id = v_owner_id,
        updated_at = now()
    WHERE id = v_existing_id;

    RETURN jsonb_build_object('success', true, 'id', v_existing_id, 'status', 'already_pending');
  END IF;

  -- Insert new request
  IF p_is_business THEN
    INSERT INTO qr_access_requests (
      qr_business_page_id,
      user_email,
      requested_role,
      user_id,
      owner_id,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_page_id,
      v_clean_email,
      p_role,
      v_effective_user_id,
      v_owner_id,
      'pending',
      now(),
      now()
    ) RETURNING id INTO v_new_req_id;
  ELSE
    INSERT INTO qr_access_requests (
      qr_page_id,
      user_email,
      requested_role,
      user_id,
      owner_id,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_page_id,
      v_clean_email,
      p_role,
      v_effective_user_id,
      v_owner_id,
      'pending',
      now(),
      now()
    ) RETURNING id INTO v_new_req_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_new_req_id, 'status', 'pending');
END;
$$;

-- 6. Enhanced approve_qr_access_request with owner fallback
CREATE OR REPLACE FUNCTION public.approve_qr_access_request(
  p_request_id uuid,
  p_role text,
  p_owner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_target_user_id uuid;
  v_caller_id uuid := auth.uid();
  v_effective_owner_id uuid;
BEGIN
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid role: must be viewer or editor';
  END IF;

  SELECT * INTO v_req FROM qr_access_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  v_effective_owner_id := COALESCE(v_caller_id, p_owner_id);
  IF v_effective_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate owner
  IF v_req.qr_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_pages WHERE id = v_req.qr_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can approve requests';
    END IF;
  ELSIF v_req.qr_business_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = v_req.qr_business_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can approve requests';
    END IF;
  END IF;

  -- Update request status
  UPDATE qr_access_requests
  SET status = 'approved',
      requested_role = p_role,
      reviewed_by = v_effective_owner_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  v_target_user_id := v_req.user_id;
  IF v_target_user_id IS NULL THEN
    SELECT id INTO v_target_user_id FROM auth.users WHERE lower(email) = lower(v_req.user_email) LIMIT 1;
  END IF;

  -- Upsert active permission
  IF v_req.qr_page_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM qr_permissions WHERE qr_page_id = v_req.qr_page_id AND lower(user_email) = lower(v_req.user_email)) THEN
      UPDATE qr_permissions
      SET role = p_role,
          status = 'active',
          user_id = COALESCE(v_target_user_id, qr_permissions.user_id),
          granted_by = v_effective_owner_id,
          updated_at = now()
      WHERE qr_page_id = v_req.qr_page_id AND lower(user_email) = lower(v_req.user_email);
    ELSE
      INSERT INTO qr_permissions (qr_page_id, user_email, user_id, role, status, granted_by, updated_at)
      VALUES (v_req.qr_page_id, lower(v_req.user_email), v_target_user_id, p_role, 'active', v_effective_owner_id, now());
    END IF;
  ELSIF v_req.qr_business_page_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM qr_permissions WHERE qr_business_page_id = v_req.qr_business_page_id AND lower(user_email) = lower(v_req.user_email)) THEN
      UPDATE qr_permissions
      SET role = p_role,
          status = 'active',
          user_id = COALESCE(v_target_user_id, qr_permissions.user_id),
          granted_by = v_effective_owner_id,
          updated_at = now()
      WHERE qr_business_page_id = v_req.qr_business_page_id AND lower(user_email) = lower(v_req.user_email);
    ELSE
      INSERT INTO qr_permissions (qr_business_page_id, user_email, user_id, role, status, granted_by, updated_at)
      VALUES (v_req.qr_business_page_id, lower(v_req.user_email), v_target_user_id, p_role, 'active', v_effective_owner_id, now());
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', p_request_id, 'role', p_role);
END;
$$;

-- 7. Enhanced reject_qr_access_request with owner fallback
CREATE OR REPLACE FUNCTION public.reject_qr_access_request(
  p_request_id uuid,
  p_owner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_caller_id uuid := auth.uid();
  v_effective_owner_id uuid;
BEGIN
  SELECT * INTO v_req FROM qr_access_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  v_effective_owner_id := COALESCE(v_caller_id, p_owner_id);
  IF v_effective_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_req.qr_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_pages WHERE id = v_req.qr_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can reject requests';
    END IF;
  ELSIF v_req.qr_business_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = v_req.qr_business_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can reject requests';
    END IF;
  END IF;

  UPDATE qr_access_requests
  SET status = 'rejected',
      reviewed_by = v_effective_owner_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'id', p_request_id);
END;
$$;

-- 8. Enhanced revoke_qr_permission with owner fallback
CREATE OR REPLACE FUNCTION public.revoke_qr_permission(
  p_permission_id uuid,
  p_owner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perm record;
  v_caller_id uuid := auth.uid();
  v_effective_owner_id uuid;
BEGIN
  SELECT * INTO v_perm FROM qr_permissions WHERE id = p_permission_id;
  IF v_perm.id IS NULL THEN
    RAISE EXCEPTION 'Permission not found';
  END IF;

  v_effective_owner_id := COALESCE(v_caller_id, p_owner_id);
  IF v_effective_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_perm.qr_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_pages WHERE id = v_perm.qr_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can revoke permissions';
    END IF;
  ELSIF v_perm.qr_business_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = v_perm.qr_business_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can revoke permissions';
    END IF;
  END IF;

  UPDATE qr_permissions
  SET status = 'revoked',
      updated_at = now()
  WHERE id = p_permission_id;

  RETURN jsonb_build_object('success', true, 'id', p_permission_id);
END;
$$;

-- 9. Update role on existing permission with owner fallback
CREATE OR REPLACE FUNCTION public.update_qr_permission_role(
  p_permission_id uuid,
  p_role text,
  p_owner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perm record;
  v_caller_id uuid := auth.uid();
  v_effective_owner_id uuid;
BEGIN
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid role: must be viewer or editor';
  END IF;

  SELECT * INTO v_perm FROM qr_permissions WHERE id = p_permission_id;
  IF v_perm.id IS NULL THEN
    RAISE EXCEPTION 'Permission not found';
  END IF;

  v_effective_owner_id := COALESCE(v_caller_id, p_owner_id);
  IF v_effective_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_perm.qr_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_pages WHERE id = v_perm.qr_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can change permission roles';
    END IF;
  ELSIF v_perm.qr_business_page_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = v_perm.qr_business_page_id AND user_id = v_effective_owner_id) THEN
      RAISE EXCEPTION 'Only the QR owner can change permission roles';
    END IF;
  END IF;

  UPDATE qr_permissions
  SET role = p_role,
      updated_at = now()
  WHERE id = p_permission_id;

  RETURN jsonb_build_object('success', true, 'id', p_permission_id, 'role', p_role);
END;
$$;

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_qr_access_settings(uuid, boolean, boolean, boolean, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_direct_qr_permission(uuid, boolean, text, text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_qr_access_request(uuid, boolean, text, text, text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_qr_access_request(uuid, text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_qr_access_request(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_qr_permission(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_qr_permission_role(uuid, text, uuid) TO anon, authenticated, service_role;
