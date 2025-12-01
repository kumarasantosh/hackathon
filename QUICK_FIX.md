# Quick Fix for Database Schema Issues

## Problem
You're getting errors like:
- `Could not find the 'full_name' column of 'users' in the schema cache`
- `Could not find the 'cgpa' column of 'users' in the schema cache`

## Solution

### Step 1: Run the Fix Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/003_fix_users_table.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

### Step 2: Wait for Schema Cache Refresh

After running the migration:
- **Wait 10-15 seconds** for Supabase to refresh its schema cache
- The PostgREST API needs to refresh to recognize the new columns

### Step 3: Verify the Schema

Run this query to verify all columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;
```

You should see these columns:
- `id` (uuid)
- `clerk_id` (varchar)
- `email` (varchar)
- `full_name` (varchar)
- `role` (varchar)
- `is_verified` (boolean)
- `cgpa` (decimal)
- `transcript_url` (text)
- `bio` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Step 4: Run the Seed Script

Once the schema is fixed, run:

```bash
npm run db:seed
```

## Alternative: Complete Database Reset

If you don't have important data and want a fresh start:

### Option A: Using Supabase Dashboard

1. Go to **SQL Editor**
2. Run `supabase/migrations/001_initial_schema.sql` (creates all tables)
3. Run `supabase/migrations/002_seed_data.sql` (adds subjects)
4. Wait 10-15 seconds
5. Run `npm run db:seed`

### Option B: Drop and Recreate (⚠️ Deletes all data)

```sql
-- ⚠️ WARNING: This will delete all data!
DROP TABLE IF EXISTS public.users CASCADE;

-- Then run the full schema migration
-- Copy and run: supabase/migrations/001_initial_schema.sql
```

## Troubleshooting

### Still getting column errors after migration?

1. **Wait longer**: PostgREST cache can take 30-60 seconds to refresh
2. **Check Supabase status**: Go to Settings > API and verify your project is active
3. **Verify migration ran**: Check the SQL Editor history to confirm the migration executed
4. **Manual refresh**: Sometimes refreshing the Supabase dashboard helps

### Error: "relation already exists"

This is fine! The migration uses `IF NOT EXISTS` checks, so it's safe to run multiple times.

### Error: "column already exists"

This is also fine! The migration checks for column existence before adding.

## Verification Checklist

After running the fix:

- [ ] Migration ran without errors
- [ ] Waited 10-15 seconds for cache refresh
- [ ] Verified columns exist using the verification query
- [ ] Ran `npm run db:seed` successfully
- [ ] Checked Supabase Dashboard to see seeded data

## Still Having Issues?

1. Check your Supabase project is active and not paused
2. Verify you're using the correct project (check URL)
3. Make sure you have the correct API keys in `.env.local`
4. Try running the migration again (it's idempotent)

## Next Steps

After fixing the schema:
1. ✅ Run migration 003
2. ✅ Wait for cache refresh
3. ✅ Verify schema
4. ✅ Run seed script
5. ✅ Test your application

