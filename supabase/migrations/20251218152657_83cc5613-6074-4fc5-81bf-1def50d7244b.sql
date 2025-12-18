-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the hash function to ensure it works
CREATE OR REPLACE FUNCTION public.hash_qr_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$;

-- Recreate the verify function  
CREATE OR REPLACE FUNCTION public.verify_qr_password(qr_public_id text, password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM qr_pages
  WHERE public_id = qr_public_id;
  
  IF stored_hash IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN stored_hash = encode(digest(password, 'sha256'), 'hex');
END;
$$;