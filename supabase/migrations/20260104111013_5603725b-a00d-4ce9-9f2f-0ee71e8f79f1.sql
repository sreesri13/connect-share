-- Create qr_scans table to track QR code scan analytics
CREATE TABLE public.qr_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_page_id UUID REFERENCES public.qr_pages(id) ON DELETE CASCADE,
  qr_business_page_id UUID REFERENCES public.qr_business_pages(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_hash TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  -- Ensure at least one of the QR page references is set
  CONSTRAINT check_qr_reference CHECK (qr_page_id IS NOT NULL OR qr_business_page_id IS NOT NULL)
);

-- Create indexes for efficient querying
CREATE INDEX idx_qr_scans_qr_page_id ON public.qr_scans(qr_page_id);
CREATE INDEX idx_qr_scans_qr_business_page_id ON public.qr_scans(qr_business_page_id);
CREATE INDEX idx_qr_scans_scanned_at ON public.qr_scans(scanned_at);

-- Enable RLS
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert scan records (public tracking)
CREATE POLICY "Anyone can record scans"
ON public.qr_scans
FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own QR scans via qr_pages
CREATE POLICY "Users can view their own QR scans via profile pages"
ON public.qr_scans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.qr_pages
    WHERE qr_pages.id = qr_scans.qr_page_id
    AND qr_pages.user_id = auth.uid()
  )
);

-- Policy: Users can view their own QR scans via business pages  
CREATE POLICY "Users can view their own QR scans via business pages"
ON public.qr_scans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.qr_business_pages
    WHERE qr_business_pages.id = qr_scans.qr_business_page_id
    AND qr_business_pages.user_id = auth.uid()
  )
);