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
  const { signIn, signInWithGoogle, user } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Funzione per redirect in base al ruolo
  const redirectByRole = (userRole: string | undefined, userEmail: string | undefined) => {
    // Check admin per ruolo O per email
    const isAdmin = userRole === 'admin' || 
      (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase()))
    
    console.log('Redirect check:', { userRole, userEmail, isAdmin })
    
    if (isAdmin) {
      console.log('Redirecting to /admin')
      window.location.href = '/admin'
    } else if (userRole === 'coach') {
      console.log('Redirecting to /coach/dashboard')
      window.location.href = '/coach/dashboard'
    } else {
      console.log('Redirecting to /dashboard')
      window.location.href = '/dashboard'
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      await signIn(email, password)
      // Il redirect avviene nell'useEffect quando user è disponibile
    } catch (err: any) {
      setError(err.message || 'Credenziali non valide')
      setIsLoading(false)
    }
  }
  
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
      // Il redirect avviene nell'useEffect quando user è disponibile
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'accesso con Google')
    }
  }
  
  // Redirect quando l'utente è loggato
  useEffect(() => {
    if (user) {
      redirectByRole(user.role, user.email)
    }
  }, [user])
  
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-8">
          <Logo size="lg" />
        </Link>
        
        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-display font-bold text-charcoal text-center mb-2">
            Bentornato!
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Accedi al tuo account per continuare
          </p>
          
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-charcoal">Continua con Google</span>
          </button>
          
          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">oppure</span>
            </div>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3 px-4 pl-12 rounded-xl border border-gray-200 bg-white text-charcoal placeholder:text-gray-400 transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  placeholder="nome@email.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 px-4 pl-12 rounded-xl border border-gray-200 bg-white text-charcoal placeholder:text-gray-400 transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  placeholder="La tua password"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-primary-500 hover:underline">
                Password dimenticata?
              </Link>
            </div>
            
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3 disabled:opacity-50"
            >
              {isLoading ? 'Accesso in corso...' : 'Accedi'}
              <ArrowRight size={18} />
            </button>
          </form>
          
          <p className="text-center text-sm text-gray-500 mt-6">
            Non hai un account?{' '}
            <Link href="/onboarding" className="text-primary-500 hover:underline font-medium">
              Inizia il percorso
            </Link>
          </p>
        </div>
        
        {/* Coach link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Sei un coach?{' '}
          <Link href="/coach/register" className="text-primary-500 hover:underline">
            Registrati qui
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
