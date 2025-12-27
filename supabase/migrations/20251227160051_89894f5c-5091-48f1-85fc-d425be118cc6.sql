-- Create qr_styles table to store user's saved QR design configurations
CREATE TABLE public.qr_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_qr_styles_user_id ON public.qr_styles(user_id);
CREATE INDEX idx_qr_styles_is_default ON public.qr_styles(user_id, is_default) WHERE is_default = true;

-- Enable Row Level Security
ALTER TABLE public.qr_styles ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own QR styles" 
ON public.qr_styles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own QR styles" 
ON public.qr_styles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own QR styles" 
ON public.qr_styles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own QR styles" 
ON public.qr_styles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_qr_styles_updated_at
BEFORE UPDATE ON public.qr_styles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add style_id column to qr_pages to link QR codes to their styles
ALTER TABLE public.qr_pages ADD COLUMN style_id UUID REFERENCES public.qr_styles(id) ON DELETE SET NULL;

-- Add style_config column to store the style snapshot at time of generation
ALTER TABLE public.qr_pages ADD COLUMN style_config JSONB;