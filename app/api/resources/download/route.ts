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

    const { resourceId } = body

    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
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

    // Get resource
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    // Check if resource is free or user has purchased it
    if (resource.price > 0) {
      const { data: transaction } = await supabase
        .from('resource_transactions')
        .select('*')
        .eq('student_id', userProfile.id)
        .eq('resource_id', resourceId)
        .eq('payment_status', 'paid')
        .single()

      if (!transaction) {
        return NextResponse.json(
          { error: 'Resource not purchased', requiresPayment: true, price: resource.price },
          { status: 403 }
        )
      }
    }

    // Create download transaction if free resource
    if (resource.price === 0) {
      const { data: existingTransaction } = await supabase
        .from('resource_transactions')
        .select('*')
        .eq('student_id', userProfile.id)
        .eq('resource_id', resourceId)
        .single()

      if (!existingTransaction) {
        await supabase
          .from('resource_transactions')
          .insert({
            student_id: userProfile.id,
            resource_id: resourceId,
            amount: 0,
            payment_status: 'paid',
          })
      }
    }

    // Increment download count
    await supabase
      .from('resources')
      .update({
        download_count: (resource.download_count || 0) + 1,
      })
      .eq('id', resourceId)

    // Generate signed URL for download (in production, use Supabase storage signed URLs)
    return NextResponse.json({ 
      downloadUrl: resource.file_url,
      message: 'Download ready'
    }, { status: 200 })
  } catch (error) {
    console.error('Error processing download:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

