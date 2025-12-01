'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

interface TopperVerificationFormProps {
  userProfile: UserProfile
}

export function TopperVerificationForm({ userProfile }: TopperVerificationFormProps) {
  const [formData, setFormData] = useState({
    cgpa: '',
    transcriptFile: null as File | null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      let transcriptBase64 = null
      if (formData.transcriptFile) {
        const reader = new FileReader()
        transcriptBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(formData.transcriptFile!)
        })
      }

      const response = await fetch('/api/toppers/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cgpa: parseFloat(formData.cgpa),
          transcriptFile: transcriptBase64,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify topper status')
      }

      setSuccess(true)
      if (data.requiresApproval) {
        setError('Your verification request has been submitted for admin review.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      {error && !success && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
          {error || 'You have been verified as a topper!'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">CGPA *</label>
          <input
            type="number"
            value={formData.cgpa}
            onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            min="0"
            max="10"
            step="0.01"
            required
            placeholder="Enter your CGPA (e.g., 9.5)"
          />
          <p className="text-sm text-gray-600 mt-1">
            You need a CGPA of 9.0 or higher to become a verified topper.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Transcript *</label>
          <input
            type="file"
            onChange={(e) => setFormData({ ...formData, transcriptFile: e.target.files?.[0] || null })}
            className="w-full px-4 py-2 border rounded-lg"
            required
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <p className="text-sm text-gray-600 mt-1">
            Upload a screenshot or PDF of your transcript showing your CGPA.
          </p>
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Verification'}
        </Button>
      </form>
    </Card>
  )
}

