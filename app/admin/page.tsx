import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from '@/components/AdminDashboard'

export default async function AdminPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  const supabase = await createClient()

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', user.id)
    .single()

  // Check if user is admin
  if (userProfile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch pending topper verifications
  const { data: pendingToppers } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'topper')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })

  // Fetch analytics
  const { data: resources } = await supabase
    .from('resources')
    .select('id')
    .eq('is_active', true)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status')

  const { data: users } = await supabase
    .from('users')
    .select('id, role')

  const stats = {
    totalResources: resources?.length || 0,
    totalBookings: bookings?.length || 0,
    activeBookings: bookings?.filter(b => b.status === 'confirmed').length || 0,
    totalUsers: users?.length || 0,
    totalToppers: users?.filter(u => u.role === 'topper').length || 0,
    pendingVerifications: pendingToppers?.length || 0,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminDashboard stats={stats} pendingToppers={pendingToppers || []} />
    </div>
  )
}

