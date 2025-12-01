import { Button } from './ui/Button'
import type { Database } from '@/types/database'
import Link from 'next/link'

type Topper = Database['public']['Tables']['users']['Row']
type Review = Database['public']['Tables']['reviews']['Row'] & {
  reviewer?: Database['public']['Tables']['users']['Row']
}

interface TopperProfileProps {
  topper: Topper
  reviews: Review[]
}

export function TopperProfile({ topper, reviews }: TopperProfileProps) {
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-8">
      <div className="flex items-start gap-6 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h1 className="text-3xl font-bold text-black">{topper.full_name}</h1>
            {topper.is_verified && (
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                ✓ Verified Topper
              </span>
            )}
          </div>
          
          {topper.cgpa && (
            <p className="text-lg text-gray-700 mb-3 font-medium">CGPA: {topper.cgpa.toFixed(2)}</p>
          )}
          
          {topper.bio && (
            <p className="text-gray-600 mb-4 leading-relaxed">{topper.bio}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
              {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings'}
            </span>
            <span>{reviews.length} reviews</span>
          </div>
        </div>
        
        <Link href={`/book?topper=${topper.id}`}>
          <Button size="lg" className="bg-black text-white hover:bg-gray-800">
            Book Session
          </Button>
        </Link>
      </div>
      
      {reviews.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold mb-6 text-black">Reviews</h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-black">
                    {(review.reviewer as any)?.full_name || 'Anonymous'}
                  </span>
                  <span className="flex items-center gap-1">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                    ))}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-gray-700 mt-2 leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

