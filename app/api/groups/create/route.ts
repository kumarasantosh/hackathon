import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

// Generate a unique join code
function generateJoinCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    
    // Get base URL from request
    const origin = request.headers.get('origin') || 
                   request.nextUrl.origin || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   'http://localhost:3000'

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { 
      name, 
      description, 
      subjectId, 
      topic, 
      maxMembers, 
      meetingType, 
      meetingLocation, 
      meetingLink,
      preferredTimeSlots 
    } = body

    if (!name || !maxMembers) {
      return NextResponse.json(
        { error: 'Name and max members are required' },
        { status: 400 }
      )
    }

    // Generate unique join code
    let joinCode = generateJoinCode()
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('study_groups')
        .select('id')
        .eq('join_code', joinCode)
        .single()

      if (!existing) {
        isUnique = true
      } else {
        joinCode = generateJoinCode()
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique join code. Please try again.' },
        { status: 500 }
      )
    }

    // Create study group
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .insert({
        name,
        description: description || null,
        subject_id: subjectId || null,
        topic: topic || null,
        max_members: maxMembers,
        meeting_type: meetingType || 'virtual',
        meeting_location: meetingLocation || null,
        meeting_link: meetingLink || null,
        preferred_time_slots: preferredTimeSlots || null,
        created_by: userProfile.id,
        is_active: true,
        join_code: joinCode,
      })
      .select()
      .single()

    if (groupError) {
      return NextResponse.json(
        { error: 'Failed to create study group', details: groupError.message },
        { status: 500 }
      )
    }

    // Add creator as leader
    const { error: memberError } = await supabase
      .from('study_group_members')
      .insert({
        group_id: group.id,
        user_id: userProfile.id,
        role: 'leader',
      })

    if (memberError) {
      // If adding member fails, we should probably delete the group
      // For now, just log the error
      console.error('Failed to add creator as member:', memberError)
    }

    return NextResponse.json({ 
      group,
      joinLink: `${origin}/groups/join/${joinCode}`,
      joinCode,
      message: 'Study group created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating study group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

