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
  Target,
  AlertTriangle,
  CheckCircle,
  Star,
  Zap
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { 
  CoachPoints,
  LEVELS_CONFIG,
  POINTS_CONFIG,
  getLevelProgress
} from '@/types/community'

// Mock data per coach
const MOCK_POINTS: CoachPoints = {
  id: '1',
  coachId: 'coach1',
  coachName: 'Laura Bianchi',
  totalPoints: 485,
  currentLevel: 'active',
  monthlyPosts: 3,
  lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 ore fa
  streak: 12,
  pointsFromPosts: 180,
  pointsFromComments: 120,
  pointsFromLikesReceived: 85,
  pointsFromSavesReceived: 45,
  pointsFromSessions: 40,
  pointsFromEvents: 15,
  pointsLostToInactivity: 0,
  badges: [
    { id: 'b1', name: 'Primo Post', description: 'Hai pubblicato il tuo primo post', icon: '✍️', earnedAt: new Date('2024-11-15') },
    { id: 'b2', name: 'Popolare', description: 'Un tuo post ha ricevuto 50+ like', icon: '🔥', earnedAt: new Date('2024-12-01') },
    { id: 'b3', name: 'Mentore', description: 'Hai risposto a 10 domande di coachee', icon: '🎓', earnedAt: new Date('2024-12-15') },
  ],
  createdAt: new Date('2024-11-01'),
  updatedAt: new Date()
}

const ACTIVITY_HISTORY = [
  { date: new Date(Date.now() - 1000 * 60 * 60 * 2), action: 'Post pubblicato', points: 10, icon: '📝' },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 5), action: 'Like ricevuto', points: 2, icon: '❤️' },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 8), action: 'Commento scritto', points: 5, icon: '💬' },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 24), action: 'Like ricevuto x3', points: 6, icon: '❤️' },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 26), action: 'Risposta a domanda', points: 15, icon: '🎯' },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 48), action: 'Post salvato da utente', points: 5, icon: '🔖' },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 72), action: 'Sessione completata', points: 20, icon: '✅' },
]

export default function MyPointsPage() {
  const { user } = useAuth()
  const [points, setPoints] = useState<CoachPoints>(MOCK_POINTS)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'badges'>('overview')

  const userRole = user?.role || 'coachee'
  const progress = getLevelProgress(points.totalPoints)
  const postsRemaining = Math.max(0, POINTS_CONFIG.MIN_POSTS_PER_MONTH - points.monthlyPosts)

  // Formatta data
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

  // Se non è coach, mostra messaggio
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

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/community"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
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
        {/* Hero Card - Punti e Livello */}
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
                <span className="text-4xl">{LEVELS_CONFIG[points.currentLevel].icon}</span>
                <div>
                  <p className="font-semibold text-lg">{LEVELS_CONFIG[points.currentLevel].label}</p>
                  <p className="text-primary-100 text-sm">Livello attuale</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar al prossimo livello */}
          {progress.next && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-primary-100">{LEVELS_CONFIG[progress.current].label}</span>
                <span className="text-white font-medium">
                  {LEVELS_CONFIG[progress.next].min - points.totalPoints} pts al prossimo livello
                </span>
                <span className="text-primary-100">{LEVELS_CONFIG[progress.next].label}</span>
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
          {!progress.next && (
            <div className="text-center py-2">
              <p className="text-primary-100">🏆 Hai raggiunto il livello massimo!</p>
            </div>
          )}

          {/* Streak */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <Flame className="text-orange-300" size={20} />
              <span className="font-semibold">{points.streak} giorni</span>
              <span className="text-primary-100 text-sm">di streak</span>
            </div>
          </div>
        </motion.div>

        {/* Alert post mensili */}
        {postsRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-xl p-4 mb-6 flex items-center gap-3 ${
              postsRemaining >= 3 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <AlertTriangle className={postsRemaining >= 3 ? 'text-red-500' : 'text-amber-500'} size={24} />
            <div className="flex-1">
              <p className={`font-medium ${postsRemaining >= 3 ? 'text-red-700' : 'text-amber-700'}`}>
                Devi pubblicare ancora {postsRemaining} post questo mese
              </p>
              <p className="text-sm text-gray-500">
                Minimo 4 post/mese per restare attivo. Hai pubblicato {points.monthlyPosts}/4 post.
              </p>
            </div>
            <Link href="/community/new" className="btn bg-primary-500 text-white text-sm">
              Scrivi post
            </Link>
          </motion.div>
        )}

        {postsRemaining === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <p className="font-medium text-green-700">Obiettivo mensile raggiunto! 🎉</p>
              <p className="text-sm text-gray-500">
                Hai pubblicato {points.monthlyPosts} post questo mese. Continua così!
              </p>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Panoramica', icon: TrendingUp },
            { id: 'history', label: 'Storico', icon: Calendar },
            { id: 'badges', label: 'Badge', icon: Award },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-charcoal text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 gap-4"
          >
            {/* Breakdown punti */}
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
                {points.pointsLostToInactivity > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={18} className="text-red-500" />
                      <span className="text-red-600">Persi per inattività</span>
                    </div>
                    <span className="font-semibold text-red-600">-{points.pointsLostToInactivity}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Come guadagnare punti */}
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
                  { action: 'Partecipa a evento/webinar', points: POINTS_CONFIG.EVENT_PARTICIPATION },
                  { action: 'Badge settimanale attività', points: POINTS_CONFIG.WEEKLY_ACTIVE_BADGE },
                ].map(item => (
                  <div key={item.action} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600">{item.action}</span>
                    <span className="font-semibold text-green-600">+{item.points} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Livelli */}
            <div className="bg-white rounded-2xl p-6 shadow-sm md:col-span-2">
              <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Star size={20} className="text-yellow-500" />
                Livelli e benefici
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(LEVELS_CONFIG).map(([key, config]) => (
                  <div 
                    key={key}
                    className={`text-center p-4 rounded-xl border-2 transition-all ${
                      key === points.currentLevel 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-100'
                    }`}
                  >
                    <span className="text-3xl block mb-2">{config.icon}</span>
                    <p className="font-semibold text-charcoal text-sm">{config.label}</p>
                    <p className="text-xs text-gray-400">{config.min}+ pts</p>
                    {key === points.currentLevel && (
                      <span className="inline-block mt-2 text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">
                        Attuale
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-charcoal">Attività recente</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {ACTIVITY_HISTORY.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{activity.icon}</span>
                    <div>
                      <p className="text-charcoal font-medium">{activity.action}</p>
                      <p className="text-sm text-gray-400">{formatDate(activity.date)}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">+{activity.points}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'badges' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {points.badges.map(badge => (
                <div 
                  key={badge.id}
                  className="bg-white rounded-2xl p-6 shadow-sm text-center"
                >
                  <span className="text-5xl block mb-3">{badge.icon}</span>
                  <h4 className="font-semibold text-charcoal mb-1">{badge.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">{badge.description}</p>
                  <p className="text-xs text-gray-400">
                    Ottenuto il {new Date(badge.earnedAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              ))}
            </div>

            {/* Badge ancora da ottenere */}
            <h3 className="font-semibold text-charcoal mb-4">Badge da sbloccare</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: '🌟', name: 'Super Star', description: 'Raggiungi 1000 punti' },
                { icon: '📚', name: 'Prolifico', description: 'Pubblica 50 post' },
                { icon: '💬', name: 'Comunicatore', description: 'Scrivi 100 commenti' },
                { icon: '🏆', name: 'Top Coach', description: 'Entra nella top 3' },
                { icon: '🎯', name: 'Consistente', description: '30 giorni di streak' },
                { icon: '❤️', name: 'Amato', description: 'Ricevi 500 like totali' },
              ].map((badge, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 rounded-2xl p-6 text-center opacity-60"
                >
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
