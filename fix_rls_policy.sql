-- Drop existing policies
DROP POLICY IF EXISTS "Allow public insert" ON public.subscribers;
DROP POLICY IF EXISTS "Allow service_role select" ON public.subscribers;

-- Create a policy that allows anon and authenticated to insert
CREATE POLICY "Allow anon and authenticated insert" ON public.subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create a policy that allows select for service_role
CREATE POLICY "Allow service_role select" ON public.subscribers
  FOR SELECT
  TO service_role
  USING (true);

-- Create a policy that allows service_role to do all operations
CREATE POLICY "Allow service_role all" ON public.subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true); 