# Fix Role Constraint Error

## Problem
Getting error: `new row for relation "users" violates check constraint "users_role_check"`

Even though the role value is `'student'` which should be valid.

## Root Cause
There might be multiple conflicting constraints or an incorrectly defined constraint on the `role` column.

## Solution

### Step 1: Run the Role Constraint Fix Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and run the contents of `supabase/migrations/004_fix_role_constraint.sql`
3. This will:
   - Drop ALL existing role-related constraints
   - Create a clean, correct constraint
   - Fix any invalid role values in existing rows

### Step 2: Alternative - Manual Fix

If the migration doesn't work, run this SQL manually:

```sql
-- Drop all role constraints
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND contype = 'c'
        AND (conname LIKE '%role%' OR pg_get_constraintdef(oid) LIKE '%role%')
    LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped: %', constraint_name;
    END LOOP;
END $$;

-- Add correct constraint
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('student', 'topper', 'admin'));

-- Fix any invalid rows
UPDATE public.users 
SET role = 'student' 
WHERE role IS NULL OR role NOT IN ('student', 'topper', 'admin');
```

### Step 3: Verify the Constraint

```sql
-- Check existing constraints
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
AND contype = 'c';

-- Should show: users_role_check with CHECK (role IN ('student', 'topper', 'admin'))
```

### Step 4: Test Insert

```sql
-- Test if constraint works
INSERT INTO public.users (clerk_id, email, full_name, role)
VALUES ('test_user', 'test@example.com', 'Test User', 'student')
ON CONFLICT (clerk_id) DO NOTHING;

-- If this works, the constraint is fixed!
```

### Step 5: Run Seed Script Again

```bash
npm run db:seed
```

## If Still Not Working

### Check for Hidden Characters

Sometimes the constraint might have invisible characters. Try:

```sql
-- Drop constraint by exact name
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check CASCADE;

-- Recreate with explicit check
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (
    role::text = 'student' OR 
    role::text = 'topper' OR 
    role::text = 'admin'
);
```

### Check Column Type

Make sure the role column is VARCHAR:

```sql
-- Check column type
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name = 'role';

-- Should be: varchar(50) or character varying(50)
```

### Nuclear Option: Recreate Table

If nothing works, you can recreate the users table (⚠️ **WILL DELETE ALL DATA**):

```sql
-- Backup data first!
-- Then:
DROP TABLE IF EXISTS public.users CASCADE;

-- Then run the full schema migration: 001_initial_schema.sql
```

## Prevention

After fixing, the constraint should be:
- Defined in the initial schema migration
- Not duplicated in other migrations
- Using exact string matches: `'student'`, `'topper'`, `'admin'`

