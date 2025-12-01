import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface RecentBookingsProps {
  userId: string
  role?: 'student' | 'topper'
}

export async function RecentBookings({ userId, role = 'student' }: RecentBookingsProps) {
  const supabase = createAdminClient()

  let query = supabase
    .from('bookings')
    .select(`
      *,
      topper:topper_id (
        full_name
      ),
      student:student_id (
        full_name
      ),
      resource:resource_id (
        title
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  if (role === 'topper') {
    query = query.eq('topper_id', userId)
  } else {
    query = query.eq('student_id', userId)
  }

  const { data: bookings } = await query

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6 text-black">Recent Bookings</h2>
      {bookings && bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-black">
                    {role === 'topper'
                      ? (booking.student as any)?.full_name || 'Student'
                      : (booking.topper as any)?.full_name || 'Topper'
                    }
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDateTime(booking.scheduled_at)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {booking.duration_minutes} minutes • <span className="capitalize">{booking.status}</span>
                  </p>
                </div>
                <Link href={`/book/${booking.id}`}>
                  <button className="text-purple-600 hover:text-purple-700 hover:underline text-sm font-medium">
                    View
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No bookings yet</p>
      )}
    </div>
  )
}

