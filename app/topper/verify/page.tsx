import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { TopperVerificationForm } from '@/components/TopperVerificationForm'

export default async function TopperVerificationPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  const supabase = await createClient()

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', user.id)
    .single()

  if (!userProfile) {
    redirect('/dashboard')
  }

  // If already verified, redirect to dashboard
  if (userProfile.is_verified && userProfile.role === 'topper') {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Become a Verified Topper</h1>
      <p className="text-gray-600 mb-8">
        To become a verified topper on UNIVO+, you need to have a CGPA of 9.0 or higher.
        Upload your transcript and enter your CGPA for verification.
      </p>
      <TopperVerificationForm userProfile={userProfile} />
    </div>
  )
}

