
-- Create admin roles table linked to wallet addresses
CREATE TABLE public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- No public access - only edge functions with service role can read
CREATE POLICY "No direct access" ON public.admin_roles FOR SELECT USING (false);

-- Function to check admin status (used by edge functions)
CREATE OR REPLACE FUNCTION public.is_admin(_wallet text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE lower(wallet_address) = lower(_wallet)
  );
$$;
