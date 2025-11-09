import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/CopyButton'
import { JoinCodeDisplay } from '@/components/JoinCodeDisplay'
import type { Database } from '@/types/database'

type StudyGroup = Database['public']['Tables']['study_groups']['Row'] & {
  subjects?: Database['public']['Tables']['subjects']['Row']
  creator?: Database['public']['Tables']['users']['Row']
  members?: Array<{ user_id: string }>
}

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
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

  // Fetch group details
  const { data: group, error: groupError } = await supabase
    .from('study_groups')
    .select(`
      *,
      subjects (*),
      creator:created_by (
        id,
        full_name,
        email
      ),
      members:study_group_members (
        user_id,
        role,
        joined_at
      )
    `)
    .eq('id', params.id)
    .eq('is_active', true)
    .single()

  // Fetch member details separately
  let membersWithDetails: any[] = []
  if (group && group.members) {
    const memberUserIds = group.members.map((m: any) => m.user_id)
    if (memberUserIds.length > 0) {
      const { data: memberUsers } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', memberUserIds)

      if (memberUsers) {
        membersWithDetails = group.members.map((member: any) => ({
          ...member,
          user: memberUsers.find((u) => u.id === member.user_id),
        }))
      }
    }
  }

  if (groupError || !group) {
    return (
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-black mb-4">Group Not Found</h1>
          <p className="text-gray-600 mb-6">The study group you're looking for doesn't exist or is no longer active.</p>
          <Link href="/groups">
            <Button>Back to Groups</Button>
          </Link>
        </div>
      </div>
    )
  }

  const memberCount = group.members?.length || 0
  const availableSpots = Math.max(0, group.max_members - memberCount)
  const isCreator = group.created_by === userProfile.id
  const isMember = group.members?.some((m: any) => m.user_id === userProfile.id) || false

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
      <div className="mb-8">
        <Link href="/groups" className="text-sm text-gray-600 hover:text-black mb-4 inline-block">
          ← Back to Groups
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">{group.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {group.subjects && (
                <span className="bg-gray-100 px-3 py-1 rounded-full">{group.subjects.name}</span>
              )}
              {isCreator && (
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                  Creator
                </span>
              )}
              {isMember && !isCreator && (
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                  Member
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white border border-gray-100 rounded-lg p-6">
            <h2 className="text-xl font-bold text-black mb-4">About This Group</h2>
            {group.description ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{group.description}</p>
            ) : (
              <p className="text-gray-500 italic">No description provided.</p>
            )}
          </div>

          {/* Meeting Information */}
          <div className="bg-white border border-gray-100 rounded-lg p-6">
            <h2 className="text-xl font-bold text-black mb-4">Meeting Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Meeting Type</h3>
                <p className="text-gray-900 capitalize">{group.meeting_type}</p>
              </div>

              {group.meeting_link && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Meeting Link</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={group.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all flex-1 min-w-0"
                    >
                      {group.meeting_link}
                    </a>
                    <CopyButton text={group.meeting_link} label="Copy Link" />
                  </div>
                  <a
                    href={group.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3"
                  >
                    <Button className="bg-blue-600 text-white hover:bg-blue-700">
                      Join Meeting
                    </Button>
                  </a>
                </div>
              )}

              {group.meeting_location && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Meeting Location</h3>
                  <p className="text-gray-900">{group.meeting_location}</p>
                </div>
              )}

              {group.preferred_time_slots && group.preferred_time_slots.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Preferred Times</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.preferred_time_slots.map((slot, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="bg-white border border-gray-100 rounded-lg p-6">
            <h2 className="text-xl font-bold text-black mb-4">
              Members ({memberCount}/{group.max_members})
            </h2>
            <div className="space-y-3">
              {membersWithDetails && membersWithDetails.length > 0 ? (
                membersWithDetails.map((member: any) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {member.role === 'leader' ? 'Group Leader' : 'Member'}
                      </p>
                    </div>
                    {member.user_id === userProfile.id && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        You
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No members yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Group Info Card */}
          <div className="bg-white border border-gray-100 rounded-lg p-6 sticky top-4">
            <h3 className="text-lg font-bold text-black mb-4">Group Details</h3>
            <div className="space-y-4">
              {group.topic && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Topic</p>
                  <p className="text-gray-900">{group.topic}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Members</p>
                <p className="text-gray-900">
                  {memberCount}/{group.max_members}
                  {availableSpots > 0 && (
                    <span className="text-green-600 ml-2">({availableSpots} spots available)</span>
                  )}
                  {availableSpots === 0 && (
                    <span className="text-red-600 ml-2">(Full)</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Created By</p>
                <p className="text-gray-900">{group.creator?.full_name || 'Unknown'}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Created</p>
                <p className="text-gray-900">
                  {new Date(group.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {group.join_code && isCreator && (
                <JoinCodeDisplay joinCode={group.join_code} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

