import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { groupId } = params

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      )
    }

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

    // Find group by ID
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select(`
        *,
        members:study_group_members (user_id)
      `)
      .eq('id', groupId)
      .eq('is_active', true)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found or inactive' },
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

