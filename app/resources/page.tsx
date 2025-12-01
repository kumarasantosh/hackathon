import { createClient } from '@/lib/supabase/server'
import { ResourceCard } from '@/components/ResourceCard'
import { Button } from '@/components/ui/Button'

export default async function ResourcesPage() {
  try {
    const supabase = await createClient()

    const { data: resources, error } = await supabase
      .from('resources')
      .select(`
        *,
        users:topper_id (
          full_name,
          is_verified,
          cgpa
        ),
        subjects (*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching resources:', error)
      throw error
    }

    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Resources</h1>
            <p className="text-gray-600">Browse study materials from verified toppers</p>
          </div>
          <Button variant="outline">Filter</Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {resources?.map((resource: any) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>

        {resources?.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No resources available</p>
            <p className="text-gray-400 text-sm mt-2">Check back later for new study materials</p>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error in ResourcesPage:', error)
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Resources</h2>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    )
  }
}

