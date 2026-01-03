import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId
  const error = searchParams.get('error')
  
  // Gestisci errore o rifiuto
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?calendar=error&message=${encodeURIComponent(error)}`
    )
  }
  
  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?calendar=error&message=missing_params`
    )
  }
  
  try {
    // Scambia il code per i token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    })
    
    const tokens = await tokenResponse.json()
    
    if (tokens.error) {
      console.error('Token error:', tokens)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?calendar=error&message=${encodeURIComponent(tokens.error)}`
      )
    }
    
    // Ottieni info sull'account Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userInfoResponse.json()
    
    // Salva i token in Firebase (criptati in produzione!)
    await setDoc(doc(db, 'coachCalendarTokens', state), {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      googleEmail: userInfo.email,
      googleName: userInfo.name,
      connectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    // Aggiorna anche il profilo coach
    await setDoc(doc(db, 'coachApplications', state), {
      googleCalendarConnected: true,
      googleCalendarEmail: userInfo.email,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    
    // Redirect con successo
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?calendar=success`
    )
    
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?calendar=error&message=server_error`
    )
  }
}
