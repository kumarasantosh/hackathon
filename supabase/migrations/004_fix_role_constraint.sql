-- Fix role constraint issue
-- This migration specifically fixes the role check constraint

-- Step 1: Drop ALL check constraints on the users table (we'll recreate them properly)
DO $$
DECLARE
    constraint_name text;
    constraint_def text;
BEGIN
    -- Find and drop all check constraints
    FOR constraint_name, constraint_def IN 
        SELECT conname, pg_get_constraintdef(oid)
        FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND contype = 'c'
    LOOP
        -- Only drop role-related constraints
        IF constraint_def LIKE '%role%' THEN
            EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name) || ' CASCADE';
            RAISE NOTICE 'Dropped constraint: % (definition: %)', constraint_name, constraint_def;
        END IF;
    END LOOP;
END $$;

-- Step 2: Ensure role column exists and has correct type
DO $$
BEGIN
    -- Check if role column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.users ADD COLUMN role VARCHAR(50) DEFAULT 'student';
        RAISE NOTICE 'Added role column';
    ELSE
        -- Ensure it's the right type
        ALTER TABLE public.users ALTER COLUMN role TYPE VARCHAR(50);
        ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'student';
        RAISE NOTICE 'Updated role column type and default';
    END IF;
END $$;

-- Step 3: Fix any invalid role values in existing data
UPDATE public.users 
SET role = 'student' 
WHERE role IS NULL 
   OR TRIM(role) NOT IN ('student', 'topper', 'admin')
   OR role = '';

-- Step 4: Now add the correct constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check CASCADE;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IS NOT NULL AND role IN ('student', 'topper', 'admin'));

-- Step 5: Verify the constraint was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND conname = 'users_role_check'
        AND contype = 'c'
    ) THEN
        RAISE NOTICE '✅ Role constraint successfully created: users_role_check';
        
        -- Show the constraint definition
        RAISE NOTICE 'Constraint definition: %', (
            SELECT pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'public.users'::regclass 
            AND conname = 'users_role_check'
        );
    ELSE
        RAISE EXCEPTION '❌ Failed to create role constraint';
    END IF;
END $$;

-- Step 6: Test the constraint works
DO $$
BEGIN
    -- Try to insert a test row (will be rolled back)
    BEGIN
        INSERT INTO public.users (clerk_id, email, full_name, role)
        VALUES ('_test_constraint_check', 'test@test.com', 'Test', 'student')
        ON CONFLICT (clerk_id) DO NOTHING;
        
        DELETE FROM public.users WHERE clerk_id = '_test_constraint_check';
        
        RAISE NOTICE '✅ Constraint test passed - valid values work';
    EXCEPTION
        WHEN check_violation THEN
            RAISE EXCEPTION '❌ Constraint test failed: %', SQLERRM;
    END;
END $$;

