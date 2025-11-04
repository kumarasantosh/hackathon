# Troubleshooting Guide

## Requests Not Showing Up

If requests are created but not visible in the dashboard:

### 1. Check Database Tables

Make sure you've run the database schema. The `requests` and `notifications` tables need to exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('requests', 'notifications');
```

If tables don't exist, run:
- `supabase/schema.sql` (full schema)
- OR `supabase/migrations_requests_notifications.sql` (just requests & notifications)

### 2. Verify Request Creation

Check if requests are being created:
```sql
SELECT * FROM requests ORDER BY created_at DESC LIMIT 5;
```

### 3. Check RLS Policies

The requests table uses Row Level Security. If you're having issues, you can temporarily disable RLS for testing:

```sql
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable after testing
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
```

### 4. Service Role Key

Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`. The app uses this to bypass RLS for authenticated users.

## Common Issues

### "Cannot access 'request' before initialization"
- Fixed: Variable name conflict resolved

### Requests created but not visible
- Fixed: Using service role client to bypass RLS

### Approve/Reject buttons not showing
- Make sure you're viewing the "Received" tab
- Check that request status is "pending"
- Verify you're logged in as the item owner

## Testing the Flow

1. **User A**: Create a free item
2. **User B**: Click "Request Item" on User A's item
3. **User A**: Go to `/dashboard/requests?type=received`
4. **User A**: Should see the request with Approve/Reject buttons
5. **User A**: Click Approve or Reject
6. **User B**: Should see updated status in `/dashboard/requests?type=sent`

## Debug Steps

1. Check browser console for errors
2. Check server logs for database errors
3. Verify SUPABASE_SERVICE_ROLE_KEY is set
4. Run the migration SQL if tables are missing
5. Test with service role client directly in Supabase dashboard

