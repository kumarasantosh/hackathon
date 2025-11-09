import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { StudyGroupMatcher } from '@/components/StudyGroupMatcher'
import { StudyGroupCard } from '@/components/StudyGroupCard'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function GroupsPage() {
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

  // Fetch active study groups
  const { data: studyGroups } = await supabase
    .from('study_groups')
    .select(`
      *,
      subjects (*),
      creator:created_by (
        full_name
      ),
      members:study_group_members (
        user_id
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Get user's joined groups
  const { data: userGroups } = await supabase
    .from('study_group_members')
    .select('group_id')
    .eq('user_id', userProfile.id)

  const joinedGroupIds = new Set(userGroups?.map(g => g.group_id) || [])

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-black mb-2">Study Groups</h1>
          <p className="text-gray-600">Find and join study groups that match your learning preferences</p>
        </div>
        <Link href="/groups/create">
          <Button className="bg-black text-white hover:bg-gray-800">
            Create Group
          </Button>
        </Link>
      </div>
      
      <StudyGroupMatcher userProfile={userProfile} />

      <div className="mt-12">
        <h2 className="text-3xl font-bold mb-8 text-black">Available Study Groups</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {studyGroups?.map((group) => (
            <StudyGroupCard 
              key={group.id} 
              group={group} 
              isJoined={joinedGroupIds.has(group.id)}
              userId={userProfile.id}
              isCreator={group.created_by === userProfile.id}
            />
          ))}
        </div>
        {studyGroups?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No study groups available yet</p>
            <p className="text-gray-400 text-sm mt-2">Create your own study group to get started</p>
            <Link href="/groups/create" className="mt-4 inline-block">
              <Button className="bg-black text-white hover:bg-gray-800">
                Create Study Group
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

