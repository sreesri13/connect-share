-- Create scan_history table for logged-in users
CREATE TABLE public.scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scanned_content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'url',
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  title TEXT,
  CONSTRAINT scan_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own scan history" 
ON public.scan_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scan records" 
ON public.scan_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan records" 
ON public.scan_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_scan_history_user_id ON public.scan_history(user_id);
CREATE INDEX idx_scan_history_scanned_at ON public.scan_history(scanned_at DESC);