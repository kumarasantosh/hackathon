import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

interface DownloadedResourcesProps {
  userId: string
}

export async function DownloadedResources({ userId }: DownloadedResourcesProps) {
  const supabase = createAdminClient()

  const { data: transactions } = await supabase
    .from('resource_transactions')
    .select(`
      *,
      resource:resource_id (
        id,
        title,
        subjects (
          name
        )
      )
    `)
    .eq('student_id', userId)
    .eq('payment_status', 'paid')
    .order('downloaded_at', { ascending: false })
    .limit(5)

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6 text-black">Downloaded Resources</h2>
      {transactions && transactions.length > 0 ? (
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const resource = transaction.resource as any
            return (
              <div key={transaction.id} className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                <Link href={`/resource/${resource?.id}`}>
                  <p className="font-semibold text-black hover:text-purple-600 transition-colors">{resource?.title || 'Resource'}</p>
                  {resource?.subjects && (
                    <p className="text-sm text-gray-600 mt-1">
                      {(resource.subjects as any)?.name}
                    </p>
                  )}
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No resources downloaded yet</p>
      )}
      {transactions && transactions.length > 0 && (
        <Link href="/resources" className="text-purple-600 hover:text-purple-700 hover:underline text-sm mt-6 block font-medium">
          View all resources →
        </Link>
      )}
    </div>
  )
}

