import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (!userProfile || userProfile.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can book sessions' },
        { status: 403 }
      )
    }

    const { topperId, resourceId, durationMinutes, scheduledAt, sessionType } = body

    if (!topperId || !durationMinutes || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify topper exists and is verified
    const { data: topper } = await supabase
      .from('users')
      .select('*')
      .eq('id', topperId)
      .eq('role', 'topper')
      .eq('is_verified', true)
      .single()

    if (!topper) {
      return NextResponse.json(
        { error: 'Invalid topper' },
        { status: 400 }
      )
    }

    // Calculate price based on duration (₹50 per 30 minutes)
    const price = Math.round((durationMinutes / 30) * 50)

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id: userProfile.id,
        topper_id: topperId,
        resource_id: resourceId || null,
        session_type: sessionType || 'tutoring',
        duration_minutes: durationMinutes,
        scheduled_at: scheduledAt,
        price,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (bookingError) {
      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError.message },
        { status: 500 }
      )
    }

    // In a real app, you would integrate with Stripe here
    // For now, we'll simulate payment by setting payment_status to 'paid'
    // This should be done after actual payment confirmation
    
    return NextResponse.json({ 
      booking,
      message: 'Booking created successfully. Please complete payment to confirm.',
      paymentUrl: `/bookings/${booking.id}/pay` // Mock payment URL
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mock payment confirmation endpoint
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { bookingId, paymentId } = body

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    // Update booking payment status
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_id: paymentId || 'mock_payment_' + Date.now(),
        status: 'confirmed',
      })
      .eq('id', bookingId)
      .eq('student_id', userProfile?.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to confirm payment', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ booking }, { status: 200 })
  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

