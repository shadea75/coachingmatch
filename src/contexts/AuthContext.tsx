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
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (data: Partial<User>) => Promise<void>
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
          setUser({ id: fbUser.uid, ...userDoc.data() } as User)
        } else {
          // Create new user document
          const newUser: Omit<User, 'id'> = {
            email: fbUser.email || '',
            name: fbUser.displayName || '',
            role: 'coachee',
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
    
    const newUser: Omit<User, 'id'> = {
      email,
      name,
      role: 'coachee',
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

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      updateUserProfile
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
