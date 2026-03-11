import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // 1. Carica tutti i lead assegnati
    const leadsSnap = await adminDb.collection('leads')
      .where('status', 'in', ['assigned', 'booked', 'converted'])
      .get()

    // 2. Carica tutti i coach approvati
    const coachesSnap = await adminDb.collection('coachApplications')
      .where('status', '==', 'approved')
      .get()

    const allCoaches = coachesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

    // 3. Per ogni area, traccia l'ultimo coach assegnato in ordine cronologico
    const areaLastCoach: Record<string, { coachId: string, assignedAt: any }> = {}

    leadsSnap.docs.forEach(d => {
      const data = d.data()
      const area = data.priorityArea
      const coachId = data.assignedCoachId
      const assignedAt = data.assignedAt
      if (!area || !coachId) return

      if (!areaLastCoach[area] || (assignedAt && assignedAt > areaLastCoach[area].assignedAt)) {
        areaLastCoach[area] = { coachId, assignedAt }
      }
    })

    // 4. Per ogni area, calcola il cursore = indice successivo all'ultimo coach assegnato
    const cursors: Record<string, number> = {}

    for (const [area, { coachId }] of Object.entries(areaLastCoach)) {
      const qualified = allCoaches
        .filter((c: any) => {
          const areas = c.lifeAreas || (c.lifeArea ? [c.lifeArea] : [])
          return areas.includes(area)
        })
        .sort((a: any, b: any) => a.id.localeCompare(b.id))

      if (qualified.length === 0) continue

      const lastIndex = qualified.findIndex((c: any) => c.id === coachId)
      cursors[area] = lastIndex >= 0 ? lastIndex + 1 : 1
    }

    // 5. Salva i cursori su Firestore
    await adminDb.collection('settings').doc('roundRobin').set(cursors, { merge: true })

    return NextResponse.json({ success: true, cursors })

  } catch (err: any) {
    console.error('Errore sync round-robin:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
