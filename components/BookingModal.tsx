'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import { formatCurrency } from '@/lib/utils'

interface BookingModalProps {
  topperId: string
  topperName: string
  resourceId?: string
  onClose: () => void
  onSuccess?: () => void
}

export function BookingModal({ topperId, topperName, resourceId, onClose, onSuccess }: BookingModalProps) {
  const [formData, setFormData] = useState({
    durationMinutes: 30,
    scheduledAt: '',
    sessionType: 'tutoring',
  })
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const price = Math.round((formData.durationMinutes / 30) * 50) // ₹50 per 30 minutes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBooking(true)
    setError(null)

    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topperId,
          resourceId,
          durationMinutes: formData.durationMinutes,
          scheduledAt: formData.scheduledAt,
          sessionType: formData.sessionType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Book Session with {topperName}</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <select
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date & Time</label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Session Type</label>
            <select
              value={formData.sessionType}
              onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="tutoring">Tutoring</option>
              <option value="consultation">Consultation</option>
            </select>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Price:</span>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(price)}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={booking} className="flex-1">
              {booking ? 'Booking...' : 'Book Session'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

