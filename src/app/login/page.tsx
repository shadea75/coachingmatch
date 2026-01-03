'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'

// Email admin hardcoded
const ADMIN_EMAILS = ['debora.carofiglio@gmail.com']

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signInWithGoogle, user, loading } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Se già loggato, redirect in base al ruolo
  useEffect(() => {
    if (!loading && user) {
      redirectByRole(user.role, user.email)
    }
  }, [user, loading])

  // Funzione per redirect in base al ruolo
  const redirectByRole = (userRole: string | undefined, userEmail: string | undefined) => {
    // Check admin per ruolo O per email
    const isAdmin = userRole === 'admin' || 
      (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase()))
    
    if (isAdmin) {
      window.location.href = '/admin'
    } else if (userRole === 'coach') {
      window.location.href = '/coach/dashboard'
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const userCredential = await signIn(email, password)
      // Dopo login, redirect basato su ruolo
      // Il ruolo viene dal AuthContext dopo il fetch da Firebase
      setTimeout(() => {
        // Controlla prima se è admin per email
        if (ADMIN_EMAILS.includes(email.toLowerCase())) {
          window.location.href = '/admin'
        }
      }, 500)
    } catch (err: any) {
      setError(err.message || 'Errore durante il login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setIsLoading(true)

    try {
      await signInWithGoogle()
      // Redirect gestito da useEffect dopo che user viene aggiornato
    } catch (err: any) {
      setError(err.message || 'Errore durante il login con Google')
    } finally {
      setIsLoading(false)
    }
  }

  // Se sta caricando auth, mostra loading
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo size="lg" />
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">
            Bentornato!
          </h1>
          <p className="mt-2 text-gray-600">
            Accedi al tuo account
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="nome@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                <span className="ml-2 text-gray-600">Ricordami</span>
              </label>
              <Link href="/forgot-password" className="text-primary-500 hover:text-primary-600">
                Password dimenticata?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  Accedi
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Oppure</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mt-4 w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continua con Google
            </button>
          </div>
        </div>

        {/* Link registrazione */}
        <p className="mt-6 text-center text-gray-600">
          Non hai un account?{' '}
          <Link href="/register" className="text-primary-500 hover:text-primary-600 font-medium">
            Registrati
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
