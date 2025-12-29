-- Create enum for product status
CREATE TYPE public.product_status AS ENUM ('active', 'disabled');

-- Create business categories table
CREATE TABLE public.business_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create business products table
CREATE TABLE public.business_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.business_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  original_price NUMERIC(10, 2) NOT NULL CHECK (original_price >= 0),
  discount_price NUMERIC(10, 2) CHECK (discount_price IS NULL OR (discount_price >= 0 AND discount_price <= original_price)),
  description TEXT,
  status product_status NOT NULL DEFAULT 'active',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create QR business pages table
CREATE TABLE public.qr_business_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  title TEXT,
  style_id UUID REFERENCES public.qr_styles(id) ON DELETE SET NULL,
  style_config JSONB,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for QR business page products
CREATE TABLE public.qr_business_page_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_page_id UUID NOT NULL REFERENCES public.qr_business_pages(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(qr_page_id, product_id)
);

-- Enable RLS on all tables
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_business_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_business_page_products ENABLE ROW LEVEL SECURITY;

-- RLS for business_categories
CREATE POLICY "Users can view their own categories"
ON public.business_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON public.business_categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.business_categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.business_categories FOR DELETE
USING (auth.uid() = user_id);

-- RLS for business_products
CREATE POLICY "Users can view their own products"
ON public.business_products FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products"
ON public.business_products FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
ON public.business_products FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
ON public.business_products FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Public can view active products via QR pages"
ON public.business_products FOR SELECT
USING (
  status = 'active' AND
  EXISTS (
    SELECT 1 FROM public.qr_business_page_products qbpp
    JOIN public.qr_business_pages qbp ON qbp.id = qbpp.qr_page_id
    WHERE qbpp.product_id = business_products.id
    AND qbp.is_deleted = false
  )
);

-- RLS for qr_business_pages
CREATE POLICY "Users can view their own QR business pages"
ON public.qr_business_pages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public QR business pages"
ON public.qr_business_pages FOR SELECT
USING (is_deleted = false);

CREATE POLICY "Users can create their own QR business pages"
ON public.qr_business_pages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own QR business pages"
ON public.qr_business_pages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own QR business pages"
ON public.qr_business_pages FOR DELETE
USING (auth.uid() = user_id);

-- RLS for qr_business_page_products
CREATE POLICY "Anyone can view QR business page products"
ON public.qr_business_page_products FOR SELECT
USING (true);

CREATE POLICY "Users can manage their QR business page products"
ON public.qr_business_page_products FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.qr_business_pages
    WHERE id = qr_business_page_products.qr_page_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their QR business page products"
ON public.qr_business_page_products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.qr_business_pages
    WHERE id = qr_business_page_products.qr_page_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their QR business page products"
ON public.qr_business_page_products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.qr_business_pages
    WHERE id = qr_business_page_products.qr_page_id
    AND user_id = auth.uid()
  )
);

-- Public policy for categories via QR pages
CREATE POLICY "Public can view categories via QR pages"
ON public.business_categories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.business_products bp
    JOIN public.qr_business_page_products qbpp ON qbpp.product_id = bp.id
    JOIN public.qr_business_pages qbp ON qbp.id = qbpp.qr_page_id
    WHERE bp.category_id = business_categories.id
    AND qbp.is_deleted = false
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_business_categories_updated_at
BEFORE UPDATE ON public.business_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_products_updated_at
BEFORE UPDATE ON public.business_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qr_business_pages_updated_at
BEFORE UPDATE ON public.qr_business_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_business_products_category ON public.business_products(category_id);
CREATE INDEX idx_business_products_status ON public.business_products(status);
CREATE INDEX idx_qr_business_pages_public_id ON public.qr_business_pages(public_id);
CREATE INDEX idx_qr_business_page_products_page ON public.qr_business_page_products(qr_page_id);
CREATE INDEX idx_qr_business_page_products_product ON public.qr_business_page_products(product_id);