import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

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

    // Create booking using admin client to bypass RLS
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        student_id: userProfile.id,
        topper_id: topperId,
        resource_id: resourceId || null,
        session_type: sessionType || 'tutoring',
        duration_minutes: durationMinutes,
        scheduled_at: scheduledAt,
        price,
        status: 'confirmed',
        payment_status: 'paid',
        meeting_link: 'https://meet.google.com/abc-defg-hij', // Hardcoded link as requested
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      booking,
      message: 'Booking created successfully.',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
