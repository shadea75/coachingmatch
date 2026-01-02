'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, Mail, Clock, ArrowRight } from 'lucide-react'
import Logo from '@/components/Logo'

export default function CoachRegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>
      </header>
      
      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg text-center"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </motion.div>
          
          <h1 className="text-3xl font-display font-bold text-charcoal mb-4">
            Registrazione completata!
          </h1>
          
          <p className="text-gray-500 mb-8">
            Grazie per esserti registrato come coach su CoachaMi. 
            La tua candidatura è stata ricevuta e sarà revisionata dal nostro team.
          </p>
          
          {/* Next steps */}
          <div className="bg-white rounded-2xl p-6 text-left mb-8 shadow-sm">
            <h2 className="font-semibold text-charcoal mb-4">Prossimi passi:</h2>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-charcoal">Controlla la tua email</p>
                  <p className="text-sm text-gray-500">
                    Ti abbiamo inviato un'email di conferma
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-charcoal">Attendi la revisione</p>
                  <p className="text-sm text-gray-500">
                    Esamineremo il tuo profilo entro 48 ore lavorative
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-charcoal">Inizia a ricevere clienti</p>
                  <p className="text-sm text-gray-500">
                    Una volta approvato, il tuo profilo sarà visibile ai coachee
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA */}
          <div className="space-y-3">
            <Link href="/" className="btn btn-primary w-full">
              Torna alla home
              <ArrowRight size={18} />
            </Link>
            
            <p className="text-sm text-gray-400">
              Hai domande? Scrivici a{' '}
              <a href="mailto:coach@coachami.it" className="text-primary-500 hover:underline">
                coach@coachami.it
              </a>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
