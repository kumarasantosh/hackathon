-- Comprehensive fix for users table
-- This migration will create the table if it doesn't exist, or add missing columns if it does

-- First, check if users table exists, if not create it
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'topper', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    cgpa DECIMAL(3,2),
    transcript_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now add any missing columns (safe to run even if columns exist)
DO $$ 
BEGIN
    -- Add full_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN full_name VARCHAR(255);
        RAISE NOTICE 'Added full_name column to users table';
    END IF;

    -- Add cgpa if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'cgpa'
    ) THEN
        ALTER TABLE public.users ADD COLUMN cgpa DECIMAL(3,2);
        RAISE NOTICE 'Added cgpa column to users table';
    END IF;

    -- Add transcript_url if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'transcript_url'
    ) THEN
        ALTER TABLE public.users ADD COLUMN transcript_url TEXT;
        RAISE NOTICE 'Added transcript_url column to users table';
    END IF;

    -- Add bio if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.users ADD COLUMN bio TEXT;
        RAISE NOTICE 'Added bio column to users table';
    END IF;

    -- Add is_verified if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_verified column to users table';
    END IF;

    -- Add role if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.users ADD COLUMN role VARCHAR(50) DEFAULT 'student';
        RAISE NOTICE 'Added role column to users table';
    END IF;

    -- Add email if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.users ADD COLUMN email VARCHAR(255);
        RAISE NOTICE 'Added email column to users table';
    END IF;

    -- Add clerk_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'clerk_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN clerk_id VARCHAR(255) UNIQUE;
        RAISE NOTICE 'Added clerk_id column to users table';
    END IF;

    -- Add created_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to users table';
    END IF;

    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to users table';
    END IF;

END $$;

-- Ensure role column has correct default and constraint
DO $$
BEGIN
    -- Set default if not set
    ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'student';
    
    -- Drop any existing role constraints first
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check1;
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check2;
    
    -- Add the correct check constraint
    ALTER TABLE public.users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('student', 'topper', 'admin'));
    
    RAISE NOTICE 'Added/updated role constraint';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error setting role constraint: %', SQLERRM;
END $$;

-- Ensure clerk_id is NOT NULL (if table has data, you may need to populate it first)
DO $$
BEGIN
    -- Only make it NOT NULL if there are no NULL values
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE clerk_id IS NULL) THEN
        ALTER TABLE public.users ALTER COLUMN clerk_id SET NOT NULL;
    END IF;
END $$;

-- Ensure email is NOT NULL (if table has data, you may need to populate it first)
DO $$
BEGIN
    -- Only make it NOT NULL if there are no NULL values
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email IS NULL) THEN
        ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
    END IF;
END $$;

-- Create index on clerk_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_id);

-- Create index on role if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Create index on is_verified if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON public.users(is_verified);

-- Refresh schema cache (this is handled by Supabase, but we can verify)
-- Note: You may need to wait a few seconds for PostgREST to refresh its schema cache
