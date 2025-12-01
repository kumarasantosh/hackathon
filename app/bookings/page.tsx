import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { formatDateTime } from '@/lib/utils'

export default async function BookingsPage() {
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

  // Fetch bookings based on role
  let bookings
  if (userProfile.role === 'topper') {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        student:student_id (
          full_name,
          email
        ),
        resource:resource_id (
          title
        )
      `)
      .eq('topper_id', userProfile.id)
      .order('scheduled_at', { ascending: false })
    bookings = data
  } else {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        topper:topper_id (
          full_name,
          email
        ),
        resource:resource_id (
          title
        )
      `)
      .eq('student_id', userProfile.id)
      .order('scheduled_at', { ascending: false })
    bookings = data
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Bookings</h1>

      <div className="space-y-4">
        {bookings && bookings.length > 0 ? (
          bookings.map((booking) => (
            <Card key={booking.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {userProfile.role === 'topper'
                        ? (booking.student as any)?.full_name || 'Student'
                        : (booking.topper as any)?.full_name || 'Topper'
                      }
                    </h3>
                    <span className={`px-2 py-1 rounded text-sm ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-gray-600">{formatDateTime(booking.scheduled_at)}</p>
                  <p className="text-gray-600">{booking.duration_minutes} minutes</p>
                  {booking.resource && (
                    <p className="text-sm text-gray-500 mt-1">
                      Resource: {(booking.resource as any)?.title}
                    </p>
                  )}
                </div>
                <Link href={`/book/${booking.id}`}>
                  <button className="text-blue-600 hover:underline">
                    View Details
                  </button>
                </Link>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-center text-gray-500 py-12">No bookings yet</p>
        )}
      </div>
    </div>
  )
}

