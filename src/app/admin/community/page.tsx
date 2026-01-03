'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { MessageSquare, Trash2, Pin, Eye, AlertTriangle, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore'

interface Post {
  id: string
  title: string
  authorName: string
  authorRole: string
  section: string
  likeCount: number
  commentCount: number
  isPinned: boolean
  createdAt: Date
}

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const postsQuery = query(collection(db, 'communityPosts'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(postsQuery)
      const loadedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || 'Senza titolo',
        authorName: doc.data().authorName || 'Anonimo',
        authorRole: doc.data().authorRole || 'coachee',
        section: doc.data().section || 'general',
        likeCount: doc.data().likeCount || 0,
        commentCount: doc.data().commentCount || 0,
        isPinned: doc.data().isPinned || false,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }))
      setPosts(loadedPosts)
    } catch (err) {
      console.error('Errore caricamento post:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo post?')) return
    
    try {
      await deleteDoc(doc(db, 'communityPosts', postId))
      setPosts(posts.filter(p => p.id !== postId))
    } catch (err) {
      console.error('Errore eliminazione:', err)
    }
  }

  const handleTogglePin = async (postId: string, currentPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'communityPosts', postId), {
        isPinned: !currentPinned
      })
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, isPinned: !currentPinned } : p
      ))
    } catch (err) {
      console.error('Errore pin:', err)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Community</h1>
            <p className="text-gray-500">Gestisci i post della community</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border">
            <span className="text-2xl font-bold text-charcoal">{posts.length}</span>
            <span className="text-gray-500 ml-2">post totali</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nessun post nella community</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Post</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Autore</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Sezione</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Like</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Commenti</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map(post => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {post.isPinned && <Pin size={14} className="text-primary-500" />}
                        <span className="font-medium text-charcoal">{post.title}</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {post.createdAt.toLocaleDateString('it-IT')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">{post.authorName}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        post.authorRole === 'coach' ? 'bg-primary-100 text-primary-700' :
                        post.authorRole === 'admin' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {post.authorRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {post.section}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700">
                      {post.likeCount}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700">
                      {post.commentCount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTogglePin(post.id, post.isPinned)}
                          className={`p-2 rounded-lg transition-colors ${
                            post.isPinned ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-500'
                          }`}
                          title={post.isPinned ? 'Rimuovi pin' : 'Fissa in alto'}
                        >
                          <Pin size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
