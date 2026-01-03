import { NextResponse } from 'next/server'

export async function GET() {
  // Mostra TUTTE le variabili d'ambiente che iniziano con G
  const allEnvKeys = Object.keys(process.env).filter(k => k.startsWith('G') || k.startsWith('NEXT'))
  
  return NextResponse.json({
    allEnvKeys,
    totalEnvVars: Object.keys(process.env).length
  })
}
