import { NextResponse } from 'next/server'

export async function GET() {
  const allKeys = Object.keys(process.env).sort()
  
  return NextResponse.json({
    totalEnvVars: allKeys.length,
    hasGCAL: allKeys.filter(k => k.includes('GCAL')),
    hasGOOGLE: allKeys.filter(k => k.includes('GOOGLE')),
    // Mostra le ultime 20 variabili aggiunte (alfabeticamente)
    lastKeys: allKeys.slice(-20)
  })
}
