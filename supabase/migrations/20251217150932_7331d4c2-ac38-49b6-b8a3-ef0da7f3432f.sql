-- Add password column to qr_pages for password protection
ALTER TABLE public.qr_pages ADD COLUMN password_hash TEXT DEFAULT NULL;

-- Add UPDATE policy for qr_pages (was missing)
CREATE POLICY "Users can update their own QR pages"
ON public.qr_pages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for qr_page_items
CREATE POLICY "Users can update their QR page items"
ON public.qr_page_items
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM qr_pages
  WHERE qr_pages.id = qr_page_items.qr_page_id
  AND qr_pages.user_id = auth.uid()
));

-- Create a function to hash passwords for QR codes
CREATE OR REPLACE FUNCTION public.hash_qr_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$;

-- Create a function to verify QR passwords
CREATE OR REPLACE FUNCTION public.verify_qr_password(qr_public_id TEXT, password TEXT)
RETURNS BOOLEAN
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