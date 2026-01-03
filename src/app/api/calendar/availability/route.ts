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
  
  // Se il token è ancora valido, usalo
  if (tokenData.expiresAt > Date.now() + 60000) { // 1 minuto di margine
    return tokenData.accessToken
  }
  
  // Altrimenti refresh
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
      console.error('Token refresh error:', tokens)
      return null
    }
    
    // Aggiorna token in Firebase
    await setDoc(doc(db, 'coachCalendarTokens', coachId), {
      accessToken: tokens.access_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    }, { merge: true })
    
    return tokens.access_token
  } catch (err) {
    console.error('Token refresh failed:', err)
    return null
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const coachId = searchParams.get('coachId')
  const startDate = searchParams.get('startDate') // ISO string
  const endDate = searchParams.get('endDate') // ISO string
  
  if (!coachId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }
  
  // Ottieni token valido
  const accessToken = await getValidAccessToken(coachId)
  
  if (!accessToken) {
    // Coach non ha connesso il calendario, ritorna disponibilità di default
    return NextResponse.json({
      connected: false,
      availability: getDefaultAvailability(startDate, endDate)
    })
  }
  
  try {
    // Query Google Calendar per eventi nel periodo
    const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/freeBusy')
    
    const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: startDate,
        timeMax: endDate,
        items: [{ id: 'primary' }],
      }),
    })
    
    const data = await response.json()
    
    if (data.error) {
      console.error('Calendar API error:', data.error)
      return NextResponse.json({
        connected: true,
        error: data.error.message,
        availability: getDefaultAvailability(startDate, endDate)
      })
    }
    
    // Estrai periodi occupati
    const busyPeriods = data.calendars?.primary?.busy || []
    
    // Genera slot disponibili escludendo i periodi occupati
    const availability = generateAvailableSlots(startDate, endDate, busyPeriods)
    
    return NextResponse.json({
      connected: true,
      availability,
      busyPeriods,
    })
    
  } catch (err) {
    console.error('Calendar fetch error:', err)
    return NextResponse.json({
      connected: true,
      error: 'Errore nel recupero disponibilità',
      availability: getDefaultAvailability(startDate, endDate)
    })
  }
}

// Disponibilità di default (Lun-Ven 9:00-18:00)
function getDefaultAvailability(startDate: string, endDate: string) {
  const slots: Record<string, string[]> = {}
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const defaultHours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    // Solo Lun-Ven (1-5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dateStr = d.toISOString().split('T')[0]
      slots[dateStr] = [...defaultHours]
    }
  }
  
  return slots
}

// Genera slot disponibili escludendo periodi occupati
function generateAvailableSlots(
  startDate: string, 
  endDate: string, 
  busyPeriods: Array<{start: string, end: string}>
) {
  const slots: Record<string, string[]> = {}
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Slot orari possibili (ogni ora dalle 9 alle 18)
  const possibleHours = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    
    // Solo Lun-Ven
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dateStr = d.toISOString().split('T')[0]
      
      // Filtra slot che non sono occupati
      const availableHours = possibleHours.filter(hour => {
        const [h, m] = hour.split(':').map(Number)
        const slotStart = new Date(d)
        slotStart.setHours(h, m, 0, 0)
        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + 30) // Sessioni da 30 min
        
        // Verifica se lo slot si sovrappone con periodi occupati
        const isBusy = busyPeriods.some(busy => {
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return slotStart < busyEnd && slotEnd > busyStart
        })
        
        return !isBusy
      })
      
      if (availableHours.length > 0) {
        slots[dateStr] = availableHours
      }
    }
  }
  
  return slots
}
