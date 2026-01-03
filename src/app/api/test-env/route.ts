import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    allGoogleVars: Object.keys(process.env).filter(k => k.includes('GOOGLE') || k.includes('GCAL'))
  })
}
