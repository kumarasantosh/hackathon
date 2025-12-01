import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { CreateStudyGroup } from '@/components/CreateStudyGroup'

export default async function CreateGroupPage() {
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

  // Get subjects for dropdown
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name')

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-black mb-2">Create Study Group</h1>
        <p className="text-gray-600">Create a new study group and get a shareable join link</p>
      </div>
      
      <CreateStudyGroup subjects={subjects || []} />
    </div>
  )
}

