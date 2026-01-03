import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// Refresh token se scaduto
async function getValidAccessToken(coachId: string): Promise<string | null> {
  const tokenDoc = await getDoc(doc(db, 'coachCalendarTokens', coachId))
  
  if (!tokenDoc.exists()) {
    return null
  }
  
  const tokenData = tokenDoc.data()
  
  if (tokenData.expiresAt > Date.now() + 60000) {
    return tokenData.accessToken
  }
  
  if (!tokenData.refreshToken) {
    return null
  }
  
  try {
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
      return null
    }
    
    await setDoc(doc(db, 'coachCalendarTokens', coachId), {
      accessToken: tokens.access_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    }, { merge: true })
    
    return tokens.access_token
  } catch (err) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      coachId, 
      coachName,
      coachEmail,
      coacheeName, 
      coacheeEmail, 
      startTime, // ISO string
      duration = 30, // minuti
      sessionType = 'free_consultation',
      notes = ''
    } = body
    
    if (!coachId || !coacheeName || !coacheeEmail || !startTime) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }
    
    const accessToken = await getValidAccessToken(coachId)
    
    if (!accessToken) {
      // Coach non ha connesso il calendario
      return NextResponse.json({ 
        success: true,
        calendarConnected: false,
        message: 'Evento non creato - calendario non connesso'
      })
    }
    
    // Calcola end time
    const start = new Date(startTime)
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + duration)
    
    // Titolo evento
    const summary = sessionType === 'free_consultation'
      ? `☎️ Call gratuita con ${coacheeName}`
      : `🎯 Sessione coaching con ${coacheeName}`
    
    // Descrizione
    const description = `
Sessione di coaching CoachaMi

👤 Coachee: ${coacheeName}
📧 Email: ${coacheeEmail}
⏱️ Durata: ${duration} minuti
📝 Note: ${notes || 'Nessuna nota'}

---
Gestisci le tue sessioni su https://www.coachami.it/coach/dashboard
    `.trim()
    
    // Crea evento con Google Meet
    const event = {
      summary,
      description,
      start: {
        dateTime: start.toISOString(),
        timeZone: 'Europe/Rome',
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: 'Europe/Rome',
      },
      attendees: [
        { email: coacheeEmail, displayName: coacheeName },
      ],
      conferenceData: {
        createRequest: {
          requestId: `coachami-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    }
    
    // Crea evento in Google Calendar
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )
    
    const createdEvent = await response.json()
    
    if (createdEvent.error) {
      console.error('Calendar event creation error:', createdEvent.error)
      return NextResponse.json({
        success: false,
        error: createdEvent.error.message,
      }, { status: 500 })
    }
    
    // Estrai link Google Meet
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri || createdEvent.hangoutLink
    
    return NextResponse.json({
      success: true,
      calendarConnected: true,
      eventId: createdEvent.id,
      eventLink: createdEvent.htmlLink,
      meetLink,
    })
    
  } catch (err) {
    console.error('Create event error:', err)
    return NextResponse.json({ 
      success: false,
      error: 'Errore nella creazione evento' 
    }, { status: 500 })
  }
}
