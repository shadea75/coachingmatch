import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coachId } = body
    
    if (!coachId) {
      return NextResponse.json({ error: 'coachId richiesto' }, { status: 400 })
    }
    
    // Elimina i token salvati
    await deleteDoc(doc(db, 'coachCalendarTokens', coachId))
    
    // Aggiorna profilo coach
    await setDoc(doc(db, 'coachApplications', coachId), {
      googleCalendarConnected: false,
      googleCalendarEmail: null,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    
    return NextResponse.json({ success: true })
    
  } catch (err) {
    console.error('Disconnect calendar error:', err)
    return NextResponse.json({ error: 'Errore disconnessione' }, { status: 500 })
  }
}
