'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Trophy, 
  Medal,
  TrendingUp,
  Flame,
  Crown,
  Star,
  Calendar,
  MessageSquare,
  Heart,
  Award
} from 'lucide-react'
import Logo from '@/components/Logo'
import { 
  CoachPoints,
  LEVELS_CONFIG,
  getLevelProgress
} from '@/types/community'
import { getCoachLeaderboard } from '@/lib/coachPoints'

type LeaderboardEntry = Partial<CoachPoints> & { rank: number; photo?: string }

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCoach, setSelectedCoach] = useState<LeaderboardEntry | null>(null)

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await getCoachLeaderboard(20)
        const ranked = data.map((coach, i) => ({ ...coach, rank: i + 1 }))
        setLeaderboard(ranked)
      } catch (err) {
        console.error('Errore caricamento leaderboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadLeaderboard()
  }, [])

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800'
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
    return 'bg-gray-100 text-gray-600'
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5" />
    if (rank === 2) return <Medal className="w-5 h-5" />
    if (rank === 3) return <Award className="w-5 h-5" />
    return <span className="font-bold">{rank}</span>
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
                <h1 className="text-xl font-semibold text-charcoal flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Classifica Coach
                </h1>
                <p className="text-sm text-gray-500">I coach più attivi della community</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
          </div>
        )}
        {!loading && leaderboard.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nessun dato ancora</p>
            <p className="text-sm mt-1">La classifica si aggiornerà man mano che i coach partecipano alla community</p>
          </div>
        )}
        {!loading && leaderboard.length > 0 && <>
        {/* Top 3 Podio */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2° posto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center pt-8"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-4 border-gray-300">
                {leaderboard[1]?.photo ? (
                  <img src={leaderboard[1].photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 text-2xl font-bold">
                    {leaderboard[1]?.coachName?.charAt(0)}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold shadow-lg">
                2
              </span>
            </div>
            <p className="mt-4 font-semibold text-charcoal text-center text-sm">{leaderboard[1]?.coachName}</p>
            <p className="text-sm text-gray-500">{leaderboard[1]?.totalPoints} pts</p>
            <span className="text-xl mt-1">{LEVELS_CONFIG[leaderboard[1]?.currentLevel!]?.icon}</span>
          </motion.div>

          {/* 1° posto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-yellow-100 overflow-hidden border-4 border-yellow-400 shadow-lg">
                {leaderboard[0]?.photo ? (
                  <img src={leaderboard[0].photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-yellow-200 text-yellow-700 text-3xl font-bold">
                    {leaderboard[0]?.coachName?.charAt(0)}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center shadow-lg">
                <Crown className="w-5 h-5" />
              </span>
            </div>
            <p className="mt-4 font-bold text-charcoal text-center">{leaderboard[0]?.coachName}</p>
            <p className="text-sm text-primary-500 font-semibold">{leaderboard[0]?.totalPoints} pts</p>
            <span className="text-2xl mt-1">{LEVELS_CONFIG[leaderboard[0]?.currentLevel!]?.icon}</span>
          </motion.div>

          {/* 3° posto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center pt-12"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-orange-100 overflow-hidden border-4 border-orange-300">
                {leaderboard[2]?.photo ? (
                  <img src={leaderboard[2].photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-200 text-orange-700 text-xl font-bold">
                    {leaderboard[2]?.coachName?.charAt(0)}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-orange-400 text-white flex items-center justify-center font-bold shadow-lg text-sm">
                3
              </span>
            </div>
            <p className="mt-4 font-semibold text-charcoal text-center text-sm">{leaderboard[2]?.coachName}</p>
            <p className="text-sm text-gray-500">{leaderboard[2]?.totalPoints} pts</p>
            <span className="text-lg mt-1">{LEVELS_CONFIG[leaderboard[2]?.currentLevel!]?.icon}</span>
          </motion.div>
        </div>

        {/* Lista completa */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-charcoal">Classifica Completa</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {leaderboard.map((coach, index) => (
              <motion.div
                key={coach.coachId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCoach(selectedCoach?.coachId === coach.coachId ? null : coach)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedCoach?.coachId === coach.coachId ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRankStyle(coach.rank)}`}>
                    {getRankIcon(coach.rank)}
                  </div>

                  {/* Avatar */}
                  <div className="relative">
                    {coach.photo ? (
                      <img src={coach.photo} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-lg">
                          {coach.coachName?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-charcoal">{coach.coachName}</p>
                      <span className="text-lg">{LEVELS_CONFIG[coach.currentLevel!]?.icon}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {LEVELS_CONFIG[coach.currentLevel!]?.label}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="font-bold text-charcoal">{coach.totalPoints}</p>
                    <p className="text-xs text-gray-400">punti</p>
                  </div>

                  {/* Streak */}
                  {coach.streak && coach.streak > 0 && (
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame size={16} />
                      <span className="text-sm font-medium">{coach.streak}</span>
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {selectedCoach?.coachId === coach.coachId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-100"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <MessageSquare className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="font-semibold text-charcoal">{coach.pointsFromPosts}</p>
                        <p className="text-xs text-gray-500">Da post</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <MessageSquare className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="font-semibold text-charcoal">{coach.pointsFromComments}</p>
                        <p className="text-xs text-gray-500">Da commenti</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                        <p className="font-semibold text-charcoal">{coach.pointsFromLikesReceived}</p>
                        <p className="text-xs text-gray-500">Da like</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <Calendar className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                        <p className="font-semibold text-charcoal">{coach.pointsFromSessions}</p>
                        <p className="text-xs text-gray-500">Da sessioni</p>
                      </div>
                    </div>

                    {/* Progress to next level */}
                    <div className="mt-4">
                      {(() => {
                        const progress = getLevelProgress(coach.totalPoints || 0)
                        if (progress.next) {
                          return (
                            <div>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>{LEVELS_CONFIG[progress.current].label}</span>
                                <span>{LEVELS_CONFIG[progress.next].label}</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary-500 rounded-full transition-all"
                                  style={{ width: `${progress.progress}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-1 text-center">
                                {progress.progress}% verso {LEVELS_CONFIG[progress.next].label}
                              </p>
                            </div>
                          )
                        }
                        return (
                          <p className="text-center text-sm text-primary-500 font-medium">
                            🏆 Livello massimo raggiunto!
                          </p>
                        )
                      })()}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-charcoal mb-4">Come funziona il sistema punti?</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-2">✅ Guadagna punti</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Pubblica un post: <strong>+10 pts</strong></li>
                <li>• Scrivi un commento: <strong>+5 pts</strong></li>
                <li>• Ricevi un like: <strong>+2 pts</strong></li>
                <li>• Ricevi un commento: <strong>+3 pts</strong></li>
                <li>• Post salvato: <strong>+5 pts</strong></li>
                <li>• Rispondi a domanda coachee: <strong>+15 pts</strong></li>
                <li>• Sessione con recensione positiva: <strong>+20 pts</strong></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2">❌ Perdi punti</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 1 mese di inattività: <strong>-20 pts</strong></li>
                <li>• 2 mesi di inattività: <strong>-50 pts</strong></li>
                <li>• 3+ mesi di inattività: <strong>-100 pts</strong> + profilo nascosto</li>
              </ul>
              <p className="text-xs text-gray-400 mt-3">
                Pubblica almeno 4 post al mese per restare attivo!
              </p>
            </div>
          </div>
        </div>
        </>}
      </main>
    </div>
  )
}
