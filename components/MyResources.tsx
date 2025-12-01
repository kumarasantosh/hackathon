import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { ResourceCard } from './ResourceCard'

interface MyResourcesProps {
  topperId: string
}

export async function MyResources({ topperId }: MyResourcesProps) {
  const supabase = createAdminClient()

  const { data: resources } = await supabase
    .from('resources')
    .select(`
      *,
      subjects (*)
    `)
    .eq('topper_id', topperId)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-black">My Resources</h2>
        <Link href="/resources/upload">
          <button className="text-purple-600 hover:text-purple-700 hover:underline text-sm font-medium">
            Upload New
          </button>
        </Link>
      </div>
      {resources && resources.length > 0 ? (
        <div className="space-y-4">
          {resources.map((resource) => (
            <div key={resource.id} className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
              <Link href={`/resource/${resource.id}`}>
                <p className="font-semibold text-black hover:text-purple-600 transition-colors">{resource.title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {resource.download_count} downloads • {resource.rating > 0 ? (
                    <span className="flex items-center gap-1 inline-flex">
                      <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      {resource.rating.toFixed(1)}
                    </span>
                  ) : 'No ratings yet'}
                </p>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No resources uploaded yet</p>
      )}
    </div>
  )
}

