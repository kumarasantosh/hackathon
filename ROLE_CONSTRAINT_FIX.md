# Quick Fix for Role Constraint Error

## The Problem
Error: `new row for relation "users" violates check constraint "users_role_check"`

This happens because:
1. The constraint might be defined inline in CREATE TABLE
2. There might be multiple conflicting constraints
3. The constraint name might be auto-generated

## Quick Solution

### Run This SQL in Supabase Dashboard → SQL Editor:

```sql
-- Step 1: Find and drop ALL role-related constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find all constraints on users table that involve 'role'
    FOR r IN 
        SELECT conname, pg_get_constraintdef(oid) as def
        FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND contype = 'c'
        AND (pg_get_constraintdef(oid) LIKE '%role%' OR conname LIKE '%role%')
    LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';
        RAISE NOTICE 'Dropped: %', r.conname;
    END LOOP;
END $$;

-- Step 2: Fix any bad data
UPDATE public.users 
SET role = 'student' 
WHERE role IS NULL OR TRIM(role) NOT IN ('student', 'topper', 'admin');

-- Step 3: Add the correct constraint
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('student', 'topper', 'admin'));

-- Step 4: Verify it works
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname = 'users_role_check';
```

### Then Run the Seed Script:

```bash
npm run db:seed
```

## Alternative: Use the Migration File

1. Open `supabase/migrations/004_fix_role_constraint.sql`
2. Copy all contents
3. Paste in Supabase SQL Editor
4. Run it
5. Wait 10 seconds
6. Run `npm run db:seed`

## Verification

After running the fix, verify with:

```sql
-- Check constraint exists
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname = 'users_role_check';

-- Should return: users_role_check | CHECK (role IN ('student', 'topper', 'admin'))
```

## Why This Happens

The initial schema defines the constraint inline:
```sql
role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'topper', 'admin'))
```

PostgreSQL might auto-generate a constraint name, or subsequent migrations might create duplicates. This fix ensures there's only ONE correct constraint.

