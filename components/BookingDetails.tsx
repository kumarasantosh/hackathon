import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import type { Database } from '@/types/database'

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  topper?: Database['public']['Tables']['users']['Row']
  student?: Database['public']['Tables']['users']['Row']
  resource?: Database['public']['Tables']['resources']['Row']
}

interface BookingDetailsProps {
  booking: Booking
  userRole: string
}

export function BookingDetails({ booking, userRole }: BookingDetailsProps) {
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed'
  const canComplete = userRole === 'topper' && booking.status === 'confirmed'

  return (
    <Card>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Booking Details</h1>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              booking.status === 'completed' ? 'bg-green-100 text-green-700' :
              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
              booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {booking.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {booking.payment_status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Session Information</h2>
            <div className="space-y-2 text-gray-700">
              <p><span className="font-medium">Date & Time:</span> {formatDateTime(booking.scheduled_at)}</p>
              <p><span className="font-medium">Duration:</span> {booking.duration_minutes} minutes</p>
              <p><span className="font-medium">Type:</span> {booking.session_type}</p>
              <p><span className="font-medium">Price:</span> {formatCurrency(booking.price)}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">
              {userRole === 'topper' ? 'Student' : 'Topper'}
            </h2>
            <div className="space-y-2 text-gray-700">
              <p className="font-medium">
                {userRole === 'topper' 
                  ? (booking.student as any)?.full_name || 'Student'
                  : (booking.topper as any)?.full_name || 'Topper'
                }
              </p>
              {booking.resource && (
                <p className="text-sm text-gray-600">
                  Related Resource: {(booking.resource as any)?.title}
                </p>
              )}
            </div>
          </div>
        </div>

        {booking.meeting_link && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="font-semibold mb-2">Meeting Link</p>
            <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {booking.meeting_link}
            </a>
          </div>
        )}

        {booking.notes && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-semibold mb-2">Notes</p>
            <p className="text-gray-700">{booking.notes}</p>
          </div>
        )}

        <div className="flex gap-4 pt-4 border-t">
          {canCancel && (
            <Button variant="danger">Cancel Booking</Button>
          )}
          {canComplete && (
            <Button>Mark as Completed</Button>
          )}
          {booking.payment_status === 'pending' && userRole === 'student' && (
            <Button>Complete Payment</Button>
          )}
        </div>
      </div>
    </Card>
  )
}

