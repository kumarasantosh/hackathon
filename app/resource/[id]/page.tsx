import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { currentUser } from '@clerk/nextjs/server'
import { ResourceDetails } from '@/components/ResourceDetails'
import { AIContent } from '@/components/AIContent'

export default async function ResourcePage({ params }: { params: { id: string } }) {
  try {
    const user = await currentUser()
    const supabase = await createClient()

    const { data: resource, error } = await supabase
      .from('resources')
      .select(`
        *,
        topper:topper_id (
          id,
          full_name,
          is_verified,
          cgpa,
          bio
        ),
        subjects (*)
      `)
      .eq('id', params.id)
      .single()

    const resourceData = resource as any

    if (error || !resourceData) {
      console.error('Error fetching resource:', error)
      notFound()
    }

    // Get user profile if logged in
    let userProfile = null
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .single()
      userProfile = data
    }

    // Check if user has purchased/downloaded this resource
    let hasAccess = false
    if (userProfile && resourceData.price === 0) {
      hasAccess = true // Free resources
    } else if (userProfile) {
      const { data: transaction } = await supabase
        .from('resource_transactions')
        .select('*')
        .eq('student_id', userProfile.id)
        .eq('resource_id', resourceData.id)
        .eq('payment_status', 'paid')
        .single()
      hasAccess = !!transaction
    }

    // Fetch AI generated content
    const { data: aiContent } = await supabase
      .from('ai_generated_content')
      .select('*')
      .eq('resource_id', resourceData.id)
      .order('generated_at', { ascending: false })

    // Fetch reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id (
          full_name
        )
      `)
      .eq('resource_id', resourceData.id)
      .order('created_at', { ascending: false })

    return (
      <div className="bg-white min-h-screen">
        <ResourceDetails
          resource={resourceData}
          hasAccess={hasAccess}
          userProfile={userProfile}
          reviews={reviews || []}
        />

        {hasAccess && aiContent && aiContent.length > 0 && (
          <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-8">
            <AIContent content={aiContent} />
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error in ResourcePage:', error)
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Resource</h2>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    )
  }
}
