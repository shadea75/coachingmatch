'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, Mail, Calendar, ArrowRight } from 'lucide-react'
import Logo from '@/components/Logo'

export default function ApplicationSuccessPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-100">
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
            Candidatura inviata!
          </h1>
          
          <p className="text-gray-500 mb-8">
            Grazie per aver scelto di far parte di CoachaMi. 
            La tua candidatura è stata ricevuta e sarà revisionata dal nostro team.
          </p>
          
          {/* Next steps */}
          <div className="bg-white rounded-2xl p-6 text-left mb-8">
            <h2 className="font-semibold text-charcoal mb-4">Prossimi passi:</h2>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-charcoal">Email di conferma</p>
                  <p className="text-sm text-gray-500">
                    Riceverai un'email di conferma entro pochi minuti
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-bold">48h</span>
                </div>
                <div>
                  <p className="font-medium text-charcoal">Revisione candidatura</p>
                  <p className="text-sm text-gray-500">
                    Il nostro team esaminerà i tuoi documenti entro 48 ore
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-charcoal">Call conoscitiva</p>
                  <p className="text-sm text-gray-500">
                    Ti contatteremo per una breve call di 15-20 minuti
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
