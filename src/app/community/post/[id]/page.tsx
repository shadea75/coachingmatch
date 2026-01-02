'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Bookmark,
  Share2,
  MoreHorizontal,
  Send,
  Reply,
  Trash2,
  Flag,
  Clock,
  User
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { 
  CommunityPost, 
  CommunityComment,
  SECTIONS_CONFIG,
  LEVELS_CONFIG
} from '@/types/community'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore'
import { addPoints } from '@/lib/coachPoints'

// Mock data
const MOCK_POST: CommunityPost = {
  id: '1',
  authorId: 'coach1',
  authorName: 'Laura Bianchi',
  authorPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  authorRole: 'coach',
  section: 'coach-corner',
  title: '5 tecniche per gestire l\'ansia prima di un colloquio importante',
  content: `Oggi voglio condividere con voi alcune tecniche che uso con i miei coachee quando devono affrontare situazioni stressanti come colloqui di lavoro, presentazioni importanti o riunioni decisive.

## 1. Respirazione 4-7-8

Questa tecnica è incredibilmente efficace per calmare il sistema nervoso:
- Inspira per 4 secondi
- Trattieni il respiro per 7 secondi  
- Espira lentamente per 8 secondi

Ripeti 3-4 volte. Il rallentamento del respiro attiva il sistema parasimpatico, riducendo l'ansia quasi istantaneamente.

## 2. Visualizzazione Positiva

Prima del colloquio, dedica 5-10 minuti a visualizzare:
- Te stesso che entri sicuro nella stanza
- Le risposte che fluiscono naturalmente
- L'intervistatore che annuisce e sorride
- Te stesso che esci soddisfatto

Il cervello non distingue bene tra esperienze reali e immaginate. Questa "prova mentale" costruisce fiducia.

## 3. Power Posing

Amy Cuddy ha dimostrato che 2 minuti in una "posizione di potere" (braccia alzate, petto aperto) possono:
- Aumentare il testosterone del 20%
- Ridurre il cortisolo del 25%

Fallo in bagno prima di entrare!

## 4. Grounding con i 5 sensi

Se l'ansia sale, usa questa tecnica per tornare al presente:
- 5 cose che puoi VEDERE
- 4 cose che puoi TOCCARE
- 3 cose che puoi SENTIRE
- 2 cose che puoi ANNUSARE
- 1 cosa che puoi GUSTARE

## 5. Preparazione è Confidenza

L'ansia spesso nasce dall'incertezza. Riduci l'incertezza con:
- Ricerca approfondita sull'azienda
- Preparazione di risposte alle domande comuni
- Preparazione di domande da fare
- Prova del percorso il giorno prima

---

Quale di queste tecniche proverete al vostro prossimo colloquio? Fatemelo sapere nei commenti! 👇`,
  tags: ['ansia', 'carriera', 'colloquio', 'mindset', 'coaching'],
  likeCount: 47,
  commentCount: 12,
  saveCount: 23,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  updatedAt: new Date(),
  isPinned: true
}

const MOCK_COMMENTS: CommunityComment[] = [
  {
    id: 'c1',
    postId: '1',
    authorId: 'coachee1',
    authorName: 'Marco R.',
    authorRole: 'coachee',
    content: 'La tecnica del 4-7-8 mi ha salvato prima del mio ultimo colloquio! Grazie Laura 🙏',
    likeCount: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    updatedAt: new Date()
  },
  {
    id: 'c2',
    postId: '1',
    authorId: 'coach2',
    authorName: 'Alessandro V.',
    authorPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    authorRole: 'coach',
    content: 'Ottimo articolo Laura! Aggiungerei anche la tecnica del "worst case scenario": immaginare il peggio possibile e rendersi conto che non è poi così terribile. Aiuta a ridimensionare le paure.',
    likeCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    updatedAt: new Date()
  },
  {
    id: 'c3',
    postId: '1',
    authorId: 'coachee2',
    authorName: 'Giulia M.',
    authorRole: 'coachee',
    content: 'Ho provato il power posing ieri e wow... mi sentivo davvero più sicura! All\'inizio mi sembrava strano ma funziona davvero.',
    likeCount: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    updatedAt: new Date()
  },
  {
    id: 'c4',
    postId: '1',
    authorId: 'coachee3',
    authorName: 'Luca B.',
    authorRole: 'coachee',
    content: 'Domanda: quanto tempo prima del colloquio consigli di iniziare con queste tecniche? La sera prima o solo il giorno stesso?',
    likeCount: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
    updatedAt: new Date()
  },
  {
    id: 'c5',
    postId: '1',
    authorId: 'coach1',
    authorName: 'Laura Bianchi',
    authorPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    authorRole: 'coach',
    content: '@Luca ottima domanda! La visualizzazione funziona meglio se la fai nei giorni precedenti (anche una settimana prima), così il cervello ha tempo di "abituarsi". Le tecniche di respirazione e grounding invece sono perfette per il giorno stesso, anche pochi minuti prima.',
    likeCount: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 10),
    updatedAt: new Date(),
    parentCommentId: 'c4'
  }
]

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<CommunityPost | null>(MOCK_POST)
  const [comments, setComments] = useState<CommunityComment[]>(MOCK_COMMENTS)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())

  const userRole = user?.role || 'coachee'

  // Formatta data
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (minutes < 1) return 'Ora'
    if (minutes < 60) return `${minutes} min fa`
    if (hours < 24) return `${hours}h fa`
    if (days < 7) return `${days}g fa`
    return new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Formatta contenuto con markdown base
  const formatContent = (content: string) => {
    return content
      .replace(/## (.*)/g, '<h2 class="text-xl font-semibold text-charcoal mt-6 mb-3">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/- (.*)/g, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br />')
  }

  // Toggle like post
  const handleLikePost = () => {
    if (!post) return
    setIsLiked(!isLiked)
    setPost({
      ...post,
      likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1
    })
  }

  // Toggle save post
  const handleSavePost = () => {
    if (!post) return
    setIsSaved(!isSaved)
    setPost({
      ...post,
      saveCount: isSaved ? post.saveCount - 1 : post.saveCount + 1
    })
  }

  // Toggle like comment
  const handleLikeComment = (commentId: string) => {
    const newLiked = new Set(likedComments)
    if (newLiked.has(commentId)) {
      newLiked.delete(commentId)
      setComments(comments.map(c => 
        c.id === commentId ? { ...c, likeCount: c.likeCount - 1 } : c
      ))
    } else {
      newLiked.add(commentId)
      setComments(comments.map(c => 
        c.id === commentId ? { ...c, likeCount: c.likeCount + 1 } : c
      ))
    }
    setLikedComments(newLiked)
  }

  // Invia commento
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || !post) return

    setIsSubmitting(true)

    const comment: CommunityComment = {
      id: `c${Date.now()}`,
      postId: post.id,
      authorId: user.id,
      authorName: user.name || 'Utente',
      authorPhoto: user.photo,
      authorRole: userRole as 'coach' | 'coachee' | 'admin',
      content: newComment.trim(),
      likeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentCommentId: replyingTo || undefined
    }

    setComments([...comments, comment])
    setPost({ ...post, commentCount: post.commentCount + 1 })
    setNewComment('')
    setReplyingTo(null)
    setIsSubmitting(false)

    // Se l'autore del post è un coach e chi commenta è un coachee, dai punti
    if (post.authorRole === 'coach' && userRole === 'coach' && user.id !== post.authorId) {
      // Il coach che commenta guadagna punti
      // In produzione: await addPoints(user.id, 'COMMENT_CREATED')
    }
  }

  // Share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copiato!')
    }
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="text-sm text-gray-500">
                {SECTIONS_CONFIG[post.section].icon} {SECTIONS_CONFIG[post.section].label}
              </span>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Post */}
        <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Post header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {post.authorPhoto ? (
                  <img 
                    src={post.authorPhoto} 
                    alt={post.authorName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-lg">
                      {post.authorName.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-charcoal">{post.authorName}</span>
                    {post.authorRole === 'coach' && <span className="text-sm">⭐</span>}
                    {post.authorRole === 'admin' && <span className="text-sm">👑</span>}
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
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(post.createdAt)}
                  </p>
                </div>
              </div>
              
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreHorizontal size={20} className="text-gray-400" />
              </button>
            </div>

            <h1 className="text-2xl font-display font-bold text-charcoal mb-4">
              {post.title}
            </h1>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Link 
                    key={tag}
                    href={`/community?tag=${tag}`}
                    className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Post content */}
          <div className="p-6">
            <div 
              className="prose prose-gray max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
            />
          </div>

          {/* Post actions */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={handleLikePost}
                className={`flex items-center gap-2 transition-colors ${
                  isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
                <span className="font-medium">{post.likeCount}</span>
              </button>
              
              <button className="flex items-center gap-2 text-gray-500">
                <MessageCircle size={22} />
                <span className="font-medium">{post.commentCount}</span>
              </button>
              
              <button 
                onClick={handleSavePost}
                className={`flex items-center gap-2 transition-colors ${
                  isSaved ? 'text-primary-500' : 'text-gray-500 hover:text-primary-500'
                }`}
              >
                <Bookmark size={22} fill={isSaved ? 'currentColor' : 'none'} />
                <span className="font-medium">{post.saveCount}</span>
              </button>
            </div>

            <button 
              onClick={handleShare}
              className="flex items-center gap-2 text-gray-500 hover:text-charcoal transition-colors"
            >
              <Share2 size={20} />
              <span className="text-sm">Condividi</span>
            </button>
          </div>
        </article>

        {/* Comments section */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-charcoal mb-4">
            Commenti ({comments.length})
          </h2>

          {/* New comment form */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            {replyingTo && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-3">
                <span className="text-sm text-gray-500">
                  Stai rispondendo a {comments.find(c => c.id === replyingTo)?.authorName}
                </span>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                {user?.photo ? (
                  <img src={user.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User size={20} className="text-primary-500" />
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrivi un commento..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 resize-none focus:outline-none focus:border-primary-500 text-sm"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="btn bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 text-sm"
                  >
                    <Send size={16} />
                    Pubblica
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments list */}
          <div className="space-y-4">
            <AnimatePresence>
              {comments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-xl p-4 shadow-sm ${
                    comment.parentCommentId ? 'ml-8 border-l-2 border-primary-200' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {comment.authorPhoto ? (
                        <img 
                          src={comment.authorPhoto} 
                          alt={comment.authorName}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">
                            {comment.authorName.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-charcoal text-sm">
                          {comment.authorName}
                        </span>
                        {comment.authorRole === 'coach' && (
                          <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
                            Coach
                          </span>
                        )}
                        {comment.authorRole === 'admin' && (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                            Admin
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                      
                      {/* Comment actions */}
                      <div className="flex items-center gap-4 mt-2">
                        <button 
                          onClick={() => handleLikeComment(comment.id)}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            likedComments.has(comment.id) 
                              ? 'text-red-500' 
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <Heart size={14} fill={likedComments.has(comment.id) ? 'currentColor' : 'none'} />
                          {comment.likeCount}
                        </button>
                        <button 
                          onClick={() => setReplyingTo(comment.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-500"
                        >
                          <Reply size={14} />
                          Rispondi
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  )
}

// Mancava import X
import { X } from 'lucide-react'
