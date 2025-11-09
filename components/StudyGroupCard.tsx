'use client'

import Link from 'next/link'
import { Button } from './ui/Button'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type StudyGroup = Database['public']['Tables']['study_groups']['Row'] & {
  subjects?: Database['public']['Tables']['subjects']['Row']
  creator?: Database['public']['Tables']['users']['Row']
  members?: Array<{ user_id: string }>
}

interface StudyGroupCardProps {
  group: StudyGroup
  isJoined: boolean
  userId: string
  isCreator?: boolean
}

export function StudyGroupCard({ group, isJoined, userId, isCreator = false }: StudyGroupCardProps) {
  const router = useRouter()
  const memberCount = group.members?.length || 0
  const availableSpots = Math.max(0, group.max_members - memberCount)
  const [showJoinLink, setShowJoinLink] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  
  const joinLink = group.join_code 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/groups/join/${group.join_code}`
    : null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const handleDirectJoin = async () => {
    if (isJoined || joining) return
    
    try {
      setJoining(true)
      setJoinError(null)

      const response = await fetch(`/api/groups/${group.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join group')
      }

      // Refresh the page to update the UI
      router.refresh()
    } catch (err) {
      console.error('Error joining group:', err)
      setJoinError(err instanceof Error ? err.message : 'Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6 hover:shadow-lg hover:border-gray-200 transition-all">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-black">{group.name}</h3>
          <div className="flex items-center gap-2">
            {isCreator && (
              <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-semibold border border-purple-200">
                Creator
              </span>
            )}
            {isJoined && !isCreator && (
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-semibold border border-green-200">
                Joined
              </span>
            )}
          </div>
        </div>
        
        {group.description && (
          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{group.description}</p>
        )}
        
        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
          {group.subjects && (
            <span className="bg-gray-100 px-2 py-1 rounded text-xs">{group.subjects.name}</span>
          )}
          {group.topic && (
            <span className="text-gray-600">Topic: {group.topic}</span>
          )}
          <span className="text-gray-700 font-medium">{memberCount}/{group.max_members} members</span>
        </div>
        
        {group.preferred_time_slots && group.preferred_time_slots.length > 0 && (
          <div className="text-sm text-gray-600 pt-2 border-t border-gray-100">
            <span className="font-medium text-gray-700">Preferred Times: </span>
            {group.preferred_time_slots.join(', ')}
          </div>
        )}

        {isCreator && group.join_code && (
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowJoinLink(!showJoinLink)}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              {showJoinLink ? 'Hide' : 'Show'} Join Link
            </button>
            {showJoinLink && joinLink && (
              <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-purple-700 mb-1">Join Code:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-2 py-1 rounded text-sm font-mono text-purple-800 border border-purple-200">
                        {group.join_code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(group.join_code!)}
                        className="text-xs text-purple-700 hover:text-purple-800 underline"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-purple-700 mb-1">Join Link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={joinLink}
                        className="flex-1 px-2 py-1 text-xs border border-purple-200 rounded bg-white text-purple-800"
                      />
                      <button
                        onClick={() => copyToClipboard(joinLink)}
                        className="text-xs text-purple-700 hover:text-purple-800 underline"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {joinError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {joinError}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            Created by {group.creator?.full_name || 'Unknown'}
          </span>
          <div className="flex gap-2">
            {!isJoined && availableSpots > 0 && group.join_code && (
              <Link href={`/groups/join/${group.join_code}`}>
                <Button size="sm" className="bg-black text-white hover:bg-gray-800">Join Group</Button>
              </Link>
            )}
            {!isJoined && availableSpots > 0 && !group.join_code && (
              <Button 
                size="sm" 
                className="bg-black text-white hover:bg-gray-800" 
                onClick={handleDirectJoin}
                disabled={joining}
              >
                {joining ? 'Joining...' : 'Join Group'}
              </Button>
            )}
            {availableSpots === 0 && !isJoined && (
              <Button size="sm" className="bg-gray-300 text-gray-500 cursor-not-allowed" disabled>
                Group Full
              </Button>
            )}
            {isJoined && (
              <Link href={`/groups/${group.id}`}>
                <Button variant="outline" size="sm">View Group</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

