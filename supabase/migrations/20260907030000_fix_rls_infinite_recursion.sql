-- ==============================================================================
-- Migration: 20260907030000_fix_rls_infinite_recursion.sql
-- Description: Break RLS infinite recursion between qr_pages, qr_business_pages, 
--              qr_permissions, qr_scans, and qr_access_requests
-- ==============================================================================

-- 1. Helper function: is_qr_owner (SECURITY DEFINER with search_path to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_qr_owner(p_page_id uuid, p_is_business boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN p_is_business THEN
    EXISTS (SELECT 1 FROM public.qr_business_pages WHERE id = p_page_id AND user_id = auth.uid())
  ELSE
    EXISTS (SELECT 1 FROM public.qr_pages WHERE id = p_page_id AND user_id = auth.uid())
  END;
$$;

-- 2. Helper function: has_active_qr_permission (SECURITY DEFINER with search_path to bypass RLS on qr_permissions)
CREATE OR REPLACE FUNCTION public.has_active_qr_permission(p_page_id uuid, p_is_business boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN p_is_business THEN
    EXISTS (
      SELECT 1 FROM public.qr_permissions pm
      WHERE pm.qr_business_page_id = p_page_id
        AND pm.status = 'active'
        AND (
          pm.user_id = auth.uid()
          OR lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
    )
  ELSE
    EXISTS (
      SELECT 1 FROM public.qr_permissions pm
      WHERE pm.qr_page_id = p_page_id
        AND pm.status = 'active'
        AND (
          pm.user_id = auth.uid()
          OR lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
    )
  END;
$$;

-- 3. Fix qr_permissions RLS policies (use is_qr_owner to avoid evaluating qr_pages/qr_business_pages RLS)
DROP POLICY IF EXISTS "Owners and permitted users can view permissions" ON public.qr_permissions;
CREATE POLICY "Owners and permitted users can view permissions"
ON public.qr_permissions FOR SELECT
USING (
  user_id = auth.uid()
  OR lower(user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  OR (qr_page_id IS NOT NULL AND public.is_qr_owner(qr_page_id, false))
  OR (qr_business_page_id IS NOT NULL AND public.is_qr_owner(qr_business_page_id, true))
);

DROP POLICY IF EXISTS "Owners can insert permissions" ON public.qr_permissions;
CREATE POLICY "Owners can insert permissions"
ON public.qr_permissions FOR INSERT
WITH CHECK (
  (qr_page_id IS NOT NULL AND public.is_qr_owner(qr_page_id, false))
  OR (qr_business_page_id IS NOT NULL AND public.is_qr_owner(qr_business_page_id, true))
);

DROP POLICY IF EXISTS "Owners can update permissions" ON public.qr_permissions;
CREATE POLICY "Owners can update permissions"
ON public.qr_permissions FOR UPDATE
USING (
  (qr_page_id IS NOT NULL AND public.is_qr_owner(qr_page_id, false))
  OR (qr_business_page_id IS NOT NULL AND public.is_qr_owner(qr_business_page_id, true))
);

DROP POLICY IF EXISTS "Owners can delete permissions" ON public.qr_permissions;
CREATE POLICY "Owners can delete permissions"
ON public.qr_permissions FOR DELETE
USING (
  (qr_page_id IS NOT NULL AND public.is_qr_owner(qr_page_id, false))
  OR (qr_business_page_id IS NOT NULL AND public.is_qr_owner(qr_business_page_id, true))
);

-- 4. Fix qr_pages SELECT policy (use has_active_qr_permission to avoid evaluating qr_permissions RLS)
DROP POLICY IF EXISTS "Viewable QR pages" ON public.qr_pages;
CREATE POLICY "Viewable QR pages"
ON public.qr_pages FOR SELECT
USING (
  COALESCE(is_deleted, false) = false
  AND (
    user_id = auth.uid()
    OR COALESCE(public_view, true) = true
    OR allow_requests = true
    OR public.has_active_qr_permission(id, false)
  )
);

-- 5. Fix qr_business_pages SELECT policy (use has_active_qr_permission to avoid evaluating qr_permissions RLS)
DROP POLICY IF EXISTS "Viewable QR business pages" ON public.qr_business_pages;
CREATE POLICY "Viewable QR business pages"
ON public.qr_business_pages FOR SELECT
USING (
  COALESCE(is_deleted, false) = false
  AND (
    user_id = auth.uid()
    OR COALESCE(public_view, true) = true
    OR allow_requests = true
    OR public.has_active_qr_permission(id, true)
  )
);

-- 6. Fix qr_scans SELECT policies (use is_qr_owner)
DROP POLICY IF EXISTS "Users can view their own QR scans via profile pages" ON public.qr_scans;
CREATE POLICY "Users can view their own QR scans via profile pages"
ON public.qr_scans FOR SELECT
USING (
  qr_page_id IS NOT NULL AND public.is_qr_owner(qr_page_id, false)
);

DROP POLICY IF EXISTS "Users can view their own QR scans via business pages" ON public.qr_scans;
CREATE POLICY "Users can view their own QR scans via business pages"
ON public.qr_scans FOR SELECT
USING (
  qr_business_page_id IS NOT NULL AND public.is_qr_owner(qr_business_page_id, true)
);

-- 7. Fix qr_access_requests policies (use is_qr_owner)
DROP POLICY IF EXISTS "Owners and requesters can view requests" ON public.qr_access_requests;
CREATE POLICY "Owners and requesters can view requests"
ON public.qr_access_requests FOR SELECT
USING (
  user_id = auth.uid()
  OR lower(user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  OR (qr_page_id IS NOT NULL AND public.is_qr_owner(qr_page_id, false))
  OR (qr_business_page_id IS NOT NULL AND public.is_qr_owner(qr_business_page_id, true))
);

DROP POLICY IF EXISTS "Owners can update access requests" ON public.qr_access_requests;
CREATE POLICY "Owners can update access requests"
ON public.qr_access_requests FOR UPDATE
USING (
  (qr_page_id IS NOT NULL AND public.is_qr_owner(qr_page_id, false))
  OR (qr_business_page_id IS NOT NULL AND public.is_qr_owner(qr_business_page_id, true))
);

DROP POLICY IF EXISTS "Owners can delete access requests" ON public.qr_access_requests;
CREATE POLICY "Owners can delete access requests"
ON public.qr_access_requests FOR DELETE
USING (
  (qr_page_id IS NOT NULL AND public.is_qr_owner(qr_page_id, false))
  OR (qr_business_page_id IS NOT NULL AND public.is_qr_owner(qr_business_page_id, true))
);
