# Neighbour Link – AI-Powered Hyperlocal Sharing & Support Platform

A trusted digital community platform enabling collaboration, sharing, renting, and social empowerment within neighborhoods.

## 🌍 Overview

Neighbour Link connects verified neighbors to share, rent, sell, volunteer, or connect safely within their community. Built with modern web technologies and AI-powered matching.

## 🚀 Features

- ✅ **AI-based matching** (skills ↔ needs ↔ proximity)
- ✅ **Verified trust model** (community + digital ID)
- ✅ **Secure payments** (Razorpay integration)
- ✅ **Inclusive design** (easy for elders and youth)
- ✅ **Community moderation & rewards**

## 🛠️ Tech Stack

**Frontend**
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui components
- Zustand / React Query for state
- React Hook Form + Zod for validation
- Razorpay Checkout Integration

**Backend / DB**
- Supabase (PostgreSQL + RLS + Realtime)
- Supabase Edge Functions for AI & Razorpay Webhooks
- Clerk for Auth (Google OAuth + email)

**AI Matching**
- Google Gemini API for embeddings
- Function: `aiMatch.ts` for matching "needs ↔ offers"

**Deployment**
- Frontend → Vercel
- Backend (Edge Functions) → Supabase platform

## 📦 Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd neighbour-link
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your environment variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` (or `OPENAI_API_KEY`)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

4. Set up the database:
```bash
# Run the schema SQL in your Supabase SQL editor
cat supabase/schema.sql
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🗂️ Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   └── ...
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase clients
│   ├── razorpay/         # Razorpay integration
│   └── ai/               # AI matching logic
├── types/                 # TypeScript types
├── supabase/             # Database schema
└── public/               # Static assets
```

## 🔐 Environment Variables

Create a `.env.local` file with:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI (Gemini or OpenAI)
GEMINI_API_KEY=your_gemini_api_key
# OR
OPENAI_API_KEY=your_openai_api_key

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_secret_key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

## 📝 Core Modules

### 1. User Module
- Google OAuth via Clerk
- Roles: `user`, `moderator`, `admin`
- Profile with trust_score and verified flag

### 2. Share / Rent / Sell Module
- Create items (free or paid)
- Marketplace feed
- Cart and checkout

### 3. Payment Integration (Razorpay)
- Checkout flow
- Order creation
- Webhook handling

### 4. AI Matching
- Semantic matching of needs ↔ offers
- Location-based filtering
- Skill-to-need matching

## 🚢 Deployment

### Vercel (Frontend)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Supabase (Backend)
1. Create project on Supabase
2. Run schema SQL
3. Set up Edge Functions (if needed)
4. Configure webhooks

## 📄 License

MIT

# hackathon
