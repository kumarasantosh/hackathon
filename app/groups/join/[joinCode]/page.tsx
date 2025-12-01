'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import type { Database } from '@/types/database'

type StudyGroup = Database['public']['Tables']['study_groups']['Row'] & {
  subjects?: Database['public']['Tables']['subjects']['Row']
  creator?: Database['public']['Tables']['users']['Row']
  members?: Array<{ user_id: string }>
}

export default function JoinGroupPage() {
  const params = useParams()
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const joinCode = params.joinCode as string
  
  const [group, setGroup] = useState<StudyGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isAlreadyMember, setIsAlreadyMember] = useState(false)

  useEffect(() => {
    if (joinCode && isLoaded) {
      fetchGroup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode, isLoaded])

  const fetchGroup = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/groups/join?joinCode=${encodeURIComponent(joinCode.toUpperCase())}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch group')
      }

      setGroup(data.group)
      setIsAlreadyMember(data.isAlreadyMember || false)
    } catch (err) {
      console.error('Error fetching group:', err)
      setError(err instanceof Error ? err.message : 'Failed to load group')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!isSignedIn) {
      router.push('/sign-in?redirect=' + encodeURIComponent(`/groups/join/${joinCode}`))
      return
    }

    try {
      setJoining(true)
      setError(null)

      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ joinCode: joinCode.toUpperCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/sign-in?redirect=' + encodeURIComponent(`/groups/join/${joinCode}`))
          return
        }
        throw new Error(data.error || 'Failed to join group')
      }

      setSuccess(true)
      // Redirect to groups page after a short delay
      setTimeout(() => {
        router.push('/groups')
      }, 2000)
    } catch (err) {
      console.error('Error joining group:', err)
      setError(err instanceof Error ? err.message : 'Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading group details...</p>
        </div>
      </div>
    )
  }

  if (error && !group) {
    return (
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-black mb-4">Group Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/groups">
              <Button>Back to Groups</Button>
            </Link>
            <Link href="/groups/create">
              <Button variant="outline">Create Group</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!group) {
    return null
  }

  const memberCount = group.members?.length || 0
  const availableSpots = Math.max(0, group.max_members - memberCount)

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
      <div className="mb-8">
        <Link href="/groups" className="text-sm text-gray-600 hover:text-black mb-4 inline-block">
          ← Back to Groups
        </Link>
        <h1 className="text-4xl font-bold text-black mb-2">Join Study Group</h1>
        <p className="text-gray-600">Review the group details and join if interested</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Successfully Joined!</h3>
          <p className="text-sm text-green-700">You are now a member of this study group. Redirecting...</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-black mb-2">{group.name}</h2>
            {group.description && (
              <p className="text-gray-600 leading-relaxed">{group.description}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Subject</h3>
              <p className="text-gray-900">
                {group.subjects?.name || 'Not specified'}
              </p>
            </div>

            {group.topic && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Topic</h3>
                <p className="text-gray-900">{group.topic}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Meeting Type</h3>
              <p className="text-gray-900 capitalize">{group.meeting_type}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Members</h3>
              <p className="text-gray-900">
                {memberCount}/{group.max_members} members
                {availableSpots > 0 && (
                  <span className="text-green-600 ml-2">({availableSpots} spots available)</span>
                )}
                {availableSpots === 0 && (
                  <span className="text-red-600 ml-2">(Full)</span>
                )}
              </p>
            </div>

            {group.meeting_location && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Location</h3>
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

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Created By</h3>
              <p className="text-gray-900">
                {group.creator?.full_name || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex gap-4 flex-wrap">
            {isAlreadyMember && (
              <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg mb-2">
                <p className="text-green-800 font-semibold mb-2">You are already a member of this group!</p>
                <Link href="/groups">
                  <Button className="bg-black text-white hover:bg-gray-800">View My Groups</Button>
                </Link>
              </div>
            )}
            {!isAlreadyMember && !isSignedIn && (
              <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                <p className="text-blue-800 mb-2">Please sign in to join this study group</p>
                <Link href={`/sign-in?redirect=${encodeURIComponent(`/groups/join/${joinCode}`)}`}>
                  <Button className="bg-black text-white hover:bg-gray-800">Sign In to Join</Button>
                </Link>
              </div>
            )}
            {!isAlreadyMember && isSignedIn && availableSpots > 0 && !success && (
              <Button
                onClick={handleJoin}
                disabled={joining}
                className="bg-black text-white hover:bg-gray-800"
              >
                {joining ? 'Joining...' : 'Join Group'}
              </Button>
            )}
            {!isAlreadyMember && availableSpots === 0 && (
              <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">This group is full. Please look for another group.</p>
              </div>
            )}
            {!isAlreadyMember && success && (
              <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">Successfully joined! Redirecting...</p>
              </div>
            )}
            <Link href="/groups">
              <Button variant="outline">Back to Groups</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

