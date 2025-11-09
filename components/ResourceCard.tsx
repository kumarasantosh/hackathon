import Link from 'next/link'
import { Card } from './ui/Card'
import { formatCurrency } from '@/lib/utils'
import type { Database } from '@/types/database'

type Resource = Database['public']['Tables']['resources']['Row'] & {
  users?: Database['public']['Tables']['users']['Row']
  subjects?: Database['public']['Tables']['subjects']['Row']
}

interface ResourceCardProps {
  resource: Resource
}

export function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <Card className="hover:shadow-xl transition-all duration-300 border border-gray-100">
      <Link href={`/resource/${resource.id}`}>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold line-clamp-2 text-black hover:text-purple-600 transition-colors">{resource.title}</h3>
            {resource.price > 0 && (
              <span className="text-black font-bold text-lg whitespace-nowrap ml-2">{formatCurrency(resource.price)}</span>
            )}
            {resource.price === 0 && (
              <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded">Free</span>
            )}
          </div>
          
          {resource.description && (
            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{resource.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
            {resource.subjects && (
              <span className="bg-gray-100 px-2 py-1 rounded text-xs">{resource.subjects.name}</span>
            )}
            {resource.semester && (
              <span className="text-gray-600">Sem {resource.semester}</span>
            )}
            {resource.rating > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
                {resource.rating.toFixed(1)}
              </span>
            )}
          </div>
          
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {resource.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-600">
              {resource.users?.full_name || 'Topper'}
              {resource.users?.is_verified && (
                <span className="ml-2 text-green-600 text-xs">✓</span>
              )}
            </span>
            <span className="text-gray-500 text-xs">{resource.download_count} downloads</span>
          </div>
        </div>
      </Link>
    </Card>
  )
}

