# UNIVO+ - Verified Topper Tutoring & Smart Study Group Matching

A comprehensive platform connecting verified toppers (9+ CGPA) with students for affordable tutoring and study resources, powered by AI-driven study group matching.

## 🚀 Features

### Core Features
- ✅ **Verified Topper Tutors:** Only students with ≥9 CGPA can become verified tutors
- ✅ **Resource Sharing:** Toppers can upload notes, solved questions, and study materials
- ✅ **Micro-Tutoring Sessions:** Book 30-60 minute sessions at affordable prices (₹30-₹100)
- ✅ **AI-Powered Study Group Matching:** Match students based on subjects, topics, and schedule
- ✅ **Reusable Question Bank:** Upload and search repeated exam questions
- ✅ **AI-Generated Content:** 
  - Quiz generation from resources
  - Flashcard creation
  - Summary generation (6-8 bullet points)
  - Top 5 exam questions with model answers

### Technology Stack
- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Server Actions
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Authentication:** Clerk
- **AI:** Google Gemini API
- **Testing:** Jest, React Testing Library

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Clerk account and application
- Google Gemini API key

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd design

# Install dependencies
npm install
# or
yarn install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Setup

#### Create Supabase Project
1. Go to [Supabase](https://supabase.com) and create a new project
2. Copy your project URL and anon key from Project Settings > API
3. Copy your service role key from Project Settings > API (keep this secret!)

#### Run Migrations
1. In Supabase Dashboard, go to SQL Editor
2. Run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Run the seed data file: `supabase/migrations/002_seed_data.sql`

#### Create Storage Buckets
1. Go to Storage in Supabase Dashboard
2. Create buckets:
   - `resources` (public or authenticated)
   - `transcripts` (authenticated)

#### Enable Row Level Security (RLS)
1. In Supabase Dashboard, go to Authentication > Policies
2. Enable RLS on all tables (as mentioned in the migration file comments)
3. Configure policies based on your security requirements

### 4. Clerk Setup

1. Go to [Clerk](https://clerk.com) and create an application
2. Copy your publishable key and secret key
3. Configure sign-in/sign-up URLs:
   - Sign-in URL: `http://localhost:3000/sign-in`
   - Sign-up URL: `http://localhost:3000/sign-up`
   - After sign-in URL: `http://localhost:3000/dashboard`
   - After sign-up URL: `http://localhost:3000/dashboard`

### 5. Google Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add it to your `.env.local` file

### 6. Seed Database (Optional)

```bash
# Run the seed script to populate with sample data
npm run db:seed
# or
tsx scripts/seed.ts
```

### 7. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
design/
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes
│   │   ├── resources/        # Resource upload/download
│   │   ├── bookings/         # Booking management
│   │   ├── toppers/          # Topper verification
│   │   └── ai/               # AI endpoints
│   ├── dashboard/            # User dashboard
│   ├── topper/               # Topper pages
│   ├── resource/             # Resource pages
│   ├── book/                 # Booking pages
│   ├── groups/               # Study groups
│   └── admin/                # Admin dashboard
├── components/               # React components
│   ├── ui/                   # UI components (Button, Card)
│   ├── ResourceCard.tsx
│   ├── ResourceUploader.tsx
│   ├── BookingModal.tsx
│   ├── StudyGroupMatcher.tsx
│   └── ...
├── lib/                      # Utility libraries
│   ├── supabase/             # Supabase client setup
│   ├── gemini.ts             # Gemini AI integration
│   └── utils.ts              # Utility functions
├── types/                    # TypeScript types
│   └── database.ts           # Database types
├── supabase/                 # Supabase migrations
│   └── migrations/
├── scripts/                  # Scripts
│   └── seed.ts               # Database seed script
├── __tests__/                # Unit tests
└── public/                   # Static assets
```

## 🔐 Authentication & Authorization

### User Roles
- **Student:** Default role for all users
- **Topper:** Verified users with 9+ CGPA
- **Admin:** Platform administrators

### Topper Verification Flow
1. User requests to become a topper
2. Uploads transcript and enters CGPA
3. If CGPA ≥ 9.0: Auto-verified
4. If CGPA < 9.0: Requires admin approval

## 📡 API Routes

### Resources
- `POST /api/resources/upload` - Upload a new resource
- `POST /api/resources/download` - Download a resource

### Bookings
- `POST /api/bookings/create` - Create a new booking
- `PATCH /api/bookings/create` - Confirm payment

### Toppers
- `POST /api/toppers/verify` - Verify topper status
- `PATCH /api/toppers/verify` - Admin approval

### AI Endpoints
- `POST /api/ai/generate-quiz` - Generate quiz from resource
- `POST /api/ai/generate-summary` - Generate summary
- `POST /api/ai/generate-exam-questions` - Generate exam questions
- `POST /api/ai/match-groups` - Match study groups

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚢 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production
Make sure to add all environment variables in your deployment platform:
- Supabase credentials
- Clerk credentials
- Gemini API key

## 📝 Database Schema

### Key Tables
- `users` - User profiles and roles
- `resources` - Study resources uploaded by toppers
- `bookings` - Tutoring session bookings
- `study_groups` - Study groups
- `question_bank` - Repeated exam questions
- `ai_generated_content` - AI-generated content cache
- `reviews` - Resource and topper reviews

See `supabase/migrations/001_initial_schema.sql` for full schema.

## 🔧 Development Notes

### Server Components
- Data fetching is done in server components where possible
- Use `createClient()` from `lib/supabase/server` for server-side operations

### Client Components
- Mark components with `'use client'` directive when using hooks or browser APIs
- Use `createClient()` from `lib/supabase/client` for client-side operations

### AI Integration
- All AI calls are server-side for security
- Responses are cached in the database
- Use prompt templates from `lib/gemini.ts`

### File Uploads
- Files are uploaded to Supabase Storage
- Signed URLs are used for downloads
- File validation is done on both client and server

## 🐛 Troubleshooting

### Common Issues

1. **Supabase Connection Error**
   - Check your environment variables
   - Verify Supabase project is active
   - Check network connectivity

2. **Clerk Authentication Error**
   - Verify Clerk keys are correct
   - Check sign-in/sign-up URLs configuration
   - Ensure middleware is properly configured

3. **Gemini API Error**
   - Verify API key is correct
   - Check API quota limits
   - Review error logs for specific issues

4. **Storage Upload Error**
   - Verify storage buckets exist
   - Check bucket permissions
   - Verify file size limits

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For support, email support@UNIVOplus.com or create an issue in the repository.

---

**Built with ❤️ for students and toppers**
