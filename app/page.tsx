import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/Button'
import { ResourceCard } from '@/components/ResourceCard'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const user = await currentUser()
  const supabase = await createClient()

  // Fetch featured resources
  const { data: resources } = await supabase
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
    .order('rating', { ascending: false })
    .limit(6)

  return (
    <div className="relative min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="relative z-10">
            <h1 className="text-5xl lg:text-6xl font-bold text-black mb-6 leading-tight tracking-tight">
              Achieve accurate, more cost-effective exam preparation.
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-xl">
              Our user-friendly platform is trusted worldwide for connecting verified toppers with students seeking quality tutoring and study resources.
            </p>
            <div className="flex gap-4">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="bg-black text-white hover:bg-gray-800">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/sign-up">
                  <Button size="lg" className="bg-black text-white hover:bg-gray-800">
                    Get started now
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Right Side - Product Showcase */}
          <div className="relative z-10">
            <div className="relative bg-white rounded-lg shadow-2xl p-4 border border-gray-200">
              {/* Mock Dashboard Preview */}
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-xs text-gray-500">UNIVO+ Dashboard</div>
                </div>
                <div className="bg-white rounded border border-gray-200 p-3">
                  <div className="flex gap-2 mb-3">
                    <button className="px-3 py-1 text-xs bg-black text-white rounded">Overview</button>
                    <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Resources</button>
                    <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Bookings</button>
                    <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Groups</button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Resources</span>
                      <span className="text-gray-500">15</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Active Bookings</span>
                      <span className="text-gray-500">3</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Study Groups</span>
                      <span className="text-gray-500">2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-black">Verified Toppers</h3>
              <p className="text-gray-600 leading-relaxed">
                Only students with 9+ CGPA can become tutors, ensuring quality and credibility in every session.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-black">Affordable Sessions</h3>
              <p className="text-gray-600 leading-relaxed">
                Book 30-60 minute micro-tutoring sessions at affordable prices (₹30-₹100) that fit your budget.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-black">Smart Matching</h3>
              <p className="text-gray-600 leading-relaxed">
                AI-powered study group matching based on subjects, topics, and schedule preferences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Resources */}
      {resources && resources.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-black mb-12 text-center">Featured Resources</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/resources">
                <Button variant="outline">View All Resources</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Partner/Trust Section */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-sm text-gray-500 text-center mb-8">Trusted by students and toppers worldwide</p>
          <div className="flex items-center justify-center gap-12 opacity-60">
            <div className="text-sm font-semibold text-gray-400">University Partners</div>
            <div className="text-sm font-semibold text-gray-400">Educational Institutions</div>
            <div className="text-sm font-semibold text-gray-400">Study Centers</div>
          </div>
        </div>
      </section>
    </div>
  )
}

