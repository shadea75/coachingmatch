// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Inizializza Firebase Admin solo se non già inizializzato
const apps = getApps()

if (!apps.length) {
  // In produzione, usa le variabili d'ambiente
  // In sviluppo, puoi usare un file service account
  
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  } else {
    // Fallback: usa le credenziali di default (per emulatore o GCP)
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  }
}

export const adminDb = getFirestore()
export const adminAuth = getAuth()

// Alias per compatibilità
export const db = adminDb
