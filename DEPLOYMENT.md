# Deployment Guide - Neighbour Link

This guide walks you through deploying Neighbour Link to production.

## Prerequisites

- GitHub account
- Vercel account (for frontend)
- Supabase account (for database)
- Clerk account (for authentication)
- Razorpay account (for payments)
- Google Gemini API key (for AI matching)

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready
3. Go to SQL Editor and run the contents of `supabase/schema.sql`
4. Copy your project URL and anon key from Settings > API

## Step 2: Set Up Clerk

1. Go to [clerk.com](https://clerk.com) and create a new application
2. Configure Google OAuth:
   - Go to User & Authentication > Social Connections
   - Enable Google OAuth
   - Add your Google OAuth credentials
3. Copy your publishable key and secret key
4. Set up webhooks:
   - Go to Webhooks in Clerk dashboard
   - Add endpoint: `https://your-domain.vercel.app/api/webhooks/clerk`
   - Copy the webhook signing secret

## Step 3: Set Up Razorpay

1. Go to [razorpay.com](https://razorpay.com) and create an account
2. Get your API keys from Settings > API Keys
3. Copy Key ID and Key Secret
4. For production, switch to Live keys

## Step 4: Get AI API Key

- **Option 1 (Gemini - Recommended):**
  1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
  2. Create a new API key
  3. Copy the key

- **Option 2 (OpenAI):**
  1. Go to [OpenAI Platform](https://platform.openai.com)
  2. Create a new API key
  3. Copy the key

## Step 5: Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in Vercel:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   WEBHOOK_SECRET=whsec_...
   
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   
   GEMINI_API_KEY=your_key
   
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=your_secret
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
   ```
4. Deploy!

## Step 6: Configure Webhooks

### Clerk Webhook
1. After deployment, update Clerk webhook URL to your Vercel domain
2. Test the webhook

### Razorpay Webhook
1. Go to Razorpay Dashboard > Settings > Webhooks
2. Add webhook URL: `https://your-domain.vercel.app/api/paymentWebhook`
3. Select events: `payment.captured`, `payment.failed`
4. Copy webhook secret (if provided)

## Step 7: Verify Setup

1. Visit your deployed site
2. Sign up with Google OAuth
3. Create a test item
4. Test payment flow (use Razorpay test mode first)

## Troubleshooting

### Database Issues
- Check Supabase RLS policies are correctly set
- Verify user creation webhook is working

### Payment Issues
- Verify Razorpay keys are correct
- Check webhook URL is accessible
- Test with Razorpay test mode first

### Auth Issues
- Verify Clerk keys match environment
- Check middleware.ts is correctly configured
- Verify webhook secret is correct

### AI Matching Issues
- Check API key is valid
- Verify you have API credits/quota
- Check console for API errors

