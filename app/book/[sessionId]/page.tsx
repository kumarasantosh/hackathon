import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { BookingDetails } from '@/components/BookingDetails'

export default async function BookingPage({ params }: { params: { sessionId: string } }) {
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

  // Fetch booking details
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      topper:topper_id (
        id,
        full_name,
        is_verified,
        cgpa
      ),
      student:student_id (
        id,
        full_name
      ),
      resource:resource_id (
        id,
        title
      )
    `)
    .eq('id', params.sessionId)
    .single()

  if (!booking) {
    redirect('/dashboard')
  }

  // Check if user has access to this booking
  if (booking.student_id !== userProfile.id && booking.topper_id !== userProfile.id) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BookingDetails booking={booking} userRole={userProfile.role} />
    </div>
  )
}

