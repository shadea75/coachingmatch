'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Image, 
  X, 
  Loader2,
  Send,
  Hash
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import { CommunitySection, SECTIONS_CONFIG } from '@/types/community'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { addPoints, incrementMonthlyPosts } from '@/lib/coachPoints'

export default function NewPostPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    section: '' as CommunitySection | '',
    tags: [] as string[],
    tagInput: ''
  })

  const userRole = user?.role || 'coachee'

  // Sezioni disponibili per l'utente
  const availableSections = Object.entries(SECTIONS_CONFIG).filter(([key, config]) => 
    config.allowedRoles.includes(userRole as any)
  )

  // Aggiungi tag
  const addTag = () => {
    const tag = formData.tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag],
        tagInput: ''
      })
    }
  }

  // Rimuovi tag
  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    })
  }

  // Submit post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.title.trim()) {
      setError('Inserisci un titolo')
      return
    }
    if (!formData.content.trim()) {
      setError('Inserisci il contenuto del post')
      return
    }
    if (!formData.section) {
      setError('Seleziona una sezione')
      return
    }

    setIsSubmitting(true)

    try {
      // Crea il post
      await addDoc(collection(db, 'communityPosts'), {
        authorId: user?.id,
        authorName: user?.name || 'Utente',
        authorPhoto: user?.photo || null,
        authorRole: userRole,
        section: formData.section,
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tags,
        likeCount: 0,
        commentCount: 0,
        saveCount: 0,
        isPinned: false,
        isHighlighted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // Se è un coach, aggiungi punti
      if (userRole === 'coach' && user?.id) {
        await addPoints(user.id, 'POST_CREATED')
        await incrementMonthlyPosts(user.id)
      }

      router.push('/community')
    } catch (err: any) {
      console.error('Errore creazione post:', err)
      setError('Errore durante la pubblicazione. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/community"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-lg font-semibold text-charcoal">Nuovo Post</h1>
            </div>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 md:p-8 shadow-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selezione sezione */}
            <div>
              <label className="label">Pubblica in *</label>
              {availableSections.length === 0 ? (
                <p className="text-red-500 text-sm">
                  Non hai i permessi per pubblicare in nessuna sezione.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableSections.map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, section: key as CommunitySection })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.section === key
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <p className="font-semibold text-charcoal">{config.label}</p>
                          <p className="text-xs text-gray-500">{config.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Titolo */}
            <div>
              <label className="label">Titolo *</label>
              <input
                type="text"
                className="input"
                placeholder="Un titolo accattivante per il tuo post..."
                maxLength={150}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                {formData.title.length}/150 caratteri
              </p>
            </div>

            {/* Contenuto */}
            <div>
              <label className="label">Contenuto *</label>
              <textarea
                className="input min-h-[200px] resize-none"
                placeholder="Scrivi il tuo post... Puoi usare **grassetto** e *corsivo*"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Supporta formattazione Markdown base
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="label">Tags (max 5)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map(tag => (
                  <span 
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-sm"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-primary-800"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="input pl-9"
                    placeholder="Aggiungi un tag..."
                    value={formData.tagInput}
                    onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    disabled={formData.tags.length >= 5}
                  />
                </div>
                <button
                  type="button"
                  onClick={addTag}
                  disabled={formData.tags.length >= 5}
                  className="btn bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                >
                  Aggiungi
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {/* Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <Link 
                href="/community"
                className="text-gray-500 hover:text-charcoal"
              >
                Annulla
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || availableSections.length === 0}
                className="btn bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Pubblicazione...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Pubblica
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Tips per coach */}
          {userRole === 'coach' && (
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>💡 Tip:</strong> Pubblicando un post guadagni <strong>10 punti</strong>. 
                Ricorda di pubblicare almeno 4 post al mese per mantenere attivo il tuo profilo!
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
