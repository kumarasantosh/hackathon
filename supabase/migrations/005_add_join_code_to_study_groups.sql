-- Add join_code to study_groups table
-- This allows group managers to create shareable join links

ALTER TABLE public.study_groups
ADD COLUMN IF NOT EXISTS join_code VARCHAR(255) UNIQUE;

-- Create index on join_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_study_groups_join_code ON public.study_groups(join_code);

-- Function to generate a unique join code
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character alphanumeric code
        code := UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.study_groups WHERE join_code = code) INTO exists_check;
        
        -- Exit loop if code is unique
        EXIT WHEN NOT exists_check;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Update existing groups to have join codes (optional - for existing data)
-- This can be run manually or as part of application logic
-- UPDATE public.study_groups SET join_code = generate_join_code() WHERE join_code IS NULL;

