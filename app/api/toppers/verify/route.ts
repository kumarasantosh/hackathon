import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    const { cgpa, transcriptFile } = body

    if (!cgpa || !transcriptFile) {
      return NextResponse.json(
        { error: 'CGPA and transcript are required' },
        { status: 400 }
      )
    }

    const cgpaValue = parseFloat(cgpa)
    if (isNaN(cgpaValue) || cgpaValue < 0 || cgpaValue > 10) {
      return NextResponse.json(
        { error: 'Invalid CGPA. Must be between 0 and 10' },
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

    // Upload transcript file if provided as base64
    let transcriptUrl = userProfile.transcript_url
    if (transcriptFile && transcriptFile.startsWith('data:')) {
      const adminClient = createAdminClient()
      const fileExt = transcriptFile.split(';')[0].split('/')[1]
      const fileName = `${userProfile.id}/transcript_${Date.now()}.${fileExt}`
      const filePath = `transcripts/${fileName}`

      // Convert base64 to buffer
      const base64Data = transcriptFile.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')

      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from('transcripts')
        .upload(filePath, buffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        })

      if (!uploadError) {
        const { data: urlData } = adminClient.storage
          .from('transcripts')
          .getPublicUrl(filePath)
        transcriptUrl = urlData.publicUrl
      }
    }

    // Update user profile
    const updates: any = {
      role: 'topper',
      cgpa: cgpaValue,
      transcript_url: transcriptUrl,
    }

    // Auto-verify if CGPA >= 9.0, otherwise require admin approval
    if (cgpaValue >= 9.0) {
      updates.is_verified = true
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userProfile.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      user: updatedUser,
      message: cgpaValue >= 9.0 
        ? 'You have been verified as a topper!' 
        : 'Your verification request has been submitted for admin review.',
      requiresApproval: cgpaValue < 9.0
    }, { status: 200 })
  } catch (error) {
    console.error('Error verifying topper:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Admin approval endpoint
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (adminUser?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can approve toppers' },
        { status: 403 }
      )
    }

    const { topperId, approved } = body

    if (!topperId || approved === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: topper, error } = await supabase
      .from('users')
      .update({
        is_verified: approved,
      })
      .eq('id', topperId)
      .eq('role', 'topper')
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update topper status', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ topper }, { status: 200 })
  } catch (error) {
    console.error('Error approving topper:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

