# Local Development Setup

Follow these steps to set up Neighbour Link locally for development.

## Prerequisites

- Node.js 18+ and npm
- Git
- Code editor (VS Code recommended)

## Step 1: Clone and Install

```bash
# Navigate to project directory
cd "path/to/your/project"

# Install dependencies
npm install
```

## Step 2: Environment Variables

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication (get from clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (get from supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI (choose one)
GEMINI_API_KEY=your_gemini_api_key
# OR
OPENAI_API_KEY=your_openai_api_key

# Razorpay (get from razorpay.com - use test keys)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_test_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# Clerk Webhook (for local testing with ngrok)
WEBHOOK_SECRET=whsec_...
```

## Step 3: Set Up Supabase Database

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Run the SQL script
5. Copy your project URL and keys to `.env.local`

## Step 3.5: Set Up Supabase Storage (for Image Uploads)

1. In your Supabase project, go to **Storage** in the left sidebar
2. Click **Create a new bucket**
3. Name the bucket: `item-images`
4. Set bucket to **Public** (so images can be accessed via URL)
5. Click **Create bucket**
6. Go to **Policies** tab for the `item-images` bucket and create policies:
   
   **Option 1: Using Supabase Dashboard (Recommended)**
   - Click "New Policy" → "Create policy from scratch"
   - Policy name: "Allow authenticated uploads"
   - Allowed operations: INSERT
   - Target roles: authenticated
   - Policy definition: `bucket_id = 'item-images'`
   - Click "Save policy"
   
   **Option 2: Using SQL Editor**
   ```sql
   -- Allow authenticated users to upload images
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'item-images');

   -- Allow public read access
   CREATE POLICY "Allow public read"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'item-images');
   ```
   
   **Note:** The upload API uses the service role client (which bypasses RLS), so storage policies are primarily for public read access. Make sure the bucket is set to **Public**.

## Step 4: Set Up Clerk

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Enable Google OAuth in User & Authentication settings
3. Copy your keys to `.env.local`
4. For local webhook testing:
   - Install ngrok: `npm install -g ngrok`
   - Run: `ngrok http 3000`
   - Add the ngrok URL to Clerk webhooks: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`

## Step 5: Set Up Razorpay (Test Mode)

1. Create a Razorpay account
2. Get test API keys from Dashboard
3. Add to `.env.local`

## Step 6: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

1. **Sign Up**: Use Google OAuth or email
2. **Create Item**: Go to Dashboard > Share an Item
3. **Browse Marketplace**: View available items
4. **Test Payment**: Create a paid item and test checkout (use test cards)

## Project Structure

```
├── app/              # Next.js App Router
│   ├── api/         # API routes
│   ├── dashboard/   # Dashboard pages
│   └── ...
├── components/       # React components
│   ├── ui/          # UI components (shadcn)
│   └── ...
├── lib/             # Utility functions
│   ├── supabase/    # Supabase clients
│   ├── razorpay/    # Payment integration
│   └── ai/          # AI matching
├── types/           # TypeScript types
└── supabase/        # Database schema
```

## Common Issues

### Module not found errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### Clerk authentication issues
- Verify keys are correct
- Check middleware.ts is working
- Ensure webhook is configured

### Supabase connection errors
- Verify URL and keys
- Check RLS policies
- Test connection in Supabase dashboard

### Razorpay checkout not opening
- Verify Razorpay script is loaded
- Check browser console for errors
- Ensure API keys are correct

## Next Steps

- Review the codebase
- Customize UI components
- Add more features
- Deploy to production (see DEPLOYMENT.md)

