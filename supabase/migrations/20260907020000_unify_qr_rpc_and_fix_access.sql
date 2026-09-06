-- Migration: Unify QR RPC functions, eliminate PostgREST overloading ambiguity, and add robust access helper RPCs

-- 1. Drop overloaded functions to prevent PostgREST resolution ambiguity
DROP FUNCTION IF EXISTS public.add_direct_qr_permission(uuid, boolean, text, text);
DROP FUNCTION IF EXISTS public.approve_qr_access_request(uuid, text);
DROP FUNCTION IF EXISTS public.reject_qr_access_request(uuid);
DROP FUNCTION IF EXISTS public.revoke_qr_permission(uuid);

-- 2. Ensure get_qr_access_info handles store_slug and proper titles for business pages
CREATE OR REPLACE FUNCTION public.get_qr_access_info(p_identifier text, p_is_business boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
      SELECT id, user_id, COALESCE(business_name, title, 'Business Page') AS title, public_id, public_view, allow_requests, is_deleted
      INTO v_page
      FROM qr_business_pages
      WHERE (id = p_identifier::uuid OR public_id = p_identifier OR store_slug = p_identifier)
        AND COALESCE(is_deleted, false) = false
      LIMIT 1;
    ELSE
      SELECT id, user_id, COALESCE(business_name, title, 'Business Page') AS title, public_id, public_view, allow_requests, is_deleted
      INTO v_page
      FROM qr_business_pages
      WHERE (public_id = p_identifier OR store_slug = p_identifier)
        AND COALESCE(is_deleted, false) = false
      LIMIT 1;
    END IF;
  ELSE
    IF v_is_uuid THEN
      SELECT id, user_id, COALESCE(title, 'QR Page') AS title, public_id, public_view, allow_requests, is_deleted
      INTO v_page
      FROM qr_pages
      WHERE (id = p_identifier::uuid OR public_id = p_identifier)
        AND COALESCE(is_deleted, false) = false
      LIMIT 1;
    ELSE
      SELECT id, user_id, COALESCE(title, 'QR Page') AS title, public_id, public_view, allow_requests, is_deleted
      INTO v_page
      FROM qr_pages
      WHERE public_id = p_identifier
        AND COALESCE(is_deleted, false) = false
      LIMIT 1;
    END IF;
  END IF;

  IF v_page.id IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  -- Get owner display name
  SELECT COALESCE(display_name, full_name, username, 'Owner') INTO v_owner_name
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
        AND (
          (v_caller_id IS NOT NULL AND user_id = v_caller_id)
          OR (v_caller_email <> '' AND lower(user_email) = v_caller_email)
        )
      ORDER BY CASE WHEN role = 'editor' THEN 1 ELSE 2 END
      LIMIT 1;
    ELSE
      SELECT role INTO v_user_role
      FROM qr_permissions
      WHERE qr_page_id = v_page.id
        AND status = 'active'
        AND (
          (v_caller_id IS NOT NULL AND user_id = v_caller_id)
          OR (v_caller_email <> '' AND lower(user_email) = v_caller_email)
        )
      ORDER BY CASE WHEN role = 'editor' THEN 1 ELSE 2 END
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
        AND (
          (v_caller_id IS NOT NULL AND user_id = v_caller_id)
          OR (v_caller_email <> '' AND lower(user_email) = v_caller_email)
        )
      LIMIT 1;
    ELSE
      SELECT true, requested_role INTO v_has_pending_req, v_pending_req_role
      FROM qr_access_requests
      WHERE qr_page_id = v_page.id
        AND status = 'pending'
        AND (
          (v_caller_id IS NOT NULL AND user_id = v_caller_id)
          OR (v_caller_email <> '' AND lower(user_email) = v_caller_email)
        )
      LIMIT 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'id', v_page.id,
    'title', v_page.title,
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

-- 3. Helper RPC to fetch permissions reliably for Manage Access modal
CREATE OR REPLACE FUNCTION public.get_qr_permissions_list(p_page_id uuid, p_is_business boolean, p_owner_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_effective_owner_id uuid := COALESCE(auth.uid(), p_owner_id);
  v_is_owner boolean := false;
  v_perms jsonb;
BEGIN
  IF p_is_business THEN
    SELECT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = p_page_id AND user_id = v_effective_owner_id) INTO v_is_owner;
  ELSE
    SELECT EXISTS (SELECT 1 FROM qr_pages WHERE id = p_page_id AND user_id = v_effective_owner_id) INTO v_is_owner;
  END IF;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the QR owner can view full permissions list';
  END IF;

  IF p_is_business THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'user_email', p.user_email,
        'user_id', p.user_id,
        'role', p.role,
        'status', p.status,
        'created_at', p.created_at,
        'display_name', pr.display_name
      ) ORDER BY p.created_at DESC
    )
    INTO v_perms
    FROM qr_permissions p
    LEFT JOIN profiles pr ON pr.user_id = p.user_id
    WHERE p.qr_business_page_id = p_page_id AND p.status = 'active';
  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'user_email', p.user_email,
        'user_id', p.user_id,
        'role', p.role,
        'status', p.status,
        'created_at', p.created_at,
        'display_name', pr.display_name
      ) ORDER BY p.created_at DESC
    )
    INTO v_perms
    FROM qr_permissions p
    LEFT JOIN profiles pr ON pr.user_id = p.user_id
    WHERE p.qr_page_id = p_page_id AND p.status = 'active';
  END IF;

  RETURN COALESCE(v_perms, '[]'::jsonb);
END;
$$;

-- 4. Helper RPC to fetch pending requests reliably for Manage Access modal
CREATE OR REPLACE FUNCTION public.get_qr_access_requests_list(p_page_id uuid, p_is_business boolean, p_owner_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_effective_owner_id uuid := COALESCE(auth.uid(), p_owner_id);
  v_is_owner boolean := false;
  v_reqs jsonb;
BEGIN
  IF p_is_business THEN
    SELECT EXISTS (SELECT 1 FROM qr_business_pages WHERE id = p_page_id AND user_id = v_effective_owner_id) INTO v_is_owner;
  ELSE
    SELECT EXISTS (SELECT 1 FROM qr_pages WHERE id = p_page_id AND user_id = v_effective_owner_id) INTO v_is_owner;
  END IF;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the QR owner can view access requests';
  END IF;

  IF p_is_business THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'user_email', r.user_email,
        'user_id', r.user_id,
        'requested_role', r.requested_role,
        'note', r.note,
        'status', r.status,
        'created_at', r.created_at,
        'requester_name', pr.display_name
      ) ORDER BY r.created_at DESC
    )
    INTO v_reqs
    FROM qr_access_requests r
    LEFT JOIN profiles pr ON pr.user_id = r.user_id
    WHERE r.qr_business_page_id = p_page_id AND r.status = 'pending';
  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'user_email', r.user_email,
        'user_id', r.user_id,
        'requested_role', r.requested_role,
        'note', r.note,
        'status', r.status,
        'created_at', r.created_at,
        'requester_name', pr.display_name
      ) ORDER BY r.created_at DESC
    )
    INTO v_reqs
    FROM qr_access_requests r
    LEFT JOIN profiles pr ON pr.user_id = r.user_id
    WHERE r.qr_page_id = p_page_id AND r.status = 'pending';
  END IF;

  RETURN COALESCE(v_reqs, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_qr_access_info(text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_qr_permissions_list(uuid, boolean, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_qr_access_requests_list(uuid, boolean, uuid) TO anon, authenticated;
