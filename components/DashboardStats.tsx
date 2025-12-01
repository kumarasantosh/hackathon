import { createAdminClient } from '@/lib/supabase/admin'

interface DashboardStatsProps {
  userId: string
  role: string
}

export async function DashboardStats({ userId, role }: DashboardStatsProps) {
  const supabase = createAdminClient()

  if (role === 'topper') {
    // Topper stats
    const { data: resources } = await supabase
      .from('resources')
      .select('id, download_count, rating')
      .eq('topper_id', userId)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, price')
      .eq('topper_id', userId)

    const totalEarnings = bookings
      ?.filter(b => b.status === 'completed' && b.payment_status === 'paid')
      .reduce((sum, b) => sum + (b.price || 0), 0) || 0

    const stats = [
      { label: 'Resources', value: resources?.length || 0 },
      { label: 'Total Downloads', value: resources?.reduce((sum, r) => sum + (r.download_count || 0), 0) || 0 },
      { label: 'Bookings', value: bookings?.length || 0 },
      { label: 'Earnings', value: `₹${totalEarnings}` },
    ]

    return (
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-black mb-2">{stat.value}</div>
            <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>
    )
  } else {
    // Student stats
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('student_id', userId)

    const { data: transactions } = await supabase
      .from('resource_transactions')
      .select('id')
      .eq('student_id', userId)
      .eq('payment_status', 'paid')

    const stats = [
      { label: 'Booked Sessions', value: bookings?.length || 0 },
      { label: 'Resources Downloaded', value: transactions?.length || 0 },
      { label: 'Active Bookings', value: bookings?.filter(b => b.status === 'confirmed').length || 0 },
      { label: 'Completed Sessions', value: bookings?.filter(b => b.status === 'completed').length || 0 },
    ]

    return (
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-black mb-2">{stat.value}</div>
            <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>
    )
  }
}

