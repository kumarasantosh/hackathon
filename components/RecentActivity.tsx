import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface RecentActivityProps {
  userId: string
}

export async function RecentActivity({ userId }: RecentActivityProps) {
  const supabase = createAdminClient()

  // Get recent completed bookings
  const { data: completedBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      topper:topper_id (
        full_name
      )
    `)
    .eq('student_id', userId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(3)

  // Get recent downloads
  const { data: recentDownloads } = await supabase
    .from('resource_transactions')
    .select(`
      *,
      resource:resource_id (
        title
      )
    `)
    .eq('student_id', userId)
    .eq('payment_status', 'paid')
    .order('downloaded_at', { ascending: false })
    .limit(3)

  const activities: Array<{
    id: string
    type: 'booking' | 'download'
    title: string
    date: string
    link: string
  }> = []

  completedBookings?.forEach((booking) => {
    activities.push({
      id: booking.id,
      type: 'booking',
      title: `Completed session with ${(booking.topper as any)?.full_name || 'Topper'}`,
      date: booking.updated_at,
      link: `/book/${booking.id}`,
    })
  })

  recentDownloads?.forEach((transaction) => {
    const resource = transaction.resource as any
    activities.push({
      id: transaction.id,
      type: 'download',
      title: `Downloaded ${resource?.title || 'resource'}`,
      date: transaction.downloaded_at,
      link: `/resource/${resource?.id}`,
    })
  })

  // Sort by date
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  activities.splice(5) // Limit to 5 most recent

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6 text-black">Recent Activity</h2>
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Link key={activity.id} href={activity.link}>
              <div className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50 transition-all">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'booking' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                    <span className={`text-sm ${activity.type === 'booking' ? 'text-blue-600' : 'text-green-600'}`}>
                      {activity.type === 'booking' ? '📅' : '📥'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-black">{activity.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(activity.date)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No recent activity</p>
      )}
    </div>
  )
}

