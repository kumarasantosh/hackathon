-- Add phone number column to users table for verification
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add index for phone lookups (optional)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

