'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle } from 'lucide-react'
import Logo from '@/components/Logo'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simula invio (in produzione: inviare a un'API)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-charcoal transition-colors">
            <ArrowLeft size={18} />
            Torna alla home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-display font-bold text-charcoal mb-4">
              Contattaci
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto">
              Hai domande, suggerimenti o hai bisogno di assistenza? 
              Siamo qui per aiutarti. Compila il form o scrivici direttamente.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="font-semibold text-charcoal mb-2">Email Supporto</h3>
                <p className="text-gray-500 text-sm mb-3">Per assistenza generale</p>
                <a href="mailto:supporto@coachami.it" className="text-primary-500 hover:underline">
                  supporto@coachami.it
                </a>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="font-semibold text-charcoal mb-2">Per i Coach</h3>
                <p className="text-gray-500 text-sm mb-3">Candidature e informazioni</p>
                <a href="mailto:coach@coachami.it" className="text-primary-500 hover:underline">
                  coach@coachami.it
                </a>
              </div>

              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-2">Vuoi diventare Coach?</h3>
                <p className="text-primary-100 text-sm mb-4">
                  Unisciti alla nostra community di coach professionisti
                </p>
                <Link 
                  href="/coach/register"
                  className="inline-block bg-white text-primary-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary-50 transition-colors"
                >
                  Registrati come Coach
                </Link>
              </div>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-charcoal mb-3">
                      Messaggio inviato!
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Grazie per averci contattato. Ti risponderemo il prima possibile.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false)
                        setFormData({ name: '', email: '', subject: '', message: '' })
                      }}
                      className="text-primary-500 hover:underline"
                    >
                      Invia un altro messaggio
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-charcoal mb-6">
                      Inviaci un messaggio
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label className="label">Nome *</label>
                          <input
                            type="text"
                            required
                            className="input"
                            placeholder="Il tuo nome"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Email *</label>
                          <input
                            type="email"
                            required
                            className="input"
                            placeholder="nome@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Oggetto *</label>
                        <select
                          required
                          className="input"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        >
                          <option value="">Seleziona un argomento</option>
                          <option value="info">Informazioni generali</option>
                          <option value="support">Assistenza tecnica</option>
                          <option value="billing">Fatturazione e pagamenti</option>
                          <option value="coach">Diventare coach</option>
                          <option value="partnership">Partnership e collaborazioni</option>
                          <option value="feedback">Feedback e suggerimenti</option>
                          <option value="other">Altro</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Messaggio *</label>
                        <textarea
                          required
                          rows={5}
                          className="input resize-none"
                          placeholder="Scrivi il tuo messaggio..."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <p className="text-sm text-gray-400">
                          * Campi obbligatori
                        </p>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="btn bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            'Invio in corso...'
                          ) : (
                            <>
                              <Send size={18} />
                              Invia messaggio
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* FAQ Preview */}
          <div className="mt-16">
            <h2 className="text-2xl font-display font-bold text-charcoal text-center mb-8">
              Domande frequenti
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  q: 'Come funziona il matching con i coach?',
                  a: 'Dopo aver completato il questionario sulla Ruota della Vita, il nostro algoritmo analizza le tue risposte e i tuoi obiettivi per suggerirti i coach più adatti alle tue esigenze.'
                },
                {
                  q: 'Le sessioni sono online o in presenza?',
                  a: 'Dipende dal coach scelto. Molti offrono sessioni online, mentre alcuni sono disponibili anche per incontri in presenza in determinate città.'
                },
                {
                  q: 'Quanto costa una sessione di coaching?',
                  a: 'I prezzi variano in base al coach e alla tipologia di sessione. Puoi contattare direttamente il coach via chat per conoscerlo prima di iniziare un percorso.'
                },
                {
                  q: 'Come posso diventare coach sulla piattaforma?',
                  a: 'Puoi candidarti dalla pagina "Diventa Coach". Richiediamo certificazioni riconosciute e valutiamo ogni candidatura per garantire la qualità del servizio.'
                },
              ].map((faq, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-charcoal mb-2">{faq.q}</h3>
                  <p className="text-gray-600 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100 mt-12">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-400">
          © 2025 CoachaMi. Tutti i diritti riservati.
        </div>
      </footer>
    </div>
  )
}
