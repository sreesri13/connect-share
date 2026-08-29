-- Security scan limit and access gating functions & policies

-- 1. Scan limit checking function for public visitors
CREATE OR REPLACE FUNCTION public.check_qr_scan_limit(p_page_id uuid, p_is_business boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scan_limit_type text;
  v_max_scans integer;
  v_daily_limit integer;
  v_current_scans integer := 0;
  v_allowed boolean := true;
  v_today_start timestamp with time zone;
BEGIN
  IF p_is_business THEN
    SELECT scan_limit_type, max_scans, daily_limit
    INTO v_scan_limit_type, v_max_scans, v_daily_limit
    FROM qr_business_pages
    WHERE id = p_page_id AND COALESCE(is_deleted, false) = false;
  ELSE
    SELECT scan_limit_type, max_scans, daily_limit
    INTO v_scan_limit_type, v_max_scans, v_daily_limit
    FROM qr_pages
    WHERE id = p_page_id AND COALESCE(is_deleted, false) = false;
  END IF;

  IF v_scan_limit_type IS NULL OR v_scan_limit_type = 'unlimited' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current_scans', 0,
      'limit', 0,
      'scan_limit_type', 'unlimited'
    );
  END IF;

  IF v_scan_limit_type = 'total' AND v_max_scans IS NOT NULL AND v_max_scans > 0 THEN
    IF p_is_business THEN
      SELECT COUNT(*)::integer INTO v_current_scans
      FROM qr_scans WHERE qr_business_page_id = p_page_id;
    ELSE
      SELECT COUNT(*)::integer INTO v_current_scans
      FROM qr_scans WHERE qr_page_id = p_page_id;
    END IF;

    v_allowed := (v_current_scans < v_max_scans);
    RETURN jsonb_build_object(
      'allowed', v_allowed,
      'current_scans', v_current_scans,
      'limit', v_max_scans,
      'scan_limit_type', 'total'
    );
  END IF;

  IF v_scan_limit_type = 'daily' AND v_daily_limit IS NOT NULL AND v_daily_limit > 0 THEN
    v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC');
    IF p_is_business THEN
      SELECT COUNT(*)::integer INTO v_current_scans
      FROM qr_scans
      WHERE qr_business_page_id = p_page_id
        AND scanned_at >= v_today_start;
    ELSE
      SELECT COUNT(*)::integer INTO v_current_scans
      FROM qr_scans
      WHERE qr_page_id = p_page_id
        AND scanned_at >= v_today_start;
    END IF;

    v_allowed := (v_current_scans < v_daily_limit);
    RETURN jsonb_build_object(
      'allowed', v_allowed,
      'current_scans', v_current_scans,
      'limit', v_daily_limit,
      'scan_limit_type', 'daily'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_scans', 0,
    'limit', 0,
    'scan_limit_type', 'unlimited'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_qr_scan_limit(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_qr_scan_limit(uuid, boolean) TO anon, authenticated, service_role;

-- 2. Allow public to view qr_pages and qr_business_pages metadata when public_view is true
-- so security gates (expiry, limits, location, password) can be displayed accurately.
DROP POLICY IF EXISTS "Anyone can view public QR pages" ON public.qr_pages;
CREATE POLICY "Anyone can view public QR pages"
ON public.qr_pages FOR SELECT
USING (
  COALESCE(is_deleted, false) = false
  AND COALESCE(public_view, true) = true
);

DROP POLICY IF EXISTS "Anyone can view public QR business pages" ON public.qr_business_pages;
CREATE POLICY "Anyone can view public QR business pages"
ON public.qr_business_pages FOR SELECT
USING (
  COALESCE(is_deleted, false) = false
  AND COALESCE(public_view, true) = true
);
