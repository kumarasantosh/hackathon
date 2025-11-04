-- Add INSERT policy for users table
-- This allows authenticated users to insert their own user record
-- Note: This is a fallback for when webhooks haven't created the user yet

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow user self-insert" ON users;

-- Create policy to allow users to insert their own record
-- We check that the clerk_id matches the authenticated user's clerk_id
CREATE POLICY "Allow user self-insert" ON users
  FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated via Clerk
    -- The clerk_id must match the JWT claim
    clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR
    -- Also allow service role (for webhooks)
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

