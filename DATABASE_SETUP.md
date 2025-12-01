# Database Setup Guide

## Issue: Missing Columns Error

If you're getting errors like:
```
Could not find the 'cgpa' column of 'users' in the schema cache
```

This means your database schema is out of sync with the migration files.

## Solution

### Option 1: Run Migration Fix (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/003_fix_users_table.sql`
4. This will add any missing columns to existing tables

### Option 2: Fresh Start (If you don't have important data)

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Run `supabase/migrations/001_initial_schema.sql` (this will create all tables)
4. Run `supabase/migrations/002_seed_data.sql` (this will add subjects)
5. Run the seed script: `npm run db:seed`

### Option 3: Manual Column Addition

If you prefer to add columns manually, run this in SQL Editor:

```sql
-- Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS cgpa DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS transcript_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Ensure role column has correct default
ALTER TABLE public.users 
ALTER COLUMN role SET DEFAULT 'student';
```

## Verification

After running the migration, verify the schema:

```sql
-- Check users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;
```

You should see these columns:
- id
- clerk_id
- email
- full_name
- role
- is_verified
- cgpa
- transcript_url
- bio
- created_at
- updated_at

## Running Migrations

### In Supabase Dashboard:
1. Go to SQL Editor
2. Copy the contents of each migration file
3. Paste and run in SQL Editor
4. Run migrations in order: 001, 002, 003

### Using Supabase CLI (if installed):
```bash
supabase db reset  # Reset database and run all migrations
# or
supabase migration up  # Run pending migrations
```

## After Migration

Once the schema is fixed:
1. Run the seed script: `npm run db:seed`
2. Verify data in Supabase Dashboard
3. Test your application

## Troubleshooting

### Error: Column already exists
- This is fine! The migration uses `IF NOT EXISTS` checks
- You can safely run the migration multiple times

### Error: Permission denied
- Make sure you're using the SQL Editor in Supabase Dashboard
- Or use the service role key in your connection

### Schema cache issues
- Supabase sometimes caches schema
- Wait a few seconds and try again
- Or refresh the Supabase Dashboard

## Next Steps

After fixing the schema:
1. ✅ Run migration 003 to add missing columns
2. ✅ Run seed script: `npm run db:seed`
3. ✅ Verify data in Supabase Dashboard
4. ✅ Test the application

