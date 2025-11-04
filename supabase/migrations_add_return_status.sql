-- Migration: Add return status to orders table
-- This enables tracking of item returns and security deposit refunds

-- Add return_status column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT NULL CHECK (return_status IN ('pending', 'approved', 'rejected'));

-- Add return_requested_at timestamp
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ DEFAULT NULL;

-- Add return_approved_at timestamp
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_approved_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_return_status ON orders(return_status) WHERE return_status IS NOT NULL;

