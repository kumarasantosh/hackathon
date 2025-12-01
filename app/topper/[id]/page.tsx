import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopperProfile } from '@/components/TopperProfile'
import { ResourceCard } from '@/components/ResourceCard'

export default async function TopperPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: topper } = await supabase
    .from('users')
    .select('*')
    .eq('id', params.id)
    .eq('role', 'topper')
    .single()

  if (!topper) {
    notFound()
  }

  // Fetch topper's resources
  const { data: resources } = await supabase
    .from('resources')
    .select(`
      *,
      subjects (*)
    `)
    .eq('topper_id', topper.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Fetch reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:reviewer_id (
        full_name
      )
    `)
    .eq('reviewee_id', topper.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
      <TopperProfile topper={topper} reviews={reviews || []} />

      <div className="mt-12">
        <h2 className="text-3xl font-bold mb-8 text-black">Resources by {topper.full_name}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {resources?.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
        {resources?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No resources available yet</p>
            <p className="text-gray-400 text-sm mt-2">This topper hasn't uploaded any resources</p>
          </div>
        )}
      </div>
    </div>
  )
}

