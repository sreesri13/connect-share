-- Fix pgcrypto functions search_path for set_qr_password and verify_qr_password

CREATE OR REPLACE FUNCTION public.set_qr_password(
  p_page_type text,
  p_page_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
    v_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
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

CREATE OR REPLACE FUNCTION public.verify_qr_password(
  qr_public_id text,
  password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
    RETURN stored_hash = extensions.crypt(password, stored_hash);
  END IF;

  -- legacy client-side sha256 hex hashes
  RETURN stored_hash = encode(extensions.digest(password, 'sha256'), 'hex');
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_qr_password(text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_qr_password(text, text) TO anon, authenticated, service_role;
