'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import { User, UserRole } from '@/types'

// Email admin hardcodate
const ADMIN_EMAILS = ['debora.carofiglio@gmail.com']
const MODERATOR_EMAILS: string[] = [] // Aggiungi qui email moderatori

// Funzione per determinare il ruolo in base all'email
function getRoleByEmail(email: string): UserRole {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) return 'admin'
  if (MODERATOR_EMAILS.includes(email.toLowerCase())) return 'moderator'
  return 'coachee'
}

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (data: Partial<User>) => Promise<void>
  // Helpers per i ruoli
  isAdmin: boolean
  isModerator: boolean
  isCoach: boolean
  isCoachee: boolean
  canAccessAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      
      if (fbUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          // Controlla se l'email è admin/moderator e aggiorna il ruolo se necessario
          const emailRole = getRoleByEmail(fbUser.email || '')
          const currentRole = userData.role
          
          // Se l'email è admin/moderator ma il ruolo nel DB è diverso, aggiorna
          if ((emailRole === 'admin' || emailRole === 'moderator') && currentRole !== emailRole) {
            await setDoc(doc(db, 'users', fbUser.uid), { role: emailRole }, { merge: true })
            setUser({ id: fbUser.uid, ...userData, role: emailRole } as User)
          } else {
            setUser({ id: fbUser.uid, ...userData } as User)
          }
        } else {
          // Create new user document
          const role = getRoleByEmail(fbUser.email || '')
          const newUser: Omit<User, 'id'> = {
            email: fbUser.email || '',
            name: fbUser.displayName || '',
            role,
            createdAt: new Date(),
            updatedAt: new Date(),
            onboardingCompleted: false,
            membershipStatus: 'free'
          }
          
          await setDoc(doc(db, 'users', fbUser.uid), newUser)
          setUser({ id: fbUser.uid, ...newUser })
        }
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, name: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName: name })
    
    const role = getRoleByEmail(email)
    const newUser: Omit<User, 'id'> = {
      email,
      name,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      onboardingCompleted: false,
      membershipStatus: 'free'
    }
    
    await setDoc(doc(db, 'users', result.user.uid), newUser)
  }

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  const updateUserProfile = async (data: Partial<User>) => {
    if (!firebaseUser) return
    
    const updatedData = { ...data, updatedAt: new Date() }
    await setDoc(doc(db, 'users', firebaseUser.uid), updatedData, { merge: true })
    
    setUser(prev => prev ? { ...prev, ...updatedData } : null)
  }

  // Helpers per i ruoli
  const isAdmin = user?.role === 'admin'
  const isModerator = user?.role === 'moderator'
  const isCoach = user?.role === 'coach'
  const isCoachee = user?.role === 'coachee'
  const canAccessAdmin = isAdmin || isModerator

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      updateUserProfile,
      isAdmin,
      isModerator,
      isCoach,
      isCoachee,
      canAccessAdmin
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
