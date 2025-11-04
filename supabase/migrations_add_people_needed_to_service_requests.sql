-- Migration: Add people_needed and auto_approve to service_requests table

-- Add people_needed column (number of people needed for the service)
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS people_needed INTEGER DEFAULT 1 CHECK (people_needed > 0);

-- Add auto_approve column (if true, automatically approve offers until people_needed is reached)
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT false;

-- Update existing records to have people_needed = 1 if null
UPDATE service_requests 
SET people_needed = 1 
WHERE people_needed IS NULL;

