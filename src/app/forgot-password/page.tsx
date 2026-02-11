'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import Logo from '@/components/Logo'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setError('')

    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSent(true)
    } catch (err: any) {
      console.error('Errore reset password:', err)
      if (err.code === 'auth/user-not-found') {
        setError('Nessun account trovato con questa email.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Indirizzo email non valido.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Troppi tentativi. Riprova tra qualche minuto.')
      } else {
        setError('Errore durante l\'invio. Riprova.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-charcoal mb-2">Email inviata!</h2>
            <p className="text-gray-500 mb-6">
              Abbiamo inviato un link per reimpostare la password a <strong>{email}</strong>. 
              Controlla anche la cartella spam.
            </p>
            <Link href="/login" className="btn btn-primary w-full justify-center">
              Torna al Login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-charcoal text-center mb-2">
              Password dimenticata?
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Inserisci la tua email e ti invieremo un link per reimpostarla.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="la-tua@email.it"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full btn btn-primary py-3 justify-center disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Invio in corso...
                  </>
                ) : (
                  'Invia link di reset'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-primary-500 hover:underline inline-flex items-center gap-1">
                <ArrowLeft size={14} />
                Torna al Login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

