import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// Refresh token se scaduto
async function getValidAccessToken(coachId: string): Promise<{ token: string | null; needsReconnect?: boolean }> {
  const tokenDoc = await getDoc(doc(db, 'coachCalendarTokens', coachId))
  
  if (!tokenDoc.exists()) {
    return { token: null, needsReconnect: true }
  }
  
  const tokenData = tokenDoc.data()
  
  // Se il token è ancora valido, usalo
  if (tokenData.expiresAt > Date.now() + 60000) { // 1 minuto di margine
    return { token: tokenData.accessToken }
  }
  
  // Altrimenti refresh
  if (!tokenData.refreshToken) {
    console.error('No refresh token for coach:', coachId)
    // Segna come disconnesso
    try {
      await updateDoc(doc(db, 'coachApplications', coachId), {
        googleCalendarConnected: false,
      })
    } catch (e) {}
    return { token: null, needsReconnect: true }
  }
  
  try {
    console.log('Refreshing token for coach:', coachId)
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: tokenData.refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    
    const tokens = await response.json()
    
    if (tokens.error) {
      console.error('Token refresh error:', tokens)
      
      // Se refresh token invalido, segna come disconnesso
      if (tokens.error === 'invalid_grant') {
        try {
          await updateDoc(doc(db, 'coachApplications', coachId), {
            googleCalendarConnected: false,
          })
        } catch (e) {}
        return { token: null, needsReconnect: true }
      }
      
      return { token: null }
    }
    
    // Aggiorna token in Firebase
    await setDoc(doc(db, 'coachCalendarTokens', coachId), {
      accessToken: tokens.access_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      updatedAt: new Date(),
      // Se Google restituisce un nuovo refresh token, salvalo
      ...(tokens.refresh_token && { refreshToken: tokens.refresh_token })
    }, { merge: true })
    
    console.log('Token refreshed successfully')
    
    return { token: tokens.access_token }
  } catch (err) {
    console.error('Token refresh failed:', err)
    return { token: null }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const coachId = searchParams.get('coachId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  if (!coachId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }
  
  const { token: accessToken, needsReconnect } = await getValidAccessToken(coachId)
  
  if (!accessToken) {
    return NextResponse.json({ 
      connected: false,
      events: [],
      error: needsReconnect ? 'Token scaduto, riconnetti il calendario' : 'Calendario non connesso',
      needsReconnect: needsReconnect || false
    })
  }
  
  try {
    // Query Google Calendar per eventi nel periodo
    const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    calendarUrl.searchParams.set('timeMin', startDate)
    calendarUrl.searchParams.set('timeMax', endDate)
    calendarUrl.searchParams.set('singleEvents', 'true')
    calendarUrl.searchParams.set('orderBy', 'startTime')
    calendarUrl.searchParams.set('maxResults', '100')
    
    const response = await fetch(calendarUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    const data = await response.json()
    
    if (data.error) {
      console.error('Calendar API error:', data.error)
      
      // Se errore 401, token invalido
      if (data.error.code === 401) {
        try {
          await updateDoc(doc(db, 'coachApplications', coachId), {
            googleCalendarConnected: false,
          })
        } catch (e) {}
        
        return NextResponse.json({
          connected: false,
          events: [],
          error: 'Sessione scaduta, riconnetti il calendario',
          needsReconnect: true
        })
      }
      
      return NextResponse.json({
        connected: true,
        events: [],
        error: data.error.message
      })
    }
    
    // Filtra eventi per mostrare solo quelli rilevanti
    const events = (data.items || []).map((event: any) => ({
      id: event.id,
      summary: event.summary || 'Evento senza titolo',
      description: event.description,
      start: event.start,
      end: event.end,
      status: event.status,
      htmlLink: event.htmlLink,
      hangoutLink: event.hangoutLink,
      // Controlla se è un evento CoachaMi
      isCoachaMi: event.description?.includes('CoachaMi') || event.summary?.includes('CoachaMi')
    }))
    
    return NextResponse.json({
      connected: true,
      events,
    })
    
  } catch (err) {
    console.error('Calendar fetch error:', err)
    return NextResponse.json({
      connected: true,
      events: [],
      error: 'Errore nel recupero eventi'
    })
  }
}
