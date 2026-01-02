'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface AdminGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean // true = solo admin, false = admin + moderator
}

export default function AdminGuard({ children, requireAdmin = false }: AdminGuardProps) {
  const { user, loading, isAdmin, canAccessAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Non loggato -> redirect al login
      if (!user) {
        router.push('/login?redirect=/admin')
        return
      }
      
      // Loggato ma non autorizzato
      if (requireAdmin && !isAdmin) {
        router.push('/dashboard?error=unauthorized')
        return
      }
      
      if (!requireAdmin && !canAccessAdmin) {
        router.push('/dashboard?error=unauthorized')
        return
      }
    }
  }, [user, loading, isAdmin, canAccessAdmin, requireAdmin, router])

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-500">Verifica autorizzazioni...</p>
        </div>
      </div>
    )
  }

  // Non autorizzato (il redirect avviene in useEffect)
  if (!user || (requireAdmin && !isAdmin) || (!requireAdmin && !canAccessAdmin)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-500">Reindirizzamento...</p>
        </div>
      </div>
    )
  }

  // Autorizzato
  return <>{children}</>
}
