-- Child Safety & Abuse Reporting
-- Migration to support Google Play Child Safety Standards policy compliance

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_type TEXT NOT NULL, -- 'profile', 'item', 'business_page', etc.
  reported_id TEXT NOT NULL,
  reported_title TEXT,
  reason TEXT NOT NULL, -- 'csae', 'harassment', 'inappropriate', 'fraud', 'other'
  details TEXT,
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'dismissed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or anonymous visitors) to submit reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'content_reports' AND policyname = 'Anyone can submit content report'
  ) THEN
    CREATE POLICY "Anyone can submit content report"
      ON public.content_reports
      FOR INSERT
      TO public, anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;
