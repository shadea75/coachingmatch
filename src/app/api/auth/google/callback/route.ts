import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId
  const error = searchParams.get('error')
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.coachami.it'
  
  // Gestisci errore o rifiuto
  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/coach/availability?calendar=error&message=${encodeURIComponent(error)}`
    )
  }
  
  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/coach/availability?calendar=error&message=missing_params`
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
        redirect_uri: REDIRECT_URI!,
      }),
    })
    
    const tokens = await tokenResponse.json()
    
    if (tokens.error) {
      console.error('Token error:', tokens)
      return NextResponse.redirect(
        `${baseUrl}/coach/availability?calendar=error&message=${encodeURIComponent(tokens.error)}`
      )
    }
    
    // Ottieni info sull'account Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userInfoResponse.json()
    
    // Redirect con i token nell'URL (verranno salvati client-side)
    // Usiamo base64 per evitare problemi con caratteri speciali
    const tokenData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresIn: tokens.expires_in,
      googleEmail: userInfo.email || '',
      googleName: userInfo.name || '',
      userId: state
    }
    
    const encodedData = Buffer.from(JSON.stringify(tokenData)).toString('base64')
    
    // Reindirizza a /coach/availability (dove ora si trova l'integrazione)
    return NextResponse.redirect(
      `${baseUrl}/coach/availability?calendar=pending&data=${encodedData}`
    )
    
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(
      `${baseUrl}/coach/availability?calendar=error&message=server_error`
    )
  }
}
