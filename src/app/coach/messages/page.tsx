'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Send,
  MessageCircle,
  Search,
  Loader2,
  CheckCheck,
  ArrowLeft
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { filterMessage } from '@/lib/messageFilter'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  getDoc,
  limit
} from 'firebase/firestore'
import { format, isToday, isYesterday } from 'date-fns'
import { it } from 'date-fns/locale'

interface Conversation {
  id: string
  participants: string[]
  participantNames: Record<string, string>
  participantPhotos: Record<string, string | null>
  participantRoles: Record<string, string>
  lastMessage: string
  lastMessageAt: Date
  lastMessageBy: string
  unreadCount: Record<string, number>
  createdAt: Date
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  text: string
  createdAt: Date
  read: boolean
}

function formatMessageDate(date: Date): string {
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Ieri'
  return format(date, 'dd/MM/yy')
}

function formatMessageTime(date: Date): string {
  return format(date, 'HH:mm')
}

function formatChatDate(date: Date): string {
  if (isToday(date)) return 'Oggi'
  if (isYesterday(date)) return 'Ieri'
  return format(date, "EEEE d MMMM yyyy", { locale: it })
}

export default function CoachMessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}

function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterWarning, setFilterWarning] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const targetCoachId = searchParams.get('coachId')
  const targetCoachName = searchParams.get('coachName')
  const initialMessage = searchParams.get('message')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Carica conversazioni
  useEffect(() => {
    if (!user?.id) return

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.id),
      orderBy('lastMessageAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          participants: data.participants || [],
          participantNames: data.participantNames || {},
          participantPhotos: data.participantPhotos || {},
          participantRoles: data.participantRoles || {},
          lastMessage: data.lastMessage || '',
          lastMessageAt: data.lastMessageAt?.toDate?.() || new Date(),
          lastMessageBy: data.lastMessageBy || '',
          unreadCount: data.unreadCount || {},
          createdAt: data.createdAt?.toDate?.() || new Date()
        }
      })
      setConversations(convs)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user?.id])

  // Carica messaggi
  useEffect(() => {
    if (!selectedConversation || !user?.id) return

    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', selectedConversation),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderName: data.senderName,
          text: data.text,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          read: data.read || false
        }
      })
      setMessages(msgs)
      markAsRead(selectedConversation)
    })

    return () => unsubscribe()
  }, [selectedConversation, user?.id])

  const markAsRead = async (conversationId: string) => {
    if (!user?.id) return
    try {
      await updateDoc(doc(db, 'conversations', conversationId), {
        [`unreadCount.${user.id}`]: 0
      })
    } catch (err) {
      console.error('Errore mark as read:', err)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id || isSending) return

    // Filtra contatti dal messaggio
    const { filteredText, wasFiltered, blocked, warningMessage } = filterMessage(newMessage.trim())
    
    if (blocked) {
      setFilterWarning(warningMessage)
      setTimeout(() => setFilterWarning(null), 6000)
      setNewMessage('')
      return
    }

    if (wasFiltered) {
      setFilterWarning(warningMessage)
      setTimeout(() => setFilterWarning(null), 6000)
    }

    const messageText = filteredText
    setNewMessage('')
    setIsSending(true)

    try {
      await addDoc(collection(db, 'messages'), {
        conversationId: selectedConversation,
        senderId: user.id,
        senderName: user.name || user.email?.split('@')[0] || 'Utente',
        text: messageText,
        createdAt: serverTimestamp(),
        read: false
      })

      const conv = conversations.find(c => c.id === selectedConversation)
      const otherUserId = conv?.participants.find(p => p !== user.id)

      await updateDoc(doc(db, 'conversations', selectedConversation), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        lastMessageBy: user.id,
        ...(otherUserId ? { [`unreadCount.${otherUserId}`]: (conv?.unreadCount?.[otherUserId] || 0) + 1 } : {})
      })

      // Email notifica
      if (otherUserId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', otherUserId))
          const otherEmail = userDoc.data()?.email
          const otherName = conv?.participantNames?.[otherUserId] || ''
          if (otherEmail) {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'new_message',
                data: {
                  recipientEmail: otherEmail,
                  recipientName: otherName,
                  senderName: user.name || user.email?.split('@')[0],
                  messagePreview: messageText.substring(0, 100),
                  conversationUrl: `https://www.coachami.it/messages?conversationId=${selectedConversation}`
                }
              })
            })
          }
        } catch (e) {
          console.error('Errore invio email notifica:', e)
        }
      }
    } catch (err) {
      console.error('Errore invio messaggio:', err)
      setNewMessage(messageText)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participants.find(p => p !== user?.id) || ''
    return {
      id: otherId,
      name: conv.participantNames[otherId] || 'Utente',
      photo: conv.participantPhotos[otherId] || null,
      role: conv.participantRoles[otherId] || 'coachee'
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true
    const other = getOtherParticipant(conv)
    return other.name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const currentConversation = conversations.find(c => c.id === selectedConversation)
  const currentOther = currentConversation ? getOtherParticipant(currentConversation) : null

  // Raggruppa messaggi per data
  const groupedMessages: { date: string; messages: Message[] }[] = []
  messages.forEach(msg => {
    const dateStr = formatChatDate(msg.createdAt)
    const lastGroup = groupedMessages[groupedMessages.length - 1]
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.messages.push(msg)
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] })
    }
  })

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-2xl font-bold text-charcoal mb-6">Messaggi</h1>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        <div className="flex h-full">
          {/* Lista conversazioni */}
          <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-200 flex flex-col
            ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca conversazione..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-primary-500" size={24} />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-sm">Nessuna conversazione ancora</p>
                </div>
              ) : (
                filteredConversations.map(conv => {
                  const other = getOtherParticipant(conv)
                  const unread = conv.unreadCount?.[user?.id || ''] || 0
                  const isSelected = selectedConversation === conv.id

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left
                        ${isSelected ? 'bg-primary-50' : ''}`}
                    >
                      {other.photo ? (
                        <img src={other.photo} alt={other.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-600 font-semibold">{other.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium truncate ${unread > 0 ? 'text-charcoal' : 'text-gray-700'}`}>{other.name}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatMessageDate(conv.lastMessageAt)}</span>
                        </div>
                        <p className={`text-sm truncate ${unread > 0 ? 'text-charcoal font-medium' : 'text-gray-500'}`}>
                          {conv.lastMessage || 'Nuova conversazione'}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation && currentOther ? (
              <>
                {/* Chat header */}
                <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  {currentOther.photo ? (
                    <img src={currentOther.photo} alt={currentOther.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-600 font-semibold">{currentOther.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-charcoal">{currentOther.name}</p>
                    <p className="text-xs text-primary-500 capitalize">{currentOther.role}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle size={40} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 text-sm">Inizia la conversazione con {currentOther.name}</p>
                    </div>
                  ) : (
                    groupedMessages.map((group, gi) => (
                      <div key={gi}>
                        <div className="flex items-center justify-center my-4">
                          <span className="bg-white text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">{group.date}</span>
                        </div>
                        {group.messages.map((msg) => {
                          const isMe = msg.senderId === user?.id
                          return (
                            <div key={msg.id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                isMe ? 'bg-primary-500 text-white rounded-br-md' : 'bg-white text-charcoal rounded-bl-md shadow-sm'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                  {formatMessageTime(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Filter Warning */}
                <AnimatePresence>
                  {filterWarning && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mx-3 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-2"
                    >
                      <span className="text-lg leading-none">🔒</span>
                      <span>{filterWarning}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input */}
                <div className="border-t border-gray-100 p-3 flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Scrivi un messaggio..."
                      rows={1}
                      className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-primary-100 outline-none resize-none text-sm max-h-32"
                      style={{ minHeight: '44px' }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageCircle size={64} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">Seleziona una conversazione</p>
                  <p className="text-gray-400 text-sm mt-1">Scegli dalla lista a sinistra</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
