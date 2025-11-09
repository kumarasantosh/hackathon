# Database Seeding Instructions

## Prerequisites

1. Make sure you have created a `.env.local` file in the root directory
2. Add your Supabase credentials to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

## Installation

Install dependencies (including dotenv for loading environment variables):

```bash
npm install
```

## Running the Seed Script

### Option 1: Using npm script (Recommended)

```bash
npm run db:seed
```

### Option 2: Using tsx directly

```bash
tsx scripts/seed.ts
```

## What Gets Seeded

The seed script will create:

- **15 Users:**
  - 5 verified toppers (CGPA 9.3-9.7)
  - 9 students
  - 1 admin user

- **15+ Resources:**
  - Across 6 different subjects
  - Mix of paid and free resources
  - With ratings and download counts

- **6 Bookings:**
  - Mix of pending, confirmed, and completed statuses
  - Different session types and durations

- **6 Resource Transactions:**
  - Downloads from multiple students
  - Paid and free resources

- **5 Reviews:**
  - Ratings and comments
  - Linked to resources and toppers

- **3 Study Groups:**
  - With members and preferred time slots
  - Different meeting types (virtual, physical, both)

- **3 Question Bank Entries:**
  - Questions with answers
  - Different difficulty levels

## Troubleshooting

### Error: Missing Supabase environment variables

**Solution:** Make sure your `.env.local` file exists and contains:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Error: Cannot connect to Supabase

**Solution:** 
1. Check your Supabase project is active
2. Verify your credentials are correct
3. Check your network connection

### Error: Permission denied

**Solution:** 
1. Make sure you're using the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key)
2. Check that Row Level Security (RLS) policies allow the service role to insert data

## Notes

- The seed script will skip creating users/resources that already exist (based on clerk_id for users)
- You can run the seed script multiple times safely
- Mock Clerk IDs are used for users (in production, you would sync with actual Clerk users)
- File URLs are placeholder URLs (replace with actual Supabase storage URLs in production)

## Next Steps

After seeding:
1. Verify data in Supabase dashboard
2. Test the application with the seeded data
3. Update file URLs to point to actual Supabase storage files
4. Replace mock Clerk IDs with actual user sync from Clerk

