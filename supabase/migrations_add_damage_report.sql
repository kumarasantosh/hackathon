-- Migration: Add damage reporting to orders table
-- This enables owners to report damage after item return is approved

-- Add damage fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS damage_reported BOOLEAN DEFAULT false;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS damage_description TEXT DEFAULT NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS damage_reported_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_damage_reported ON orders(damage_reported) WHERE damage_reported = true;

