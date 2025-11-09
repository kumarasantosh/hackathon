'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import { formatCurrency } from '@/lib/utils'
import type { Database } from '@/types/database'
import Link from 'next/link'

type Resource = Database['public']['Tables']['resources']['Row'] & {
  topper?: Database['public']['Tables']['users']['Row']
  subjects?: Database['public']['Tables']['subjects']['Row']
}

type Review = Database['public']['Tables']['reviews']['Row'] & {
  reviewer?: Database['public']['Tables']['users']['Row']
}

interface ResourceDetailsProps {
  resource: Resource
  hasAccess: boolean
  userProfile: any
  reviews: Review[]
}

export function ResourceDetails({ resource, hasAccess, userProfile, reviews }: ResourceDetailsProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!hasAccess) {
      alert('You need to purchase this resource first')
      return
    }

    setDownloading(true)
    try {
      const response = await fetch('/api/resources/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resourceId: resource.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.requiresPayment) {
          // Handle payment flow
          alert(`Please pay ${formatCurrency(data.price)} to download this resource`)
        } else {
          alert(data.error || 'Failed to download resource')
        }
        return
      }

      // Open download URL
      window.open(data.downloadUrl, '_blank')
    } catch (error) {
      alert('Failed to download resource')
    } finally {
      setDownloading(false)
    }
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <div className="bg-white border border-gray-100 rounded-lg p-8 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <h1 className="text-4xl font-bold mb-3 text-black">{resource.title}</h1>
              {resource.subjects && (
                <p className="text-lg text-gray-600 mb-2 font-medium">{resource.subjects.name}</p>
              )}
              {resource.semester && (
                <p className="text-gray-600">Semester {resource.semester}</p>
              )}
            </div>
            <div className="text-right">
              {resource.price > 0 ? (
                <p className="text-3xl font-bold text-black">{formatCurrency(resource.price)}</p>
              ) : (
                <p className="text-2xl font-bold text-green-600 bg-green-50 px-4 py-2 rounded-lg inline-block">Free</p>
              )}
            </div>
          </div>

          {resource.description && (
            <div className="pt-6 border-t border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{resource.description}</p>
            </div>
          )}

          <div className="flex items-center gap-8 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500 mb-1">By</p>
              <Link href={`/topper/${resource.topper_id}`} className="font-semibold text-black hover:text-purple-600 transition-colors">
                {resource.topper?.full_name || 'Topper'}
                {resource.topper?.is_verified && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </Link>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Rating</p>
              <p className="font-semibold flex items-center gap-1">
                {averageRating > 0 ? (
                  <>
                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                    {averageRating.toFixed(1)}
                  </>
                ) : (
                  'No ratings yet'
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Downloads</p>
              <p className="font-semibold text-black">{resource.download_count}</p>
            </div>
          </div>

          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-200">
              {resource.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm border border-purple-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-4 pt-6 border-t border-gray-200">
            {hasAccess ? (
              <Button onClick={handleDownload} disabled={downloading} size="lg" className="bg-black text-white hover:bg-gray-800">
                {downloading ? 'Downloading...' : 'Download Resource'}
              </Button>
            ) : (
              <Button onClick={handleDownload} size="lg" className="bg-black text-white hover:bg-gray-800">
                {resource.price > 0 ? `Purchase for ${formatCurrency(resource.price)}` : 'Get Resource'}
              </Button>
            )}
            <Link href={`/topper/${resource.topper_id}`}>
              <Button variant="outline" size="lg">View Topper Profile</Button>
            </Link>
          </div>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-lg p-8">
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

