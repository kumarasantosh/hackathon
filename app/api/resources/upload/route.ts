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
    const formData = await request.formData()

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (!userProfile || userProfile.role !== 'topper' || !userProfile.is_verified) {
      return NextResponse.json(
        { error: 'Only verified toppers can upload resources' },
        { status: 403 }
      )
    }

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const subjectId = formData.get('subjectId') as string
    const semester = formData.get('semester') ? parseInt(formData.get('semester') as string) : null
    const price = formData.get('price') ? parseFloat(formData.get('price') as string) : 0
    const tags = formData.get('tags') ? (formData.get('tags') as string).split(',').map(t => t.trim()) : []
    const file = formData.get('file') as File

    if (!title || !file) {
      return NextResponse.json(
        { error: 'Title and file are required' },
        { status: 400 }
      )
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${userProfile.id}/${Date.now()}.${fileExt}`
    const filePath = `resources/${fileName}`

    const adminClient = createAdminClient()
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('resources')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from('resources')
      .getPublicUrl(filePath)

    // Create resource record
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .insert({
        topper_id: userProfile.id,
        title,
        description,
        subject_id: subjectId || null,
        semester,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        tags,
        price,
      })
      .select()
      .single()

    if (resourceError) {
      // Clean up uploaded file if resource creation fails
      await adminClient.storage.from('resources').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to create resource', details: resourceError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    console.error('Error uploading resource:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

