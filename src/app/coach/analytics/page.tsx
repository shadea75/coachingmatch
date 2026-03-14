'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Star,
  Euro,
  Calendar,
  MessageCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Package
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import TierGate from '@/components/TierGate'
import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'

interface MonthlyData {
  month: string
  sessions: number
  revenue: number
  newCoachees: number
}

interface Stats {
  totalSessions: number
  completedSessions: number
  totalRevenue: number
  activeCoachees: number
  totalCoachees: number
  averageRating: number
  totalReviews: number
  conversionRate: number
  avgRevenuePerCoachee: number
  totalProducts: number
  productRevenue: number
  messagesCount: number
}

export default function CoachAnalyticsPage() {
  const { user } = useAuth()
  const [coachTier, setCoachTier] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    completedSessions: 0,
    totalRevenue: 0,
    activeCoachees: 0,
    totalCoachees: 0,
    averageRating: 0,
    totalReviews: 0,
    conversionRate: 0,
    avgRevenuePerCoachee: 0,
    totalProducts: 0,
    productRevenue: 0,
    messagesCount: 0,
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<3 | 6 | 12>(6)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        // Leggi tier
        const coachDoc = await getDoc(doc(db, 'coachApplications', user.id))
        const tier = coachDoc.exists() ? (coachDoc.data()?.subscriptionTier || 'starter') : 'starter'
        setCoachTier(tier)

        // Sessioni
        const sessionsSnap = await getDocs(query(
          collection(db, 'sessions'),
          where('coachId', '==', user.id)
        ))
        const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
        const completed = sessions.filter(s => s.status === 'completed')

        // Revenue da offerte
        const offersSnap = await getDocs(query(
          collection(db, 'offers'),
          where('coachId', '==', user.id)
        ))
        const offers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
        const totalRevenue = offers.reduce((sum, o) => {
          const paid = (o.installments || []).filter((i: any) => i.status === 'paid')
          return sum + paid.reduce((s: number, i: any) => s + (i.amount || 0), 0)
        }, 0)
        const coachRevenue = totalRevenue * 0.7 // 70% al coach

        // Coachee unici
        const coacheeIds = new Set<string>(offers.map(o => o.coacheeId).filter(Boolean))
        const activeCoachees = offers.filter(o => o.status === 'active').length

        // Recensioni
        const reviewsSnap = await getDocs(query(
          collection(db, 'reviews'),
          where('coachId', '==', user.id)
        ))
        const reviews = reviewsSnap.docs.map(d => d.data())
        const avgRating = reviews.length
          ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
          : 0

        // Prodotti digitali
        const productsSnap = await getDocs(query(
          collection(db, 'digitalProducts'),
          where('coachId', '==', user.id)
        ))
        const products = productsSnap.docs.map(d => d.data())
        const productRevenue = products.reduce((s, p) => s + (p.totalRevenue || 0), 0)

        // Conversazioni
        const convsSnap = await getDocs(query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.id)
        ))

        setStats({
          totalSessions: sessions.length,
          completedSessions: completed.length,
          totalRevenue: coachRevenue,
          activeCoachees,
          totalCoachees: coacheeIds.size,
          averageRating: avgRating,
          totalReviews: reviews.length,
          conversionRate: convsSnap.size > 0
            ? Math.round((coacheeIds.size / convsSnap.size) * 100)
            : 0,
          avgRevenuePerCoachee: coacheeIds.size > 0
            ? coachRevenue / coacheeIds.size
            : 0,
          totalProducts: products.length,
          productRevenue,
          messagesCount: convsSnap.size,
        })

        // Dati mensili (ultimi N mesi)
        const monthly: MonthlyData[] = []
        for (let i = selectedPeriod - 1; i >= 0; i--) {
          const monthDate = subMonths(new Date(), i)
          const start = Timestamp.fromDate(startOfMonth(monthDate))
          const end = Timestamp.fromDate(endOfMonth(monthDate))

          const monthSessions = sessions.filter(s => {
            const d = s.createdAt?.toDate?.() || new Date(s.createdAt)
            return d >= start.toDate() && d <= end.toDate()
          })

          const monthRevenue = offers.reduce((sum, o) => {
            const paid = (o.installments || []).filter((inst: any) => {
              if (inst.status !== 'paid' || !inst.paidAt) return false
              const d = inst.paidAt?.toDate?.() || new Date(inst.paidAt)
              return d >= start.toDate() && d <= end.toDate()
            })
            return sum + paid.reduce((s: number, i: any) => s + (i.amount || 0) * 0.7, 0)
          }, 0)

          const monthCoachees = new Set(
            offers
              .filter(o => {
                const d = o.createdAt?.toDate?.() || new Date(o.createdAt)
                return d >= start.toDate() && d <= end.toDate()
              })
              .map(o => o.coacheeId)
          ).size

          monthly.push({
            month: format(monthDate, 'MMM yy', { locale: it }),
            sessions: monthSessions.length,
            revenue: Math.round(monthRevenue),
            newCoachees: monthCoachees,
          })
        }
        setMonthlyData(monthly)

      } catch (err) {
        console.error('Errore caricamento analytics:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.id, selectedPeriod])

  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1)
  const maxSessions = Math.max(...monthlyData.map(m => m.sessions), 1)

  return (
    <TierGate feature="hasAdvancedAnalytics" currentTier={coachTier}>
      <div className="min-h-screen bg-cream">
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/coach/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="font-bold text-charcoal text-lg">Statistiche Avanzate</h1>
                <p className="text-xs text-gray-500">Analisi del tuo business di coaching</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-primary-500" size={36} />
          </div>
        ) : (
          <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

            {/* KPI principali */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Guadagni totali',
                  value: `€${stats.totalRevenue.toFixed(0)}`,
                  icon: Euro,
                  color: 'text-green-600',
                  bg: 'bg-green-50',
                },
                {
                  label: 'Sessioni completate',
                  value: `${stats.completedSessions}/${stats.totalSessions}`,
                  icon: Calendar,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Coachee totali',
                  value: stats.totalCoachees,
                  sub: `${stats.activeCoachees} attivi`,
                  icon: Users,
                  color: 'text-primary-600',
                  bg: 'bg-primary-50',
                },
                {
                  label: 'Rating medio',
                  value: stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : '—',
                  sub: `${stats.totalReviews} recensioni`,
                  icon: Star,
                  color: 'text-amber-500',
                  bg: 'bg-amber-50',
                },
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl p-5 shadow-sm"
                >
                  <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                    <kpi.icon size={20} className={kpi.color} />
                  </div>
                  <p className="text-2xl font-bold text-charcoal">{kpi.value}</p>
                  {kpi.sub && <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>}
                  <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
                </motion.div>
              ))}
            </div>

            {/* KPI secondari */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Tasso conversione',
                  value: `${stats.conversionRate}%`,
                  desc: 'Contatti → clienti',
                  icon: TrendingUp,
                  color: 'text-violet-600',
                },
                {
                  label: 'Revenue per coachee',
                  value: `€${stats.avgRevenuePerCoachee.toFixed(0)}`,
                  desc: 'Media guadagnata',
                  icon: BarChart3,
                  color: 'text-green-600',
                },
                {
                  label: 'Prodotti digitali',
                  value: stats.totalProducts,
                  desc: `€${stats.productRevenue.toFixed(0)} guadagnati`,
                  icon: Package,
                  color: 'text-blue-600',
                },
                {
                  label: 'Conversazioni attive',
                  value: stats.messagesCount,
                  desc: 'Con coachee',
                  icon: MessageCircle,
                  color: 'text-primary-600',
                },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon size={16} className={kpi.color} />
                    <span className="text-xs text-gray-500">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold text-charcoal">{kpi.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{kpi.desc}</p>
                </div>
              ))}
            </div>

            {/* Grafico mensile */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-charcoal flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary-500" />
                  Andamento mensile
                </h2>
                <div className="flex gap-2">
                  {([3, 6, 12] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        selectedPeriod === p
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p} mesi
                    </button>
                  ))}
                </div>
              </div>

              {/* Grafico revenue */}
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Guadagni (€)</p>
              <div className="flex items-end gap-2 h-32 mb-6">
                {monthlyData.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary-500 rounded-t-md transition-all duration-500"
                      style={{ height: `${Math.max(4, (m.revenue / maxRevenue) * 100)}%` }}
                      title={`€${m.revenue}`}
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">{m.month}</span>
                  </div>
                ))}
              </div>

              {/* Grafico sessioni */}
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Sessioni</p>
              <div className="flex items-end gap-2 h-20">
                {monthlyData.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-400 rounded-t-md transition-all duration-500"
                      style={{ height: `${Math.max(4, (m.sessions / maxSessions) * 100)}%` }}
                      title={`${m.sessions} sessioni`}
                    />
                  </div>
                ))}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-primary-500 inline-block" />
                  Guadagni
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-400 inline-block" />
                  Sessioni
                </span>
              </div>
            </div>

            {/* Tabella mensile */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-charcoal">Dettaglio per mese</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-6 py-3">Mese</th>
                      <th className="text-right px-6 py-3">Sessioni</th>
                      <th className="text-right px-6 py-3">Nuovi coachee</th>
                      <th className="text-right px-6 py-3">Guadagni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...monthlyData].reverse().map((m, i) => {
                      const prev = monthlyData[monthlyData.length - 2 - i]
                      const revDiff = prev ? m.revenue - prev.revenue : 0
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-charcoal capitalize">{m.month}</td>
                          <td className="px-6 py-3 text-right">{m.sessions}</td>
                          <td className="px-6 py-3 text-right">{m.newCoachees}</td>
                          <td className="px-6 py-3 text-right">
                            <span className="font-semibold">€{m.revenue}</span>
                            {revDiff !== 0 && (
                              <span className={`ml-2 text-xs ${revDiff > 0 ? 'text-green-500' : 'text-red-400'}`}>
                                {revDiff > 0
                                  ? <><ArrowUpRight size={12} className="inline" />+€{revDiff}</>
                                  : <><ArrowDownRight size={12} className="inline" />€{revDiff}</>
                                }
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </main>
        )}
      </div>
    </TierGate>
  )
}
