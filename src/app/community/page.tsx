'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Heart, 
  MessageCircle, 
  Bookmark,
  Trophy,
  TrendingUp,
  Clock,
  Filter,
  Search,
  MoreHorizontal,
  Pin,
  ChevronRight,
  Flame,
  Crown,
  Star,
  Sparkles,
  Trash2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { 
  CommunityPost, 
  CommunitySection, 
  SECTIONS_CONFIG,
  LEVELS_CONFIG,
  CoachPoints
} from '@/types/community'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { getCoachLeaderboard } from '@/lib/coachPoints'

export default function CommunityPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<CommunitySection | 'all'>('all')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [leaderboard, setLeaderboard] = useState<Partial<CoachPoints>[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent')
  const [isLoading, setIsLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set())
  const [deletingPost, setDeletingPost] = useState<string | null>(null)

  const userRole = user?.role || 'coachee'
  
  // Check se l'utente è admin
  const ADMIN_EMAILS = ['debora.carofiglio@gmail.com']
  const isAdmin = user?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))

  // Carica post reali da Firebase
  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true)
      try {
        const postsQuery = query(
          collection(db, 'communityPosts'),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
        const snapshot = await getDocs(postsQuery)
        const loadedPosts: CommunityPost[] = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            authorId: data.authorId || '',
            authorName: data.authorName || 'Utente',
            authorPhoto: data.authorPhoto || null,
            authorRole: data.authorRole || 'coachee',
            section: data.section || 'coach-corner',
            title: data.title || '',
            content: data.content || '',
            tags: data.tags || [],
            likeCount: data.likeCount || 0,
            commentCount: data.commentCount || 0,
            saveCount: data.saveCount || 0,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            isPinned: data.isPinned || false,
            isHighlighted: data.isHighlighted || false
          }
        })
        setPosts(loadedPosts)
        
        // Ripristina like e save dell'utente corrente
        if (user?.id) {
          const liked = new Set<string>()
          const saved = new Set<string>()
          snapshot.docs.forEach(d => {
            const data = d.data()
            if (data.likedBy?.includes(user.id)) liked.add(d.id)
            if (data.savedBy?.includes(user.id)) saved.add(d.id)
          })
          setLikedPosts(liked)
          setSavedPosts(saved)
        }
      } catch (err) {
        console.error('Errore caricamento post:', err)
        setPosts([])
      }
      
      // Carica leaderboard
      try {
        const leaderboardData = await getCoachLeaderboard(5)
        setLeaderboard(leaderboardData)
      } catch (err) {
        console.error('Errore caricamento leaderboard:', err)
        setLeaderboard([])
      }
      
      setIsLoading(false)
    }
    
    loadPosts()
  }, [])

  // Filtra posts per sezione
  const filteredPosts = posts.filter(post => {
    // Nascondi post coach-lounge ai coachee
    const sectionConfig = SECTIONS_CONFIG[post.section]
    if (sectionConfig?.visibleTo && !sectionConfig.visibleTo.includes(userRole as any)) return false
    
    if (activeSection !== 'all' && post.section !== activeSection) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return post.title.toLowerCase().includes(query) || 
             post.content.toLowerCase().includes(query) ||
             post.tags?.some(tag => tag.toLowerCase().includes(query))
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'popular') {
      return (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount)
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Verifica se l'utente può postare nella sezione
  const canPostInSection = (section: CommunitySection): boolean => {
    const config = SECTIONS_CONFIG[section]
    return config.allowedRoles.includes(userRole as any)
  }

  // Toggle like - salva su Firestore
  const handleLike = async (postId: string) => {
    if (!user?.id) return
    const newLiked = new Set(likedPosts)
    const isLiking = !newLiked.has(postId)
    
    if (isLiking) {
      newLiked.add(postId)
      setPosts(posts.map(p => p.id === postId ? { ...p, likeCount: p.likeCount + 1 } : p))
    } else {
      newLiked.delete(postId)
      setPosts(posts.map(p => p.id === postId ? { ...p, likeCount: p.likeCount - 1 } : p))
    }
    setLikedPosts(newLiked)
    
    try {
      const postRef = doc(db, 'communityPosts', postId)
      if (isLiking) {
        await updateDoc(postRef, {
          likeCount: increment(1),
          likedBy: arrayUnion(user.id)
        })
      } else {
        await updateDoc(postRef, {
          likeCount: increment(-1),
          likedBy: arrayRemove(user.id)
        })
      }
    } catch (err) {
      console.error('Errore like:', err)
    }
  }

  // Toggle save - salva su Firestore
  const handleSave = async (postId: string) => {
    if (!user?.id) return
    const newSaved = new Set(savedPosts)
    const isSaving = !newSaved.has(postId)
    
    if (isSaving) {
      newSaved.add(postId)
      setPosts(posts.map(p => p.id === postId ? { ...p, saveCount: p.saveCount + 1 } : p))
    } else {
      newSaved.delete(postId)
      setPosts(posts.map(p => p.id === postId ? { ...p, saveCount: p.saveCount - 1 } : p))
    }
    setSavedPosts(newSaved)
    
    try {
      const postRef = doc(db, 'communityPosts', postId)
      if (isSaving) {
        await updateDoc(postRef, {
          saveCount: increment(1),
          savedBy: arrayUnion(user.id)
        })
      } else {
        await updateDoc(postRef, {
          saveCount: increment(-1),
          savedBy: arrayRemove(user.id)
        })
      }
    } catch (err) {
      console.error('Errore save:', err)
    }
  }

  // Elimina post (solo admin)
  const handleDelete = async (postId: string) => {
    if (!isAdmin) return
    
    if (!confirm('Sei sicuro di voler eliminare questo post?')) return
    
    setDeletingPost(postId)
    try {
      await deleteDoc(doc(db, 'communityPosts', postId))
      setPosts(posts.filter(p => p.id !== postId))
    } catch (err) {
      console.error('Errore eliminazione post:', err)
      alert('Errore durante l\'eliminazione del post')
    } finally {
      setDeletingPost(null)
    }
  }

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

  // Ottieni icona livello
  const getLevelIcon = (level: string) => {
    return LEVELS_CONFIG[level as keyof typeof LEVELS_CONFIG]?.icon || '🌱'
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Logo size="md" />
              </Link>
              <div className="hidden md:block h-6 w-px bg-gray-200" />
              <h1 className="hidden md:block text-lg font-semibold text-charcoal">Community</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca nella community..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
              
              {/* Crea post button */}
              {(userRole === 'coach' || userRole === 'coachee' || userRole === 'admin') && (
                <Link 
                  href="/community/new"
                  className="btn bg-primary-500 text-white hover:bg-primary-600"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Nuovo Post</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar sinistra - Sezioni */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-4 shadow-sm sticky top-24">
              <h3 className="font-semibold text-charcoal mb-4">Sezioni</h3>
              
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('all')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    activeSection === 'all' 
                      ? 'bg-primary-50 text-primary-600' 
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-lg">🏠</span>
                  <span className="font-medium">Tutti i post</span>
                </button>
                
                {Object.entries(SECTIONS_CONFIG)
                  .filter(([_, config]) => !config.visibleTo || config.visibleTo.includes(userRole as any))
                  .map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key as CommunitySection)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      activeSection === key 
                        ? 'bg-primary-50 text-primary-600' 
                        : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <span className="text-lg">{config.icon}</span>
                    <div>
                      <span className="font-medium block">{config.label}</span>
                      <span className="text-xs text-gray-400">{config.description.slice(0, 30)}...</span>
                    </div>
                  </button>
                ))}
              </nav>

              {/* Quick stats */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-charcoal">1.2k</p>
                    <p className="text-xs text-gray-500">Membri</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-charcoal">45</p>
                    <p className="text-xs text-gray-500">Coach</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feed principale */}
          <div className="lg:col-span-2">
            {/* Filtri */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    sortBy === 'recent' 
                      ? 'bg-charcoal text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Clock size={14} />
                  Recenti
                </button>
                <button
                  onClick={() => setSortBy('popular')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    sortBy === 'popular' 
                      ? 'bg-charcoal text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <TrendingUp size={14} />
                  Popolari
                </button>
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-4">
              <AnimatePresence>
                {filteredPosts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${
                      post.isPinned ? 'ring-2 ring-primary-200' : ''
                    } ${post.isHighlighted ? 'ring-2 ring-green-200' : ''}`}
                  >
                    {/* Post header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {post.authorPhoto ? (
                            <img 
                              src={post.authorPhoto} 
                              alt={post.authorName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 font-semibold">
                                {post.authorName.charAt(0)}
                              </span>
                            </div>
                          )}
                          {post.authorRole === 'coach' && (
                            <span className="absolute -bottom-1 -right-1 text-xs">⭐</span>
                          )}
                          {post.authorRole === 'admin' && (
                            <span className="absolute -bottom-1 -right-1 text-xs">👑</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-charcoal">{post.authorName}</span>
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ 
                                backgroundColor: SECTIONS_CONFIG[post.section].color + '15',
                                color: SECTIONS_CONFIG[post.section].color
                              }}
                            >
                              {post.authorRole === 'coach' ? 'Coach' : post.authorRole === 'admin' ? 'Admin' : 'Coachee'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{formatDate(post.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {post.isPinned && (
                          <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded-full flex items-center gap-1">
                            <Pin size={12} /> Fissato
                          </span>
                        )}
                        {/* Pulsante elimina per admin */}
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(post.id)}
                            disabled={deletingPost === post.id}
                            className="p-1.5 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                            title="Elimina post"
                          >
                            {deletingPost === post.id ? (
                              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        )}
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                          <MoreHorizontal size={18} className="text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Post content */}
                    <Link href={`/community/post/${post.id}`}>
                      <h2 className="text-lg font-semibold text-charcoal mb-2 hover:text-primary-500 transition-colors">
                        {post.title}
                      </h2>
                    </Link>
                    <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                      {post.content}
                    </p>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map(tag => (
                          <span 
                            key={tag}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 cursor-pointer"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Post actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${
                            likedPosts.has(post.id) 
                              ? 'text-red-500' 
                              : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <Heart size={18} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} />
                          <span>{post.likeCount}</span>
                        </button>
                        <Link 
                          href={`/community/post/${post.id}`}
                          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500"
                        >
                          <MessageCircle size={18} />
                          <span>{post.commentCount}</span>
                        </Link>
                        <button 
                          onClick={() => handleSave(post.id)}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${
                            savedPosts.has(post.id) 
                              ? 'text-primary-500' 
                              : 'text-gray-500 hover:text-primary-500'
                          }`}
                        >
                          <Bookmark size={18} fill={savedPosts.has(post.id) ? 'currentColor' : 'none'} />
                          <span>{post.saveCount}</span>
                        </button>
                      </div>
                      
                      <Link 
                        href={`/community/post/${post.id}`}
                        className="text-sm text-primary-500 hover:underline flex items-center gap-1"
                      >
                        Leggi tutto
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>

              {filteredPosts.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl">
                  <p className="text-gray-500">Nessun post trovato</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar destra - Classifica */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-4 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-charcoal flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Coach
                </h3>
                <Link href="/community/leaderboard" className="text-xs text-primary-500 hover:underline">
                  Vedi tutti
                </Link>
              </div>

              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((coach, index) => (
                  <div 
                    key={coach.coachId}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-charcoal text-sm truncate">
                        {coach.coachName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {coach.totalPoints} punti
                      </p>
                    </div>
                    <span className="text-lg" title={LEVELS_CONFIG[coach.currentLevel!].label}>
                      {getLevelIcon(coach.currentLevel!)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Info livelli */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Livelli</h4>
                <div className="space-y-2">
                  {Object.entries(LEVELS_CONFIG).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span>{config.icon}</span>
                      <span className="text-gray-600">{config.label}</span>
                      <span className="text-gray-400 ml-auto">{config.min}+ pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
