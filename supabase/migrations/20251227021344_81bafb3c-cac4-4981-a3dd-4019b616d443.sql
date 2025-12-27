-- Create table for storing user UPI payment info
CREATE TABLE public.upi_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  upi_id TEXT NOT NULL,
  display_name TEXT DEFAULT 'QR Payments',
  public_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upi_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own UPI payments"
ON public.upi_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own UPI payments"
ON public.upi_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own UPI payments"
ON public.upi_payments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own UPI payments"
ON public.upi_payments FOR DELETE
USING (auth.uid() = user_id);

-- Allow public read access for redirect resolution (by public_code only)
CREATE POLICY "Anyone can resolve UPI by public code"
ON public.upi_payments FOR SELECT
USING (true);

-- Add index for faster lookup
CREATE INDEX idx_upi_payments_public_code ON public.upi_payments(public_code);
CREATE INDEX idx_upi_payments_user_id ON public.upi_payments(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_upi_payments_updated_at
BEFORE UPDATE ON public.upi_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();