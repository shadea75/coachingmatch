import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
    appUrl: process.env.NEXT_PUBLIC_APP_URL
  })
}
