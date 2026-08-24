--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_type AS ENUM (
    'url',
    'text',
    'pdf',
    'image',
    'video',
    'audio',
    'others',
    'wifi',
    'largefile'
);


--
-- Name: product_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_status AS ENUM (
    'active',
    'disabled'
);


--
-- Name: can_view_qr_business_page(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_qr_business_page(p_page_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM qr_business_pages q
    WHERE q.id = p_page_id
      AND COALESCE(q.is_deleted, false) = false
      AND (
        COALESCE(q.public_view, true) = true
        OR q.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM qr_permissions pm
          WHERE pm.qr_business_page_id = q.id
            AND pm.status = 'active'
            AND lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
      )
  );
$$;


--
-- Name: can_view_qr_page(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_qr_page(p_page_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM qr_pages q
    WHERE q.id = p_page_id
      AND COALESCE(q.is_deleted, false) = false
      AND (
        COALESCE(q.public_view, true) = true
        OR q.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM qr_permissions pm
          WHERE pm.qr_page_id = q.id
            AND pm.status = 'active'
            AND lower(pm.user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
      )
  );
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;


--
-- Name: resolve_upi_by_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_upi_by_code(p_code text) RETURNS TABLE(upi_id text, display_name text, amount numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT u.upi_id, u.display_name, u.amount
  FROM upi_payments u
  WHERE p_code IS NOT NULL
    AND length(p_code) BETWEEN 1 AND 100
    AND u.public_code = p_code
  LIMIT 1;
$$;


--
-- Name: set_qr_password(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_qr_password(p_page_type text, p_page_id uuid, p_password text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_hash text;
  v_rows int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_page_type NOT IN ('profile','business') THEN
    RAISE EXCEPTION 'Invalid page type';
  END IF;

  IF p_password IS NULL OR length(trim(p_password)) = 0 THEN
    v_hash := NULL;
  ELSIF length(p_password) > 200 THEN
    RAISE EXCEPTION 'Password too long';
  ELSE
    v_hash := crypt(p_password, gen_salt('bf', 10));
  END IF;

  IF p_page_type = 'profile' THEN
    UPDATE qr_pages SET password_hash = v_hash
      WHERE id = p_page_id AND user_id = auth.uid();
  ELSE
    UPDATE qr_business_pages SET password_hash = v_hash
      WHERE id = p_page_id AND user_id = auth.uid();
  END IF;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Page not found or not owned by user';
  END IF;
  RETURN true;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: verify_qr_password(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_qr_password(qr_public_id text, password text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  stored_hash text;
  found boolean := false;
BEGIN
  IF qr_public_id IS NULL OR length(qr_public_id) > 100 THEN
    RETURN false;
  END IF;

  SELECT p.password_hash, true INTO stored_hash, found
  FROM qr_pages p WHERE p.public_id = qr_public_id LIMIT 1;

  IF NOT found THEN
    SELECT b.password_hash, true INTO stored_hash, found
    FROM qr_business_pages b WHERE b.public_id = qr_public_id LIMIT 1;
  END IF;

  IF NOT found THEN
    RETURN false;
  END IF;

  IF stored_hash IS NULL THEN
    RETURN true;
  END IF;

  IF password IS NULL OR length(password) = 0 OR length(password) > 200 THEN
    RETURN false;
  END IF;

  -- bcrypt hashes
  IF stored_hash LIKE '$2%' THEN
    RETURN stored_hash = crypt(password, stored_hash);
  END IF;

  -- legacy client-side sha256 hex hashes
  RETURN stored_hash = encode(digest(password, 'sha256'), 'hex');
END;
$_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: business_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    image_url text NOT NULL,
    original_price numeric(10,2) NOT NULL,
    discount_price numeric(10,2),
    description text,
    status public.product_status DEFAULT 'active'::public.product_status NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_products_check CHECK (((discount_price IS NULL) OR ((discount_price >= (0)::numeric) AND (discount_price <= original_price)))),
    CONSTRAINT business_products_original_price_check CHECK ((original_price >= (0)::numeric))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    type public.item_type NOT NULL,
    content text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    bio text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: qr_access_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_access_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    qr_page_id uuid,
    qr_business_page_id uuid,
    user_email text NOT NULL,
    user_id uuid,
    requested_role text DEFAULT 'viewer'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT qr_access_requests_one_qr CHECK ((((qr_page_id IS NOT NULL) AND (qr_business_page_id IS NULL)) OR ((qr_page_id IS NULL) AND (qr_business_page_id IS NOT NULL)))),
    CONSTRAINT qr_access_requests_requested_role_check CHECK ((requested_role = ANY (ARRAY['viewer'::text, 'editor'::text]))),
    CONSTRAINT qr_access_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: qr_business_page_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_business_page_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    qr_page_id uuid NOT NULL,
    product_id uuid NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);


--
-- Name: qr_business_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_business_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    public_id text NOT NULL,
    title text,
    style_id uuid,
    style_config jsonb,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location_locked boolean DEFAULT false,
    location_lat double precision,
    location_lng double precision,
    location_name text,
    password_hash text,
    expires_at timestamp with time zone,
    show_expires_at boolean DEFAULT false,
    business_name text,
    business_logo_url text,
    business_address text,
    business_phone text,
    business_email text,
    business_website text,
    business_instagram text,
    business_facebook text,
    business_twitter text,
    business_whatsapp text,
    business_hours text,
    scan_limit_type text DEFAULT 'unlimited'::text NOT NULL,
    max_scans integer,
    daily_limit integer,
    store_slug text,
    public_view boolean DEFAULT true NOT NULL,
    allow_requests boolean DEFAULT false NOT NULL,
    qr_logo_url text,
    show_install_popup boolean DEFAULT true NOT NULL,
    show_footer_branding boolean DEFAULT true NOT NULL
);


--
-- Name: COLUMN qr_business_pages.show_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.qr_business_pages.show_expires_at IS 'Whether to show the expiry countdown to visitors who scan the QR code';


--
-- Name: qr_page_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_page_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    qr_page_id uuid NOT NULL,
    item_id uuid NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);


--
-- Name: qr_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    public_id text NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    password_hash text,
    expires_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    style_id uuid,
    style_config jsonb,
    location_locked boolean DEFAULT false,
    location_lat double precision,
    location_lng double precision,
    location_name text,
    show_expires_at boolean DEFAULT false,
    starred_item_id uuid,
    scan_limit_type text DEFAULT 'unlimited'::text NOT NULL,
    max_scans integer,
    daily_limit integer,
    public_view boolean DEFAULT true NOT NULL,
    allow_requests boolean DEFAULT false NOT NULL,
    qr_logo_url text,
    show_install_popup boolean DEFAULT true NOT NULL,
    show_footer_branding boolean DEFAULT true NOT NULL
);


--
-- Name: COLUMN qr_pages.show_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.qr_pages.show_expires_at IS 'Whether to show the expiry countdown to visitors who scan the QR code';


--
-- Name: qr_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    qr_page_id uuid,
    qr_business_page_id uuid,
    user_email text NOT NULL,
    user_id uuid,
    role text DEFAULT 'viewer'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    granted_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT qr_permissions_one_qr CHECK ((((qr_page_id IS NOT NULL) AND (qr_business_page_id IS NULL)) OR ((qr_page_id IS NULL) AND (qr_business_page_id IS NOT NULL)))),
    CONSTRAINT qr_permissions_role_check CHECK ((role = ANY (ARRAY['viewer'::text, 'editor'::text]))),
    CONSTRAINT qr_permissions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text])))
);


--
-- Name: qr_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    qr_page_id uuid,
    qr_business_page_id uuid,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    user_agent text,
    ip_hash text,
    country text,
    city text,
    device_type text,
    CONSTRAINT check_qr_reference CHECK (((qr_page_id IS NOT NULL) OR (qr_business_page_id IS NOT NULL)))
);


--
-- Name: qr_styles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_styles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scan_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scan_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scanned_content text NOT NULL,
    content_type text DEFAULT 'url'::text NOT NULL,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    title text
);


--
-- Name: upi_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upi_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    upi_id text NOT NULL,
    display_name text DEFAULT 'QR Payments'::text,
    public_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    amount numeric(10,2) DEFAULT NULL::numeric
);


--
-- Name: business_categories business_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_pkey PRIMARY KEY (id);


--
-- Name: business_categories business_categories_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_user_id_name_key UNIQUE (user_id, name);


--
-- Name: business_products business_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_products
    ADD CONSTRAINT business_products_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: qr_access_requests qr_access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_access_requests
    ADD CONSTRAINT qr_access_requests_pkey PRIMARY KEY (id);


--
-- Name: qr_business_page_products qr_business_page_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_business_page_products
    ADD CONSTRAINT qr_business_page_products_pkey PRIMARY KEY (id);


--
-- Name: qr_business_page_products qr_business_page_products_qr_page_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_business_page_products
    ADD CONSTRAINT qr_business_page_products_qr_page_id_product_id_key UNIQUE (qr_page_id, product_id);


--
-- Name: qr_business_pages qr_business_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_business_pages
    ADD CONSTRAINT qr_business_pages_pkey PRIMARY KEY (id);


--
-- Name: qr_business_pages qr_business_pages_public_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_business_pages
    ADD CONSTRAINT qr_business_pages_public_id_key UNIQUE (public_id);


--
-- Name: qr_business_pages qr_business_pages_store_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_business_pages
    ADD CONSTRAINT qr_business_pages_store_slug_key UNIQUE (store_slug);


--
-- Name: qr_page_items qr_page_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_page_items
    ADD CONSTRAINT qr_page_items_pkey PRIMARY KEY (id);


--
-- Name: qr_page_items qr_page_items_qr_page_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_page_items
    ADD CONSTRAINT qr_page_items_qr_page_id_item_id_key UNIQUE (qr_page_id, item_id);


--
-- Name: qr_pages qr_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_pages
    ADD CONSTRAINT qr_pages_pkey PRIMARY KEY (id);


--
-- Name: qr_pages qr_pages_public_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_pages
    ADD CONSTRAINT qr_pages_public_id_key UNIQUE (public_id);


--
-- Name: qr_permissions qr_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_permissions
    ADD CONSTRAINT qr_permissions_pkey PRIMARY KEY (id);


--
-- Name: qr_scans qr_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_scans
    ADD CONSTRAINT qr_scans_pkey PRIMARY KEY (id);


--
-- Name: qr_styles qr_styles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_styles
    ADD CONSTRAINT qr_styles_pkey PRIMARY KEY (id);


--
-- Name: scan_history scan_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_history
    ADD CONSTRAINT scan_history_pkey PRIMARY KEY (id);


--
-- Name: upi_payments upi_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upi_payments
    ADD CONSTRAINT upi_payments_pkey PRIMARY KEY (id);


--
-- Name: upi_payments upi_payments_public_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upi_payments
    ADD CONSTRAINT upi_payments_public_code_key UNIQUE (public_code);


--
-- Name: idx_business_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_products_category ON public.business_products USING btree (category_id);


--
-- Name: idx_business_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_products_status ON public.business_products USING btree (status);


--
-- Name: idx_qr_business_page_products_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_business_page_products_page ON public.qr_business_page_products USING btree (qr_page_id);


--
-- Name: idx_qr_business_page_products_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_business_page_products_product ON public.qr_business_page_products USING btree (product_id);


--
-- Name: idx_qr_business_pages_public_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_business_pages_public_id ON public.qr_business_pages USING btree (public_id);


--
-- Name: idx_qr_business_pages_store_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_business_pages_store_slug ON public.qr_business_pages USING btree (store_slug) WHERE (store_slug IS NOT NULL);


--
-- Name: idx_qr_pages_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_pages_deleted_at ON public.qr_pages USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_qr_pages_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_pages_expires_at ON public.qr_pages USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_qr_scans_qr_business_page_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_scans_qr_business_page_id ON public.qr_scans USING btree (qr_business_page_id);


--
-- Name: idx_qr_scans_qr_page_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_scans_qr_page_id ON public.qr_scans USING btree (qr_page_id);


--
-- Name: idx_qr_scans_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_scans_scanned_at ON public.qr_scans USING btree (scanned_at);


--
-- Name: idx_qr_styles_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_styles_is_default ON public.qr_styles USING btree (user_id, is_default) WHERE (is_default = true);


--
-- Name: idx_qr_styles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_styles_user_id ON public.qr_styles USING btree (user_id);


--
-- Name: idx_scan_history_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_history_scanned_at ON public.scan_history USING btree (scanned_at DESC);


--
-- Name: idx_scan_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_history_user_id ON public.scan_history USING btree (user_id);


--
-- Name: idx_upi_payments_public_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upi_payments_public_code ON public.upi_payments USING btree (public_code);


--
-- Name: idx_upi_payments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upi_payments_user_id ON public.upi_payments USING btree (user_id);


--
-- Name: business_categories update_business_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_categories_updated_at BEFORE UPDATE ON public.business_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: business_products update_business_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_products_updated_at BEFORE UPDATE ON public.business_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: items update_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: qr_business_pages update_qr_business_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_qr_business_pages_updated_at BEFORE UPDATE ON public.qr_business_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: qr_styles update_qr_styles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_qr_styles_updated_at BEFORE UPDATE ON public.qr_styles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: upi_payments update_upi_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_upi_payments_updated_at BEFORE UPDATE ON public.upi_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: business_products business_products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_products
    ADD CONSTRAINT business_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.business_categories(id) ON DELETE CASCADE;


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: items items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: items items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: qr_access_requests qr_access_requests_qr_business_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_access_requests
    ADD CONSTRAINT qr_access_requests_qr_business_page_id_fkey FOREIGN KEY (qr_business_page_id) REFERENCES public.qr_business_pages(id) ON DELETE CASCADE;


--
-- Name: qr_access_requests qr_access_requests_qr_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_access_requests
    ADD CONSTRAINT qr_access_requests_qr_page_id_fkey FOREIGN KEY (qr_page_id) REFERENCES public.qr_pages(id) ON DELETE CASCADE;


--
-- Name: qr_business_page_products qr_business_page_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_business_page_products
    ADD CONSTRAINT qr_business_page_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.business_products(id) ON DELETE CASCADE;


--
-- Name: qr_business_page_products qr_business_page_products_qr_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_business_page_products
    ADD CONSTRAINT qr_business_page_products_qr_page_id_fkey FOREIGN KEY (qr_page_id) REFERENCES public.qr_business_pages(id) ON DELETE CASCADE;


--
-- Name: qr_business_pages qr_business_pages_style_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_business_pages
    ADD CONSTRAINT qr_business_pages_style_id_fkey FOREIGN KEY (style_id) REFERENCES public.qr_styles(id) ON DELETE SET NULL;


--
-- Name: qr_page_items qr_page_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_page_items
    ADD CONSTRAINT qr_page_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: qr_page_items qr_page_items_qr_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_page_items
    ADD CONSTRAINT qr_page_items_qr_page_id_fkey FOREIGN KEY (qr_page_id) REFERENCES public.qr_pages(id) ON DELETE CASCADE;


--
-- Name: qr_pages qr_pages_starred_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_pages
    ADD CONSTRAINT qr_pages_starred_item_id_fkey FOREIGN KEY (starred_item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: qr_pages qr_pages_style_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_pages
    ADD CONSTRAINT qr_pages_style_id_fkey FOREIGN KEY (style_id) REFERENCES public.qr_styles(id) ON DELETE SET NULL;


--
-- Name: qr_pages qr_pages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_pages
    ADD CONSTRAINT qr_pages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: qr_permissions qr_permissions_qr_business_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_permissions
    ADD CONSTRAINT qr_permissions_qr_business_page_id_fkey FOREIGN KEY (qr_business_page_id) REFERENCES public.qr_business_pages(id) ON DELETE CASCADE;


--
-- Name: qr_permissions qr_permissions_qr_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_permissions
    ADD CONSTRAINT qr_permissions_qr_page_id_fkey FOREIGN KEY (qr_page_id) REFERENCES public.qr_pages(id) ON DELETE CASCADE;


--
-- Name: qr_scans qr_scans_qr_business_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_scans
    ADD CONSTRAINT qr_scans_qr_business_page_id_fkey FOREIGN KEY (qr_business_page_id) REFERENCES public.qr_business_pages(id) ON DELETE CASCADE;


--
-- Name: qr_scans qr_scans_qr_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_scans
    ADD CONSTRAINT qr_scans_qr_page_id_fkey FOREIGN KEY (qr_page_id) REFERENCES public.qr_pages(id) ON DELETE CASCADE;


--
-- Name: scan_history scan_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_history
    ADD CONSTRAINT scan_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: qr_business_pages Anyone can view public QR business pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view public QR business pages" ON public.qr_business_pages FOR SELECT USING (((COALESCE(is_deleted, false) = false) AND ((expires_at IS NULL) OR (expires_at > now())) AND (COALESCE(public_view, true) = true)));


--
-- Name: qr_pages Anyone can view public QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view public QR pages" ON public.qr_pages FOR SELECT USING (((COALESCE(is_deleted, false) = false) AND ((expires_at IS NULL) OR (expires_at > now())) AND (COALESCE(public_view, true) = true)));


--
-- Name: qr_access_requests Owners and requesters can view requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and requesters can view requests" ON public.qr_access_requests FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_access_requests.qr_page_id) AND (qr_pages.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_access_requests.qr_business_page_id) AND (qr_business_pages.user_id = auth.uid()))))));


--
-- Name: qr_access_requests Owners can delete access requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete access requests" ON public.qr_access_requests FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_access_requests.qr_page_id) AND (qr_pages.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_access_requests.qr_business_page_id) AND (qr_business_pages.user_id = auth.uid()))))));


--
-- Name: qr_permissions Owners can delete permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete permissions" ON public.qr_permissions FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_permissions.qr_page_id) AND (qr_pages.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_permissions.qr_business_page_id) AND (qr_business_pages.user_id = auth.uid()))))));


--
-- Name: qr_permissions Owners can insert permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can insert permissions" ON public.qr_permissions FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_permissions.qr_page_id) AND (qr_pages.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_permissions.qr_business_page_id) AND (qr_business_pages.user_id = auth.uid()))))));


--
-- Name: qr_access_requests Owners can update access requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update access requests" ON public.qr_access_requests FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_access_requests.qr_page_id) AND (qr_pages.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_access_requests.qr_business_page_id) AND (qr_business_pages.user_id = auth.uid()))))));


--
-- Name: qr_permissions Owners can update permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update permissions" ON public.qr_permissions FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_permissions.qr_page_id) AND (qr_pages.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_permissions.qr_business_page_id) AND (qr_business_pages.user_id = auth.uid()))))));


--
-- Name: qr_permissions Owners can view permissions for their QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view permissions for their QR pages" ON public.qr_permissions FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_permissions.qr_page_id) AND (qr_pages.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_permissions.qr_business_page_id) AND (qr_business_pages.user_id = auth.uid())))) OR (user_id = auth.uid())));


--
-- Name: business_products Public can view active products via viewable QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active products via viewable QR pages" ON public.business_products FOR SELECT USING (((status = 'active'::public.product_status) AND (EXISTS ( SELECT 1
   FROM public.qr_business_page_products qbpp
  WHERE ((qbpp.product_id = business_products.id) AND public.can_view_qr_business_page(qbpp.qr_page_id))))));


--
-- Name: business_categories Public can view categories via viewable QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view categories via viewable QR pages" ON public.business_categories FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.business_products bp
     JOIN public.qr_business_page_products qbpp ON ((qbpp.product_id = bp.id)))
  WHERE ((bp.category_id = business_categories.id) AND public.can_view_qr_business_page(qbpp.qr_page_id)))));


--
-- Name: categories Public can view categories via viewable QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view categories via viewable QR pages" ON public.categories FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.items i
     JOIN public.qr_page_items qpi ON ((qpi.item_id = i.id)))
  WHERE ((i.category_id = categories.id) AND public.can_view_qr_page(qpi.qr_page_id)))));


--
-- Name: items Public can view items via viewable QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view items via viewable QR pages" ON public.items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.qr_page_items qpi
  WHERE ((qpi.item_id = items.id) AND public.can_view_qr_page(qpi.qr_page_id)))));


--
-- Name: profiles Public can view profiles via viewable QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view profiles via viewable QR pages" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.qr_pages q
  WHERE ((q.user_id = profiles.user_id) AND ((q.expires_at IS NULL) OR (q.expires_at > now())) AND public.can_view_qr_page(q.id)))));


--
-- Name: qr_access_requests Requests allowed for pages that accept them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Requests allowed for pages that accept them" ON public.qr_access_requests FOR INSERT WITH CHECK (((status = 'pending'::text) AND (requested_role = ANY (ARRAY['viewer'::text, 'editor'::text])) AND ((length(user_email) >= 3) AND (length(user_email) <= 320)) AND ((auth.uid() IS NULL) OR (lower(user_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))) AND (((qr_page_id IS NOT NULL) AND (qr_business_page_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.qr_pages q
  WHERE ((q.id = qr_access_requests.qr_page_id) AND (COALESCE(q.is_deleted, false) = false) AND (q.allow_requests = true))))) OR ((qr_business_page_id IS NOT NULL) AND (qr_page_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.qr_business_pages b
  WHERE ((b.id = qr_access_requests.qr_business_page_id) AND (COALESCE(b.is_deleted, false) = false) AND (b.allow_requests = true))))))));


--
-- Name: qr_scans Scans can be recorded for existing pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Scans can be recorded for existing pages" ON public.qr_scans FOR INSERT WITH CHECK ((((qr_page_id IS NOT NULL) AND (qr_business_page_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.qr_pages q
  WHERE ((q.id = qr_scans.qr_page_id) AND (COALESCE(q.is_deleted, false) = false))))) OR ((qr_business_page_id IS NOT NULL) AND (qr_page_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.qr_business_pages b
  WHERE ((b.id = qr_scans.qr_business_page_id) AND (COALESCE(b.is_deleted, false) = false)))))));


--
-- Name: qr_business_pages Users can create their own QR business pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own QR business pages" ON public.qr_business_pages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: qr_pages Users can create their own QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own QR pages" ON public.qr_pages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: qr_styles Users can create their own QR styles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own QR styles" ON public.qr_styles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: upi_payments Users can create their own UPI payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own UPI payments" ON public.upi_payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: business_categories Users can create their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own categories" ON public.business_categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: categories Users can create their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own categories" ON public.categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: items Users can create their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own items" ON public.items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: business_products Users can create their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own products" ON public.business_products FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can create their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: scan_history Users can create their own scan records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own scan records" ON public.scan_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: qr_business_page_products Users can delete their QR business page products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their QR business page products" ON public.qr_business_page_products FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_business_page_products.qr_page_id) AND (qr_business_pages.user_id = auth.uid())))));


--
-- Name: qr_page_items Users can delete their QR page items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their QR page items" ON public.qr_page_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_page_items.qr_page_id) AND (qr_pages.user_id = auth.uid())))));


--
-- Name: qr_business_pages Users can delete their own QR business pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own QR business pages" ON public.qr_business_pages FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: qr_pages Users can delete their own QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own QR pages" ON public.qr_pages FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: qr_styles Users can delete their own QR styles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own QR styles" ON public.qr_styles FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: upi_payments Users can delete their own UPI payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own UPI payments" ON public.upi_payments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: business_categories Users can delete their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own categories" ON public.business_categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: categories Users can delete their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own categories" ON public.categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: items Users can delete their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own items" ON public.items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: business_products Users can delete their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own products" ON public.business_products FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: scan_history Users can delete their own scan records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own scan records" ON public.scan_history FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: qr_business_page_products Users can manage their QR business page products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their QR business page products" ON public.qr_business_page_products FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_business_page_products.qr_page_id) AND (qr_business_pages.user_id = auth.uid())))));


--
-- Name: qr_page_items Users can manage their QR page items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their QR page items" ON public.qr_page_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_page_items.qr_page_id) AND (qr_pages.user_id = auth.uid())))));


--
-- Name: qr_business_page_products Users can update their QR business page products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their QR business page products" ON public.qr_business_page_products FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_business_page_products.qr_page_id) AND (qr_business_pages.user_id = auth.uid())))));


--
-- Name: qr_page_items Users can update their QR page items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their QR page items" ON public.qr_page_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_page_items.qr_page_id) AND (qr_pages.user_id = auth.uid())))));


--
-- Name: qr_business_pages Users can update their own QR business pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own QR business pages" ON public.qr_business_pages FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: qr_pages Users can update their own QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own QR pages" ON public.qr_pages FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: qr_styles Users can update their own QR styles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own QR styles" ON public.qr_styles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: upi_payments Users can update their own UPI payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own UPI payments" ON public.upi_payments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: business_categories Users can update their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own categories" ON public.business_categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: categories Users can update their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own categories" ON public.categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: items Users can update their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own items" ON public.items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: business_products Users can update their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own products" ON public.business_products FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: qr_business_pages Users can view their own QR business pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own QR business pages" ON public.qr_business_pages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: qr_pages Users can view their own QR pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own QR pages" ON public.qr_pages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: qr_scans Users can view their own QR scans via business pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own QR scans via business pages" ON public.qr_scans FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.qr_business_pages
  WHERE ((qr_business_pages.id = qr_scans.qr_business_page_id) AND (qr_business_pages.user_id = auth.uid())))));


--
-- Name: qr_scans Users can view their own QR scans via profile pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own QR scans via profile pages" ON public.qr_scans FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.qr_pages
  WHERE ((qr_pages.id = qr_scans.qr_page_id) AND (qr_pages.user_id = auth.uid())))));


--
-- Name: qr_styles Users can view their own QR styles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own QR styles" ON public.qr_styles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: upi_payments Users can view their own UPI payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own UPI payments" ON public.upi_payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: business_categories Users can view their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own categories" ON public.business_categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: categories Users can view their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own categories" ON public.categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: items Users can view their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own items" ON public.items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: business_products Users can view their own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own products" ON public.business_products FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: scan_history Users can view their own scan history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own scan history" ON public.scan_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: qr_business_page_products Viewable QR business page products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Viewable QR business page products" ON public.qr_business_page_products FOR SELECT USING (public.can_view_qr_business_page(qr_page_id));


--
-- Name: qr_page_items Viewable QR page items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Viewable QR page items" ON public.qr_page_items FOR SELECT USING (public.can_view_qr_page(qr_page_id));


--
-- Name: business_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: business_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_access_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_access_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_business_page_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_business_page_products ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_business_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_business_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_page_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_page_items ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_scans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_styles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_styles ENABLE ROW LEVEL SECURITY;

--
-- Name: scan_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

--
-- Name: upi_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.upi_payments ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


