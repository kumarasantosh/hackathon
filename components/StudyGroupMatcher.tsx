'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

interface StudyGroupMatcherProps {
  userProfile: UserProfile
}

export function StudyGroupMatcher({ userProfile }: StudyGroupMatcherProps) {
  const [preferences, setPreferences] = useState({
    subjects: [] as string[],
    topics: [] as string[],
    preferredTimes: [] as string[],
    studyPace: 'moderate',
    meetingType: 'virtual',
  })
  const [matching, setMatching] = useState(false)
  const [matches, setMatches] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleMatch = async () => {
    setMatching(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/match-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find matches')
      }

      setMatches(data.matches || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-black">Find Study Groups</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Subjects (comma-separated)</label>
          <input
            type="text"
            value={preferences.subjects.join(', ')}
            onChange={(e) => setPreferences({
              ...preferences,
              subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="e.g., Data Structures, Algorithms"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Topics (comma-separated)</label>
          <input
            type="text"
            value={preferences.topics.join(', ')}
            onChange={(e) => setPreferences({
              ...preferences,
              topics: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="e.g., Binary Trees, Sorting"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Preferred Times (comma-separated)</label>
          <input
            type="text"
            value={preferences.preferredTimes.join(', ')}
            onChange={(e) => setPreferences({
              ...preferences,
              preferredTimes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="e.g., Morning, Evening, Weekend"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Study Pace</label>
            <select
              value={preferences.studyPace}
              onChange={(e) => setPreferences({ ...preferences, studyPace: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="slow">Slow</option>
              <option value="moderate">Moderate</option>
              <option value="fast">Fast</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Meeting Type</label>
            <select
              value={preferences.meetingType}
              onChange={(e) => setPreferences({ ...preferences, meetingType: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="virtual">Virtual</option>
              <option value="physical">Physical</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        <Button onClick={handleMatch} disabled={matching}>
          {matching ? 'Finding Matches...' : 'Find Study Groups'}
        </Button>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {matches.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">Matched Groups</h3>
            {matches.map((match) => (
              <div key={match.groupId} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Match Score: {(match.matchScore * 100).toFixed(0)}%</p>
                    <p className="text-sm text-gray-600">{match.reason}</p>
                    <p className="text-sm text-gray-600">Best Time: {match.bestMeetingTime}</p>
                    <p className="text-sm text-gray-600">
                      {match.groupSize} members, {match.availableSpots} spots available
                    </p>
                  </div>
                  <Button size="sm">Join Group</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

