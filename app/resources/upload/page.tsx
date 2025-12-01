import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { ResourceUploader } from '@/components/ResourceUploader'

export default async function UploadResourcePage() {
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

  if (!userProfile || userProfile.role !== 'topper' || !userProfile.is_verified) {
    redirect('/topper/verify')
  }

  // Get subjects for dropdown
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Upload Resource</h1>
      <ResourceUploader subjects={subjects || []} />
    </div>
  )
}

