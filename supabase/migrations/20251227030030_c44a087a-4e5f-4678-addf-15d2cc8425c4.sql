-- Add amount column to upi_payments table (optional fixed amount)
ALTER TABLE public.upi_payments 
ADD COLUMN amount numeric(10, 2) DEFAULT NULL;