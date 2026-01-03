'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Trophy, 
  TrendingUp,
  Flame,
  Calendar,
  MessageSquare,
  Heart,
  Bookmark,
  Award,
  AlertTriangle,
  CheckCircle,
  Star,
  Zap,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { 
  CoachPoints,
  LEVELS_CONFIG,
  POINTS_CONFIG,
  getLevelProgress
} from '@/types/community'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'

export default function MyPointsPage() {
  const { user } = useAuth()
  const [points, setPoints] = useState<CoachPoints | null>(null)
  const [activityHistory, setActivityHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'badges'>('overview')

  const userRole = user?.role || 'coachee'

  // Carica punti reali da Firebase
  useEffect(() => {
    const loadPoints = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      try {
        // Carica documento punti
        const pointsDoc = await getDoc(doc(db, 'coachPoints', user.id))
        
        if (pointsDoc.exists()) {
          const data = pointsDoc.data()
          setPoints({
            id: pointsDoc.id,
            coachId: user.id,
            coachName: user.name || user.email?.split('@')[0] || 'Coach',
            totalPoints: data.totalPoints || 0,
            currentLevel: data.currentLevel || 'rookie',
            monthlyPosts: data.monthlyPosts || 0,
            lastActivityAt: data.lastActivityAt?.toDate?.() || new Date(),
            streak: data.streak || 0,
            pointsFromPosts: data.pointsFromPosts || 0,
            pointsFromComments: data.pointsFromComments || 0,
            pointsFromLikesReceived: data.pointsFromLikesReceived || 0,
            pointsFromSavesReceived: data.pointsFromSavesReceived || 0,
            pointsFromSessions: data.pointsFromSessions || 0,
            pointsFromEvents: data.pointsFromEvents || 0,
            pointsLostToInactivity: data.pointsLostToInactivity || 0,
            badges: data.badges || [],
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date()
          })
        } else {
          // Nessun dato - utente nuovo
          setPoints({
            id: user.id,
            coachId: user.id,
            coachName: user.name || user.email?.split('@')[0] || 'Coach',
            totalPoints: 0,
            currentLevel: 'rookie',
            monthlyPosts: 0,
            lastActivityAt: new Date(),
            streak: 0,
            pointsFromPosts: 0,
            pointsFromComments: 0,
            pointsFromLikesReceived: 0,
            pointsFromSavesReceived: 0,
            pointsFromSessions: 0,
            pointsFromEvents: 0,
            pointsLostToInactivity: 0,
            badges: [],
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
        
        // Carica storico attività (se esiste collection)
        try {
          const historyQuery = query(
            collection(db, 'pointsHistory'),
            where('coachId', '==', user.id),
            orderBy('createdAt', 'desc'),
            limit(20)
          )
          const historySnap = await getDocs(historyQuery)
          const history = historySnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().createdAt?.toDate?.() || new Date()
          }))
          setActivityHistory(history)
        } catch {
          setActivityHistory([])
        }
        
      } catch (err) {
        console.error('Errore caricamento punti:', err)
        setPoints({
          id: user.id,
          coachId: user.id,
          coachName: user.name || 'Coach',
          totalPoints: 0,
          currentLevel: 'rookie',
          monthlyPosts: 0,
          lastActivityAt: new Date(),
          streak: 0,
          pointsFromPosts: 0,
          pointsFromComments: 0,
          pointsFromLikesReceived: 0,
          pointsFromSavesReceived: 0,
          pointsFromSessions: 0,
          pointsFromEvents: 0,
          pointsLostToInactivity: 0,
          badges: [],
          createdAt: new Date(),
          updatedAt: new Date()
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadPoints()
  }, [user?.id, user?.name, user?.email])

  const progress = points ? getLevelProgress(points.totalPoints) : null
  const postsRemaining = points ? Math.max(0, POINTS_CONFIG.MIN_POSTS_PER_MONTH - points.monthlyPosts) : 0

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (hours < 1) return 'Ora'
    if (hours < 24) return `${hours}h fa`
    if (days < 7) return `${days}g fa`
    return new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  if (userRole !== 'coach' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-cream">
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/community" className="flex items-center gap-2 text-gray-500 hover:text-charcoal">
                <ArrowLeft size={20} />
                Community
              </Link>
              <Logo size="sm" />
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-charcoal mb-2">Area riservata ai Coach</h1>
          <p className="text-gray-500 mb-6">Il sistema punti è disponibile solo per i coach.</p>
          <Link href="/coach/register" className="btn bg-primary-500 text-white">
            Diventa Coach
          </Link>
        </main>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (!points) return null

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/community" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal">I Miei Punti</h1>
                <p className="text-sm text-gray-500">Dashboard gamification coach</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-primary-100 text-sm mb-1">Punti totali</p>
              <p className="text-5xl font-bold">{points.totalPoints}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-4xl">{LEVELS_CONFIG[points.currentLevel]?.icon || '🌱'}</span>
                <div>
                  <p className="font-semibold text-lg">{LEVELS_CONFIG[points.currentLevel]?.label || 'Rookie'}</p>
                  <p className="text-primary-100 text-sm">Livello attuale</p>
                </div>
              </div>
            </div>
          </div>

          {progress?.next && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-primary-100">{LEVELS_CONFIG[progress.current]?.label}</span>
                <span className="text-white font-medium">
                  {LEVELS_CONFIG[progress.next].min - points.totalPoints} pts al prossimo livello
                </span>
                <span className="text-primary-100">{LEVELS_CONFIG[progress.next]?.label}</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.progress}%` }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
          )}

          {points.streak > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 w-fit">
              <Flame className="text-orange-300" size={20} />
              <span className="font-semibold">{points.streak} giorni</span>
              <span className="text-primary-100">di streak</span>
            </div>
          )}
        </motion.div>

        {postsRemaining > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-4">
            <AlertTriangle className="text-amber-500 flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="font-semibold text-amber-700">
                Devi pubblicare ancora {postsRemaining} post questo mese
              </p>
              <p className="text-sm text-amber-600">
                Minimo {POINTS_CONFIG.MIN_POSTS_PER_MONTH} post/mese per restare attivo. 
                Hai pubblicato {points.monthlyPosts}/{POINTS_CONFIG.MIN_POSTS_PER_MONTH} post.
              </p>
            </div>
            <Link href="/community/new" className="btn bg-primary-500 text-white hover:bg-primary-600 whitespace-nowrap">
              Scrivi post
            </Link>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Panoramica', icon: TrendingUp },
            { id: 'history', label: 'Storico', icon: Calendar },
            { id: 'badges', label: 'Badge', icon: Award },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'history' | 'badges')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === tab.id ? 'bg-charcoal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary-500" />
                Da dove vengono i tuoi punti
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Post pubblicati', value: points.pointsFromPosts, icon: MessageSquare, color: 'text-blue-500' },
                  { label: 'Commenti', value: points.pointsFromComments, icon: MessageSquare, color: 'text-green-500' },
                  { label: 'Like ricevuti', value: points.pointsFromLikesReceived, icon: Heart, color: 'text-red-500' },
                  { label: 'Post salvati', value: points.pointsFromSavesReceived, icon: Bookmark, color: 'text-purple-500' },
                  { label: 'Sessioni', value: points.pointsFromSessions, icon: CheckCircle, color: 'text-emerald-500' },
                  { label: 'Eventi', value: points.pointsFromEvents, icon: Calendar, color: 'text-orange-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={item.color} />
                      <span className="text-gray-600">{item.label}</span>
                    </div>
                    <span className="font-semibold text-charcoal">+{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Zap size={20} className="text-yellow-500" />
                Come guadagnare punti
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  { action: 'Pubblica un post', points: POINTS_CONFIG.POST_CREATED },
                  { action: 'Scrivi un commento', points: POINTS_CONFIG.COMMENT_CREATED },
                  { action: 'Rispondi a domanda coachee', points: POINTS_CONFIG.COACHEE_QUESTION_ANSWERED },
                  { action: 'Sessione con recensione positiva', points: POINTS_CONFIG.SESSION_COMPLETED_POSITIVE },
                ].map(item => (
                  <div key={item.action} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600">{item.action}</span>
                    <span className="font-semibold text-green-600">+{item.points} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm md:col-span-2">
              <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Star size={20} className="text-yellow-500" />
                Livelli
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(LEVELS_CONFIG).map(([key, config]) => (
                  <div 
                    key={key}
                    className={`text-center p-4 rounded-xl border-2 ${
                      key === points.currentLevel ? 'border-primary-500 bg-primary-50' : 'border-gray-100'
                    }`}
                  >
                    <span className="text-3xl block mb-2">{config.icon}</span>
                    <p className="font-semibold text-charcoal text-sm">{config.label}</p>
                    <p className="text-xs text-gray-400">{config.min}+ pts</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-charcoal">Attività recente</h3>
            </div>
            {activityHistory.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {activityHistory.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{activity.icon || '📝'}</span>
                      <div>
                        <p className="text-charcoal font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-400">{formatDate(activity.date)}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${activity.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.points >= 0 ? '+' : ''}{activity.points}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nessuna attività registrata</p>
                <p className="text-sm">Inizia a pubblicare post per guadagnare punti!</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'badges' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {points.badges && points.badges.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {points.badges.map((badge: any) => (
                  <div key={badge.id} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                    <span className="text-5xl block mb-3">{badge.icon}</span>
                    <h4 className="font-semibold text-charcoal mb-1">{badge.name}</h4>
                    <p className="text-sm text-gray-500">{badge.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center mb-6">
                <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="font-semibold text-charcoal mb-2">Nessun badge ottenuto</h3>
                <p className="text-gray-500">Continua a partecipare alla community per sbloccare i badge!</p>
              </div>
            )}

            <h3 className="font-semibold text-charcoal mb-4">Badge da sbloccare</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: '✍️', name: 'Primo Post', description: 'Pubblica il tuo primo post' },
                { icon: '🔥', name: 'Popolare', description: 'Un tuo post riceve 50+ like' },
                { icon: '🌟', name: 'Super Star', description: 'Raggiungi 1000 punti' },
              ].map((badge, index) => (
                <div key={index} className="bg-gray-50 rounded-2xl p-6 text-center opacity-60">
                  <span className="text-4xl block mb-3 grayscale">{badge.icon}</span>
                  <h4 className="font-semibold text-gray-400 mb-1">{badge.name}</h4>
                  <p className="text-sm text-gray-400">{badge.description}</p>
                  <p className="text-xs text-gray-300 mt-2">🔒 Bloccato</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
