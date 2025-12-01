import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function ToppersPage() {
  const supabase = await createClient()

  const { data: toppers, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'topper')
    .eq('is_verified', true)
    .order('cgpa', { ascending: false })

  if (error) {
    console.error('Error fetching toppers:', error)
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Toppers</h2>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-black mb-2">Verified Toppers</h1>
        <p className="text-gray-600">Connect with top-performing students (9+ CGPA) for quality tutoring</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {toppers?.map((topper) => (
          <div key={topper.id} className="bg-white border border-gray-100 rounded-lg p-6 hover:shadow-lg hover:border-gray-200 transition-all">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-black mb-1">{topper.full_name}</h3>
                <p className="text-gray-500 text-sm">{topper.email}</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                  ✓ Verified
                </span>
                {topper.cgpa && (
                  <span className="text-gray-700 font-medium">CGPA: {topper.cgpa.toFixed(2)}</span>
                )}
              </div>

              {topper.bio && (
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{topper.bio}</p>
              )}

              <Link href={`/book?topper=${topper.id}`}>
                <Button className="w-full bg-black text-white hover:bg-gray-800">
                  Book Session
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {(!toppers || toppers.length === 0) && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No toppers available</p>
          <p className="text-gray-400 text-sm mt-2">Verified toppers will appear here</p>
        </div>
      )}
    </div>
  )
}
