import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardStats } from '@/components/DashboardStats'
import { RecentBookings } from '@/components/RecentBookings'
import { MyResources } from '@/components/MyResources'
import { DownloadedResources } from '@/components/DownloadedResources'
import { ActiveBookings } from '@/components/ActiveBookings'
import { RecentActivity } from '@/components/RecentActivity'

export default async function DashboardPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const supabase = createAdminClient()

  // Get user profile from database
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', user.id)
    .single()

  if (!userProfile) {
    // Create user profile if it doesn't exist
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        clerk_id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        full_name: user.fullName || user.firstName || 'User',
        role: 'student',
      })
      .select()
      .single()

    if (newUser) {
      return redirect('/dashboard')
    }
  }

  const isTopper = userProfile?.role === 'topper' && userProfile?.is_verified
  const isStudent = userProfile?.role === 'student'

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 bg-white min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2 text-black">Welcome back, {userProfile?.full_name || user.firstName}!</h1>
        <p className="text-gray-600 text-lg">
          {isTopper ? 'Topper Dashboard' : isStudent ? 'Student Dashboard' : 'Dashboard'}
        </p>
      </div>

      <DashboardStats userId={userProfile?.id || ''} role={userProfile?.role || 'student'} />

      {isStudent && (
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <RecentBookings userId={userProfile?.id || ''} role="student" />
          <DownloadedResources userId={userProfile?.id || ''} />
          <ActiveBookings userId={userProfile?.id || ''} />
          <RecentActivity userId={userProfile?.id || ''} />
        </div>
      )}

      {isTopper && (
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <MyResources topperId={userProfile?.id || ''} />
          <RecentBookings userId={userProfile?.id || ''} role="topper" />
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-10 grid md:grid-cols-3 gap-6">
        {isStudent && (
          <>
            <a href="/resources" className="p-6 bg-white rounded-lg border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all group">
              <h3 className="font-semibold mb-2 text-black group-hover:text-purple-600 transition-colors">Browse Resources</h3>
              <p className="text-sm text-gray-600">Find study materials from verified toppers</p>
            </a>
            <a href="/groups" className="p-6 bg-white rounded-lg border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all group">
              <h3 className="font-semibold mb-2 text-black group-hover:text-purple-600 transition-colors">Find Study Groups</h3>
              <p className="text-sm text-gray-600">Match with peers studying the same subjects</p>
            </a>
            <a href="/toppers" className="p-6 bg-white rounded-lg border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all group">
              <h3 className="font-semibold mb-2 text-black group-hover:text-purple-600 transition-colors">Book Sessions</h3>
              <p className="text-sm text-gray-600">Schedule tutoring sessions with toppers</p>
            </a>
          </>
        )}
        {isTopper && (
          <>
            <a href="/resources/upload" className="p-6 bg-white rounded-lg border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all group">
              <h3 className="font-semibold mb-2 text-black group-hover:text-purple-600 transition-colors">Upload Resource</h3>
              <p className="text-sm text-gray-600">Share your study materials</p>
            </a>
            <a href="/bookings" className="p-6 bg-white rounded-lg border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all group">
              <h3 className="font-semibold mb-2 text-black group-hover:text-purple-600 transition-colors">View Bookings</h3>
              <p className="text-sm text-gray-600">Manage your tutoring sessions</p>
            </a>
          </>
        )}
        {!userProfile?.is_verified && userProfile?.role === 'topper' && (
          <a href="/topper/verify" className="p-6 bg-white rounded-lg border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all group">
            <h3 className="font-semibold mb-2 text-black group-hover:text-purple-600 transition-colors">Verify Account</h3>
            <p className="text-sm text-gray-600">Upload transcript to verify your topper status</p>
          </a>
        )}
      </div>
    </div>
  )
}

