-- Migration: Update trust_score default to 0
-- This changes the default trust score from 50 to 0

-- Update existing users to 0 if they have default 50 (optional, for testing)
-- UPDATE users SET trust_score = 0 WHERE trust_score = 50;

-- Change default value for new users
ALTER TABLE users 
ALTER COLUMN trust_score SET DEFAULT 0;

-- Note: You may want to update existing users manually or leave them as is
-- To update all users to 0: UPDATE users SET trust_score = 0;

