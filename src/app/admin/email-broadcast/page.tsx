'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Mail,
  Users,
  Send,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore'
import AdminLayout from '@/components/AdminLayout'

// =====================
// TIPI
// =====================

interface Coach {
  id: string
  email: string
  name: string
  lifeArea?: string
  status: string
  subscriptionStatus?: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: 'announcement' | 'engagement' | 'promotion' | 'update' | 'custom'
  createdAt: Date
  updatedAt: Date
}

interface SendResult {
  success: number
  failed: number
  errors: string[]
}

// =====================
// TEMPLATE DI DEFAULT
// =====================

const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Benvenuto Nuovo Coach',
    subject: 'Benvenuto in CoachaMi! 🎉',
    body: `Ciao {{name}},

Benvenuto nella famiglia CoachaMi! Siamo entusiasti di averti con noi.

Ecco i prossimi passi per iniziare:
1. Completa il tuo profilo al 100%
2. Imposta la tua disponibilità nel calendario
3. Pubblica il tuo primo post nella Community

Se hai domande, siamo qui per te!

A presto,
Il Team CoachaMi`,
    category: 'announcement'
  },
  {
    name: 'Promemoria Attività',
    subject: '{{name}}, i tuoi coachee ti aspettano! 💫',
    body: `Ciao {{name}},

È passato un po' di tempo dalla tua ultima attività su CoachaMi.

Sapevi che i coach attivi ricevono fino al 3x più richieste?

Ecco alcune idee per tornare in pista:
• Pubblica un post con un insight utile
• Aggiorna la tua bio
• Rispondi a qualche discussione nella Community

Ci vediamo su CoachaMi!

Il Team CoachaMi`,
    category: 'engagement'
  },
  {
    name: 'Nuova Funzionalità',
    subject: '🚀 Nuova funzionalità su CoachaMi!',
    body: `Ciao {{name}},

Abbiamo una novità che ti piacerà!

[Descrivi la nuova funzionalità qui]

Come usarla:
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

Provala subito e facci sapere cosa ne pensi!

Il Team CoachaMi`,
    category: 'update'
  },
  {
    name: 'Promozione Speciale',
    subject: '🎁 Un\'offerta speciale per te, {{name}}!',
    body: `Ciao {{name}},

Abbiamo preparato qualcosa di speciale per te!

[Descrivi l'offerta qui]

Questa offerta è valida fino al [data].

Non perdertela!

Il Team CoachaMi`,
    category: 'promotion'
  }
]

// =====================
// COMPONENTE PRINCIPALE
// =====================

export default function EmailBroadcastPage() {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  
  // Stati
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedCoaches, setSelectedCoaches] = useState<Set<string>>(new Set())
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  
  // Filtri
  const [filterArea, setFilterArea] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Email form
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  
  // Template editor
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [templateCategory, setTemplateCategory] = useState<EmailTemplate['category']>('custom')

  // Carica dati
  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard')
      return
    }
    
    loadData()
  }, [isAdmin, router])

  const loadData = async () => {
    try {
      // Carica coach
      const coachesQuery = query(
        collection(db, 'coachApplications'),
        where('status', '==', 'approved')
      )
      const coachesSnapshot = await getDocs(coachesQuery)
      const loadedCoaches: Coach[] = coachesSnapshot.docs
        .filter(doc => doc.data().email) // Solo con email
        .map(doc => ({
          id: doc.id,
          email: doc.data().email,
          name: doc.data().name || 'Coach',
          lifeArea: doc.data().lifeArea,
          status: doc.data().status,
          subscriptionStatus: doc.data().subscriptionStatus
        }))
      setCoaches(loadedCoaches)
      
      // Carica template salvati
      const templatesSnapshot = await getDocs(collection(db, 'emailTemplates'))
      if (templatesSnapshot.empty) {
        // Inizializza template di default
        const defaultTemplates: EmailTemplate[] = DEFAULT_TEMPLATES.map((t, i) => ({
          ...t,
          id: `template_${i}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
        setTemplates(defaultTemplates)
        
        // Salva i default
        for (const template of defaultTemplates) {
          await setDoc(doc(db, 'emailTemplates', template.id), {
            ...template,
            createdAt: Timestamp.fromDate(template.createdAt),
            updatedAt: Timestamp.fromDate(template.updatedAt)
          })
        }
      } else {
        const loadedTemplates: EmailTemplate[] = templatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as EmailTemplate[]
        setTemplates(loadedTemplates)
      }
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtra coach
  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = 
      coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesArea = filterArea === 'all' || coach.lifeArea === filterArea
    const matchesStatus = filterStatus === 'all' || coach.subscriptionStatus === filterStatus
    return matchesSearch && matchesArea && matchesStatus
  })

  // Seleziona/deseleziona tutti
  const toggleSelectAll = () => {
    if (selectedCoaches.size === filteredCoaches.length) {
      setSelectedCoaches(new Set())
    } else {
      setSelectedCoaches(new Set(filteredCoaches.map(c => c.id)))
    }
  }

  // Toggle singolo coach
  const toggleCoach = (coachId: string) => {
    const newSelected = new Set(selectedCoaches)
    if (newSelected.has(coachId)) {
      newSelected.delete(coachId)
    } else {
      newSelected.add(coachId)
    }
    setSelectedCoaches(newSelected)
  }

  // Applica template
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSubject(template.subject)
      setBody(template.body)
      setSelectedTemplate(templateId)
    }
  }

  // Salva template
  const saveTemplate = async () => {
    if (!templateName || !templateSubject || !templateBody) return
    
    const templateId = editingTemplate?.id || `template_${Date.now()}`
    const templateData: EmailTemplate = {
      id: templateId,
      name: templateName,
      subject: templateSubject,
      body: templateBody,
      category: templateCategory,
      createdAt: editingTemplate?.createdAt || new Date(),
      updatedAt: new Date()
    }
    
    await setDoc(doc(db, 'emailTemplates', templateId), {
      ...templateData,
      createdAt: Timestamp.fromDate(templateData.createdAt),
      updatedAt: Timestamp.fromDate(templateData.updatedAt)
    })
    
    if (editingTemplate) {
      setTemplates(templates.map(t => t.id === templateId ? templateData : t))
    } else {
      setTemplates([...templates, templateData])
    }
    
    resetTemplateEditor()
  }

  // Elimina template
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo template?')) return
    
    await deleteDoc(doc(db, 'emailTemplates', templateId))
    setTemplates(templates.filter(t => t.id !== templateId))
  }

  // Reset template editor
  const resetTemplateEditor = () => {
    setShowTemplateEditor(false)
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateSubject('')
    setTemplateBody('')
    setTemplateCategory('custom')
  }

  // Modifica template
  const editTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateSubject(template.subject)
    setTemplateBody(template.body)
    setTemplateCategory(template.category)
    setShowTemplateEditor(true)
  }

  // Invia email
  const sendEmails = async () => {
    if (selectedCoaches.size === 0 || !subject || !body) {
      alert('Seleziona almeno un coach e compila oggetto e messaggio')
      return
    }
    
    if (!confirm(`Stai per inviare un'email a ${selectedCoaches.size} coach. Continuare?`)) {
      return
    }
    
    setSending(true)
    setSendResult(null)
    
    try {
      const selectedCoachList = coaches.filter(c => selectedCoaches.has(c.id))
      
      const response = await fetch('/api/admin/send-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coaches: selectedCoachList,
          subject,
          body
        })
      })
      
      const result = await response.json()
      setSendResult(result)
      
      if (result.success > 0) {
        // Reset form
        setSubject('')
        setBody('')
        setSelectedTemplate('')
        setSelectedCoaches(new Set())
      }
      
    } catch (error: any) {
      console.error('Error sending emails:', error)
      setSendResult({
        success: 0,
        failed: selectedCoaches.size,
        errors: [error.message]
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary-500" size={40} />
        </div>
      </AdminLayout>
    )
  }

  const CATEGORY_LABELS: Record<EmailTemplate['category'], string> = {
    announcement: '📢 Annuncio',
    engagement: '💪 Engagement',
    promotion: '🎁 Promozione',
    update: '🚀 Aggiornamento',
    custom: '✏️ Personalizzato'
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-charcoal flex items-center gap-2">
            <Mail className="text-primary-500" />
            Email Broadcast
          </h1>
          <p className="text-gray-500 mt-1">
            Invia email di massa ai coach selezionati
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonna sinistra: Selezione Coach */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Users size={18} />
                Seleziona Destinatari
              </h2>
              
              {/* Filtri */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Cerca coach..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                  >
                    <option value="all">Tutte le aree</option>
                    <option value="salute">Salute</option>
                    <option value="finanze">Finanze</option>
                    <option value="carriera">Carriera</option>
                    <option value="relazioni">Relazioni</option>
                    <option value="amore">Amore</option>
                    <option value="crescita">Crescita</option>
                    <option value="spiritualita">Spiritualità</option>
                    <option value="divertimento">Divertimento</option>
                  </select>
                  
                  <select
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Tutti</option>
                    <option value="active">Abbonamento Attivo</option>
                    <option value="trial">In Prova</option>
                    <option value="free">Gratuito</option>
                  </select>
                </div>
              </div>
              
              {/* Seleziona tutti */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCoaches.size === filteredCoaches.length && filteredCoaches.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-primary-500 rounded"
                  />
                  <span className="text-sm font-medium">Seleziona tutti ({filteredCoaches.length})</span>
                </label>
                <span className="text-sm text-primary-500 font-semibold">
                  {selectedCoaches.size} selezionati
                </span>
              </div>
              
              {/* Lista coach */}
              <div className="max-h-[400px] overflow-y-auto space-y-1">
                {filteredCoaches.map(coach => (
                  <label
                    key={coach.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedCoaches.has(coach.id) ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCoaches.has(coach.id)}
                      onChange={() => toggleCoach(coach.id)}
                      className="w-4 h-4 text-primary-500 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">{coach.name}</p>
                      <p className="text-xs text-gray-400 truncate">{coach.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Colonna centrale: Composer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <FileText size={18} />
                Componi Email
              </h2>
              
              {/* Template selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usa un Template
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={selectedTemplate}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    <option value="">-- Seleziona template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {CATEGORY_LABELS[t.category]} {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowTemplateEditor(true)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Crea nuovo template"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              
              {/* Subject */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oggetto *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Oggetto dell'email..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Usa {"{{name}}"} per inserire il nome del coach
                </p>
              </div>
              
              {/* Body */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Messaggio *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[250px] font-mono text-sm"
                  placeholder="Scrivi il messaggio..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variabili disponibili: {"{{name}}"}, {"{{email}}"}
                </p>
              </div>
              
              {/* Send Result */}
              {sendResult && (
                <div className={`mb-4 p-4 rounded-lg ${
                  sendResult.failed === 0 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {sendResult.failed === 0 ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <AlertCircle size={18} />
                    )}
                    <span className="font-medium">
                      {sendResult.success} email inviate con successo
                      {sendResult.failed > 0 && `, ${sendResult.failed} fallite`}
                    </span>
                  </div>
                  {sendResult.errors.length > 0 && (
                    <ul className="mt-2 text-sm">
                      {sendResult.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              {/* Send button */}
              <button
                onClick={sendEmails}
                disabled={sending || selectedCoaches.size === 0 || !subject || !body}
                className="w-full btn btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Invia a {selectedCoaches.size} coach
                  </>
                )}
              </button>
            </div>

            {/* Template Manager */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText size={18} />
                  I Tuoi Template
                </span>
                <button
                  onClick={() => setShowTemplateEditor(true)}
                  className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Nuovo
                </button>
              </h2>
              
              <div className="space-y-2">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-charcoal">
                        {CATEGORY_LABELS[template.category]} {template.name}
                      </p>
                      <p className="text-xs text-gray-400">{template.subject}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => applyTemplate(template.id)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Usa template"
                      >
                        <Send size={14} className="text-gray-500" />
                      </button>
                      <button
                        onClick={() => editTemplate(template)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Modifica"
                      >
                        <Edit3 size={14} className="text-gray-500" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Template Editor Modal */}
        {showTemplateEditor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
                </h3>
                <button onClick={resetTemplateEditor} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Template *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Es: Benvenuto Nuovo Coach"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={templateCategory}
                      onChange={(e) => setTemplateCategory(e.target.value as EmailTemplate['category'])}
                    >
                      <option value="announcement">📢 Annuncio</option>
                      <option value="engagement">💪 Engagement</option>
                      <option value="promotion">🎁 Promozione</option>
                      <option value="update">🚀 Aggiornamento</option>
                      <option value="custom">✏️ Personalizzato</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Oggetto *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Oggetto dell'email..."
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corpo Email *
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[200px] font-mono text-sm"
                    placeholder="Scrivi il template..."
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Variabili: {"{{name}}"}, {"{{email}}"}
                  </p>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={resetTemplateEditor}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={!templateName || !templateSubject || !templateBody}
                  className="btn btn-primary disabled:opacity-50"
                >
                  <Save size={16} />
                  Salva Template
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
