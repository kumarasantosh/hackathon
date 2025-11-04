# 🚀 Quick Start Guide

Get Neighbour Link running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create `.env.local`

Copy this template and fill in your API keys:

```env
# Clerk (get from clerk.com - free tier available)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (get from supabase.com - free tier available)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # IMPORTANT: Required for user creation

# AI (choose one)
GEMINI_API_KEY=your_key_here
# OR
OPENAI_API_KEY=your_key_here

# Razorpay (get from razorpay.com - test mode available)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# Email (optional - for notifications)
RESEND_API_KEY=re_...  # Get from resend.com
EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change for production
```

## Step 3: Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) → Create project
2. Open SQL Editor
3. Copy contents of `supabase/schema.sql`
4. Paste and run in SQL Editor

## Step 4: Set Up Clerk

1. Go to [clerk.com](https://clerk.com) → Create application
2. Enable Google OAuth (optional but recommended)
3. Copy keys to `.env.local`

## Step 5: Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## Testing the Flow

1. **Sign Up**: Click "Get Started" → Use Google OAuth or email
2. **Create Item**: Dashboard → "Share an Item"
3. **Browse**: Go to Marketplace
4. **Search**: Use the search bar (AI-powered!)
5. **Pay** (optional): Create a paid item and test checkout

## Need Help?

- See `SETUP.md` for detailed setup instructions
- See `DEPLOYMENT.md` for production deployment
- See `PROJECT_SUMMARY.md` for feature overview

## Quick Fixes

**"Module not found" error?**
```bash
rm -rf node_modules .next
npm install
```

**Database connection error?**
- Verify Supabase URL and keys
- Check if schema was run successfully

**Authentication not working?**
- Verify Clerk keys
- Check middleware.ts is in place

**Payment not opening?**
- Verify Razorpay keys
- Check browser console for errors

---

That's it! You're ready to build your hyperlocal community! 🏘️

