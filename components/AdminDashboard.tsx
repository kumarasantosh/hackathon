'use client'

import { useState } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import type { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']

interface AdminDashboardProps {
  stats: {
    totalResources: number
    totalBookings: number
    activeBookings: number
    totalUsers: number
    totalToppers: number
    pendingVerifications: number
  }
  pendingToppers: User[]
}

export function AdminDashboard({ stats, pendingToppers }: AdminDashboardProps) {
  const [approving, setApproving] = useState<string | null>(null)

  const handleApprove = async (topperId: string, approved: boolean) => {
    setApproving(topperId)
    try {
      const response = await fetch('/api/toppers/verify', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topperId, approved }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update topper status')
      }

      // Refresh page or update state
      window.location.reload()
    } catch (error) {
      alert('Failed to update topper status')
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage toppers, resources, and platform analytics</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <div className="text-2xl font-bold">{stats.totalResources}</div>
          <div className="text-gray-600">Total Resources</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{stats.totalBookings}</div>
          <div className="text-gray-600">Total Bookings</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{stats.activeBookings}</div>
          <div className="text-gray-600">Active Bookings</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <div className="text-gray-600">Total Users</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{stats.totalToppers}</div>
          <div className="text-gray-600">Total Toppers</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingVerifications}</div>
          <div className="text-gray-600">Pending Verifications</div>
        </Card>
      </div>

      {/* Pending Toppers */}
      <Card>
        <h2 className="text-2xl font-bold mb-4">Pending Topper Verifications</h2>
        {pendingToppers.length > 0 ? (
          <div className="space-y-4">
            {pendingToppers.map((topper) => (
              <div key={topper.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{topper.full_name}</p>
                    <p className="text-sm text-gray-600">{topper.email}</p>
                    <p className="text-sm text-gray-600">CGPA: {topper.cgpa?.toFixed(2)}</p>
                    {topper.transcript_url && (
                      <a
                        href={topper.transcript_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Transcript
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(topper.id, true)}
                      disabled={approving === topper.id}
                    >
                      {approving === topper.id ? 'Approving...' : 'Approve'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleApprove(topper.id, false)}
                      disabled={approving === topper.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No pending verifications</p>
        )}
      </Card>
    </div>
  )
}

