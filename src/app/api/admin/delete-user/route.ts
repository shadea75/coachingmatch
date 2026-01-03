// src/app/api/admin/delete-user/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Email admin autorizzate
const ADMIN_EMAILS = ['debora.carofiglio@gmail.com']

// Funzione per inizializzare Firebase Admin solo quando serve
async function getFirebaseAdmin() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app')
  const { getAuth } = await import('firebase-admin/auth')
  const { getFirestore } = await import('firebase-admin/firestore')
  
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    
    if (serviceAccount) {
      try {
        const parsedKey = JSON.parse(serviceAccount)
        initializeApp({
          credential: cert(parsedKey)
        })
      } catch (e) {
        // Fallback: usa le variabili d'ambiente individuali
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          })
        })
      }
    } else {
      // Fallback: usa le variabili d'ambiente individuali
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      })
    }
  }
  
  return {
    auth: getAuth(),
    db: getFirestore()
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, adminEmail } = body

    // Verifica che chi fa la richiesta sia admin
    if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail.toLowerCase())) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId mancante' }, { status: 400 })
    }

    // Inizializza Firebase Admin
    const { auth: adminAuth, db: adminDb } = await getFirebaseAdmin()

    // 1. Elimina da Firebase Authentication
    try {
      await adminAuth.deleteUser(userId)
      console.log(`Utente ${userId} eliminato da Firebase Auth`)
    } catch (authError: any) {
      // Se l'utente non esiste in Auth, continua comunque
      if (authError.code !== 'auth/user-not-found') {
        console.error('Errore eliminazione Auth:', authError)
      }
    }

    // 2. Elimina da Firestore (collection users)
    try {
      await adminDb.collection('users').doc(userId).delete()
      console.log(`Utente ${userId} eliminato da Firestore users`)
    } catch (firestoreError) {
      console.error('Errore eliminazione Firestore:', firestoreError)
    }

    // 3. Elimina documenti correlati (opzionale)
    // Elimina le sessioni dell'utente
    const sessionsQuery = await adminDb.collection('sessions')
      .where('coacheeId', '==', userId)
      .get()
    
    const batch1 = adminDb.batch()
    sessionsQuery.docs.forEach(doc => batch1.delete(doc.ref))
    if (!sessionsQuery.empty) await batch1.commit()

    // Elimina le offerte dell'utente (come coachee)
    const offersQuery = await adminDb.collection('offers')
      .where('coacheeId', '==', userId)
      .get()
    
    const batch2 = adminDb.batch()
    offersQuery.docs.forEach(doc => batch2.delete(doc.ref))
    if (!offersQuery.empty) await batch2.commit()

    // Elimina i post della community
    const postsQuery = await adminDb.collection('communityPosts')
      .where('authorId', '==', userId)
      .get()
    
    const batch3 = adminDb.batch()
    postsQuery.docs.forEach(doc => batch3.delete(doc.ref))
    if (!postsQuery.empty) await batch3.commit()

    return NextResponse.json({ 
      success: true, 
      message: 'Utente eliminato completamente'
    })

  } catch (error: any) {
    console.error('Errore eliminazione utente:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
