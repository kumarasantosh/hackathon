'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import type { Database } from '@/types/database'

type Subject = Database['public']['Tables']['subjects']['Row']

interface CreateStudyGroupProps {
  subjects: Subject[]
}

export function CreateStudyGroup({ subjects }: CreateStudyGroupProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subjectId: '',
    topic: '',
    maxMembers: 10,
    meetingType: 'virtual' as 'virtual' | 'physical' | 'both',
    meetingLocation: '',
    meetingLink: '',
    preferredTimeSlots: [] as string[],
  })
  const [timeSlotInput, setTimeSlotInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ joinLink: string; joinCode: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          subjectId: formData.subjectId || null,
          preferredTimeSlots: formData.preferredTimeSlots.length > 0 ? formData.preferredTimeSlots : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create study group')
      }

      setSuccess({
        joinLink: data.joinLink,
        joinCode: data.joinCode,
      })

      // Reset form
      setFormData({
        name: '',
        description: '',
        subjectId: '',
        topic: '',
        maxMembers: 10,
        meetingType: 'virtual',
        meetingLocation: '',
        meetingLink: '',
        preferredTimeSlots: [],
      })
      setTimeSlotInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const addTimeSlot = () => {
    if (timeSlotInput.trim() && !formData.preferredTimeSlots.includes(timeSlotInput.trim())) {
      setFormData({
        ...formData,
        preferredTimeSlots: [...formData.preferredTimeSlots, timeSlotInput.trim()],
      })
      setTimeSlotInput('')
    }
  }

  const removeTimeSlot = (slot: string) => {
    setFormData({
      ...formData,
      preferredTimeSlots: formData.preferredTimeSlots.filter(s => s !== slot),
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-black">Create Study Group</h2>
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Group Created Successfully!</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-green-700 font-medium">Join Code:</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-green-100 px-3 py-1 rounded text-lg font-mono text-green-800">
                  {success.joinCode}
                </code>
                <button
                  onClick={() => copyToClipboard(success.joinCode)}
                  className="text-sm text-green-700 hover:text-green-800 underline"
                >
                  Copy
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Join Link:</p>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={success.joinLink}
                  className="flex-1 px-3 py-1 border border-green-200 rounded text-sm bg-green-50 text-green-800"
                />
                <button
                  onClick={() => copyToClipboard(success.joinLink)}
                  className="text-sm text-green-700 hover:text-green-800 underline"
                >
                  Copy Link
                </button>
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">
              Share this link or code with others to invite them to join your group!
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Group Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="e.g., Data Structures Study Group"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Describe your study group..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Subject
            </label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Select a subject (optional)</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Topic
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g., Binary Trees, Sorting Algorithms"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Max Members *
            </label>
            <input
              type="number"
              required
              min="2"
              max="50"
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 10 })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Meeting Type *
            </label>
            <select
              required
              value={formData.meetingType}
              onChange={(e) => setFormData({ ...formData, meetingType: e.target.value as 'virtual' | 'physical' | 'both' })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="virtual">Virtual</option>
              <option value="physical">Physical</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        {(formData.meetingType === 'virtual' || formData.meetingType === 'both') && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Meeting Link (Zoom, Google Meet, etc.)
            </label>
            <input
              type="url"
              value={formData.meetingLink}
              onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
            />
            <p className="text-xs text-gray-500 mt-1">Add the meeting link for virtual study sessions</p>
          </div>
        )}

        {(formData.meetingType === 'physical' || formData.meetingType === 'both') && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Meeting Location
            </label>
            <input
              type="text"
              value={formData.meetingLocation}
              onChange={(e) => setFormData({ ...formData, meetingLocation: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g., Library Room 201, Coffee Shop Name"
            />
            <p className="text-xs text-gray-500 mt-1">Add the physical location for in-person meetings</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Preferred Time Slots
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={timeSlotInput}
              onChange={(e) => setTimeSlotInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTimeSlot()
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g., Monday 6-8 PM, Weekend mornings"
            />
            <Button type="button" onClick={addTimeSlot} size="sm">
              Add
            </Button>
          </div>
          {formData.preferredTimeSlots.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.preferredTimeSlots.map((slot) => (
                <span
                  key={slot}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {slot}
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(slot)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating Group...' : 'Create Study Group'}
        </Button>
      </form>
    </div>
  )
}

