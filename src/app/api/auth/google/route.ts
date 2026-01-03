import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GCAL_CLIENT_ID
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'

// Scopes necessari per Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: 'userId richiesto' }, { status: 400 })
  }
  
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: 'Google OAuth non configurato' }, { status: 500 })
  }
  
  // Costruisci URL di autorizzazione Google
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', userId) // Passiamo l'userId nello state
  
  return NextResponse.redirect(authUrl.toString())
}
