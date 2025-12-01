'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { formatCurrency } from '@/lib/utils'

interface BookingFormProps {
    topper: {
        id: string
        full_name: string
        cgpa: number | null
        bio: string | null
    }
}

export function BookingForm({ topper }: BookingFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        scheduledAt: '',
        durationMinutes: 60,
        sessionType: 'tutoring',
        notes: ''
    })

    const price = Math.round((formData.durationMinutes / 30) * 50)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/bookings/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topperId: topper.id,
                    ...formData,
                    scheduledAt: new Date(formData.scheduledAt).toISOString(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create booking')
            }

            // Redirect to booking details page which will show the meeting link
            router.push(`/book/${data.booking.id}`)
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Calculate min date (tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const minDate = tomorrow.toISOString().slice(0, 16)

    return (
        <Card className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Book a Session</h1>
                <p className="text-gray-600">
                    with <span className="font-semibold">{topper.full_name}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Session Type
                    </label>
                    <select
                        value={formData.sessionType}
                        onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="tutoring">1:1 Tutoring</option>
                        <option value="consultation">Consultation</option>
                        <option value="mock-interview">Mock Interview</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date & Time
                    </label>
                    <input
                        type="datetime-local"
                        min={minDate}
                        value={formData.scheduledAt}
                        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration
                    </label>
                    <select
                        value={formData.durationMinutes}
                        onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value={30}>30 Minutes ({formatCurrency(50)})</option>
                        <option value={60}>60 Minutes ({formatCurrency(100)})</option>
                        <option value={90}>90 Minutes ({formatCurrency(150)})</option>
                        <option value={120}>120 Minutes ({formatCurrency(200)})</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (Optional)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="What would you like to discuss?"
                    />
                </div>

                <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold text-gray-700">Total Price</span>
                        <span className="text-xl font-bold text-blue-600">{formatCurrency(price)}</span>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                    <p className="text-xs text-center text-gray-500 mt-2">
                        You will receive a meeting link immediately after booking.
                    </p>
                </div>
            </form>
        </Card>
    )
}
