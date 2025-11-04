-- Migration: Add service order support to orders table

-- Make item_id nullable to support service orders
ALTER TABLE orders 
ALTER COLUMN item_id DROP NOT NULL;

-- Add service-related columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS service_offer_id UUID REFERENCES service_offers(id) ON DELETE CASCADE;

-- Add check constraint to ensure either item_id or service_request_id is set
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_item_or_service_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_item_or_service_check 
CHECK (
  (item_id IS NOT NULL AND service_request_id IS NULL) OR
  (item_id IS NULL AND service_request_id IS NOT NULL)
);

-- Add index for service orders
CREATE INDEX IF NOT EXISTS idx_orders_service_request_id ON orders(service_request_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_offer_id ON orders(service_offer_id);

