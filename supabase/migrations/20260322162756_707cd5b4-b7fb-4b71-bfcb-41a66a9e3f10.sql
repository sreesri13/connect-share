
-- Add public_view and allow_requests columns to qr_pages
ALTER TABLE public.qr_pages 
ADD COLUMN IF NOT EXISTS public_view boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_requests boolean NOT NULL DEFAULT false;

-- Add public_view and allow_requests columns to qr_business_pages
ALTER TABLE public.qr_business_pages 
ADD COLUMN IF NOT EXISTS public_view boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_requests boolean NOT NULL DEFAULT false;

-- Create qr_permissions table
CREATE TABLE public.qr_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_page_id uuid REFERENCES public.qr_pages(id) ON DELETE CASCADE,
  qr_business_page_id uuid REFERENCES public.qr_business_pages(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_id uuid,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
  granted_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qr_permissions_one_qr CHECK (
    (qr_page_id IS NOT NULL AND qr_business_page_id IS NULL) OR 
    (qr_page_id IS NULL AND qr_business_page_id IS NOT NULL)
  )
);

-- Create qr_access_requests table
CREATE TABLE public.qr_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_page_id uuid REFERENCES public.qr_pages(id) ON DELETE CASCADE,
  qr_business_page_id uuid REFERENCES public.qr_business_pages(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_id uuid,
  requested_role text NOT NULL DEFAULT 'viewer' CHECK (requested_role IN ('viewer', 'editor')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qr_access_requests_one_qr CHECK (
    (qr_page_id IS NOT NULL AND qr_business_page_id IS NULL) OR 
    (qr_page_id IS NULL AND qr_business_page_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.qr_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_access_requests ENABLE ROW LEVEL SECURITY;

-- RLS for qr_permissions: owners can manage
CREATE POLICY "Owners can view permissions for their QR pages"
ON public.qr_permissions FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM qr_pages WHERE qr_pages.id = qr_permissions.qr_page_id AND qr_pages.user_id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM qr_business_pages WHERE qr_business_pages.id = qr_permissions.qr_business_page_id AND qr_business_pages.user_id = auth.uid()))
  OR
  (user_id = auth.uid())
);

CREATE POLICY "Owners can insert permissions"
ON public.qr_permissions FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM qr_pages WHERE qr_pages.id = qr_permissions.qr_page_id AND qr_pages.user_id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM qr_business_pages WHERE qr_business_pages.id = qr_permissions.qr_business_page_id AND qr_business_pages.user_id = auth.uid()))
);

CREATE POLICY "Owners can update permissions"
ON public.qr_permissions FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM qr_pages WHERE qr_pages.id = qr_permissions.qr_page_id AND qr_pages.user_id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM qr_business_pages WHERE qr_business_pages.id = qr_permissions.qr_business_page_id AND qr_business_pages.user_id = auth.uid()))
);

CREATE POLICY "Owners can delete permissions"
ON public.qr_permissions FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM qr_pages WHERE qr_pages.id = qr_permissions.qr_page_id AND qr_pages.user_id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM qr_business_pages WHERE qr_business_pages.id = qr_permissions.qr_business_page_id AND qr_business_pages.user_id = auth.uid()))
);

-- RLS for qr_access_requests
CREATE POLICY "Anyone can create access requests"
ON public.qr_access_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners and requesters can view requests"
ON public.qr_access_requests FOR SELECT
USING (
  (user_id = auth.uid())
  OR
  (EXISTS (SELECT 1 FROM qr_pages WHERE qr_pages.id = qr_access_requests.qr_page_id AND qr_pages.user_id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM qr_business_pages WHERE qr_business_pages.id = qr_access_requests.qr_business_page_id AND qr_business_pages.user_id = auth.uid()))
);

CREATE POLICY "Owners can update access requests"
ON public.qr_access_requests FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM qr_pages WHERE qr_pages.id = qr_access_requests.qr_page_id AND qr_pages.user_id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM qr_business_pages WHERE qr_business_pages.id = qr_access_requests.qr_business_page_id AND qr_business_pages.user_id = auth.uid()))
);

CREATE POLICY "Owners can delete access requests"
ON public.qr_access_requests FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM qr_pages WHERE qr_pages.id = qr_access_requests.qr_page_id AND qr_pages.user_id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM qr_business_pages WHERE qr_business_pages.id = qr_access_requests.qr_business_page_id AND qr_business_pages.user_id = auth.uid()))
);
