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

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { joinCode } = body

    if (!joinCode || !joinCode.trim()) {
      return NextResponse.json(
        { error: 'Join code is required' },
        { status: 400 }
      )
    }

    // Normalize join code to uppercase
    const normalizedJoinCode = joinCode.toUpperCase().trim()

    // Find group by join code
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select(`
        *,
        members:study_group_members (user_id)
      `)
      .eq('join_code', normalizedJoinCode)
      .eq('is_active', true)
      .single()

    if (groupError) {
      console.error('Error fetching group:', groupError)
      // Check if it's a "no rows" error or actual database error
      if (groupError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invalid or expired join code. Please check the code and try again.' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch group', details: groupError.message },
        { status: 500 }
      )
    }

    if (!group) {
      return NextResponse.json(
        { error: 'Invalid or expired join code. Please check the code and try again.' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const memberCount = group.members?.length || 0
    const isAlreadyMember = group.members?.some((m: any) => m.user_id === userProfile.id) || false

    if (isAlreadyMember) {
      return NextResponse.json(
        { error: 'You are already a member of this group' },
        { status: 400 }
      )
    }

    // Check if group is full
    if (memberCount >= group.max_members) {
      return NextResponse.json(
        { error: 'This group is full' },
        { status: 400 }
      )
    }

    // Add user to group
    const { data: member, error: memberError } = await supabase
      .from('study_group_members')
      .insert({
        group_id: group.id,
        user_id: userProfile.id,
        role: 'member',
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error adding member to group:', memberError)
      // Check if it's a unique constraint violation (already a member)
      if (memberError.code === '23505') {
        return NextResponse.json(
          { error: 'You are already a member of this group' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to join group', details: memberError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      group,
      member,
      message: 'Successfully joined the study group'
    }, { status: 200 })
  } catch (error) {
    console.error('Error joining study group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch group by join code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const joinCode = searchParams.get('joinCode')

    if (!joinCode || !joinCode.trim()) {
      return NextResponse.json(
        { error: 'Join code is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { userId } = await auth()

    // Normalize join code to uppercase
    const normalizedJoinCode = joinCode.toUpperCase().trim()

    // Find group by join code
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select(`
        *,
        subjects (*),
        creator:created_by (
          full_name
        ),
        members:study_group_members (
          user_id
        )
      `)
      .eq('join_code', normalizedJoinCode)
      .eq('is_active', true)
      .single()

    if (groupError) {
      console.error('Error fetching group by join code:', groupError)
      // Check if it's a "no rows" error or actual database error
      if (groupError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invalid or expired join code. Please check the code and try again.' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch group', details: groupError.message },
        { status: 500 }
      )
    }

    if (!group) {
      return NextResponse.json(
        { error: 'Invalid or expired join code. Please check the code and try again.' },
        { status: 404 }
      )
    }

    const memberCount = group.members?.length || 0
    const availableSpots = Math.max(0, group.max_members - memberCount)

    // Check if user is already a member (if authenticated)
    let isAlreadyMember = false
    if (userId) {
      // Get user profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single()

      if (userProfile) {
        isAlreadyMember = group.members?.some((m: any) => m.user_id === userProfile.id) || false
      }
    }

    return NextResponse.json({ 
      group: {
        ...group,
        memberCount,
        availableSpots,
      },
      isAlreadyMember,
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching group by join code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

