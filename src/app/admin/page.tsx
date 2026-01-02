'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import AdminLayout from '@/components/AdminLayout'
import { 
  Users, 
  UserCheck, 
  UserX,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalCoaches: number
  pendingApplications: number
  approvedCoaches: number
  totalCoachees: number
  recentSignups: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCoaches: 0,
    pendingApplications: 0,
    approvedCoaches: 0,
    totalCoachees: 0,
    recentSignups: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch users
        const usersSnap = await getDocs(collection(db, 'users'))
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        // Calculate stats
        const totalUsers = users.length
        const totalCoaches = users.filter((u: any) => u.role === 'coach').length
        const totalCoachees = users.filter((u: any) => u.role === 'coachee').length
        
        // Recent signups (last 7 days)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const recentSignups = users.filter((u: any) => {
          const createdAt = u.createdAt?.toDate?.() || new Date(u.createdAt)
          return createdAt > weekAgo
        }).length

        // Fetch coach applications
        // const applicationsSnap = await getDocs(collection(db, 'coachApplications'))
        // const pendingApplications = applicationsSnap.docs.filter(doc => doc.data().status === 'pending').length
        
        setStats({
          totalUsers,
          totalCoaches,
          pendingApplications: 0, // TODO: implementare quando avremo le candidature nel DB
          approvedCoaches: totalCoaches,
          totalCoachees,
          recentSignups
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { 
      label: 'Utenti Totali', 
      value: stats.totalUsers, 
      icon: Users, 
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Coachee', 
      value: stats.totalCoachees, 
      icon: Users, 
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Coach Attivi', 
      value: stats.approvedCoaches, 
      icon: UserCheck, 
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50'
    },
    { 
      label: 'Candidature in Attesa', 
      value: stats.pendingApplications, 
      icon: UserX, 
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    { 
      label: 'Nuovi (7gg)', 
      value: stats.recentSignups, 
      icon: TrendingUp, 
      color: 'bg-primary-500',
      bgColor: 'bg-primary-50'
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Dashboard</h1>
          <p className="text-gray-500">Panoramica della piattaforma</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div 
                key={stat.label}
                className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 text-${stat.color.replace('bg-', '')}`} style={{ color: stat.color.replace('bg-', '#').replace('-500', '') }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-charcoal">
                  {loading ? '...' : stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-charcoal mb-4">Azioni Rapide</h2>
            <div className="space-y-2">
              <a 
                href="/admin/coaches" 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium">Gestisci candidature coach</span>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  {stats.pendingApplications} in attesa
                </span>
              </a>
              <a 
                href="/admin/users" 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium">Gestisci utenti</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {stats.totalUsers} utenti
                </span>
              </a>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-charcoal mb-4">Attività Recente</h2>
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessuna attività recente</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
