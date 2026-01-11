// Sistema di aree affini per CoachaMi
// Quando non ci sono coach per un'area, mostra coach di aree correlate
// File: src/lib/relatedAreas.ts

import { LifeAreaId } from '@/types'

// Mappa delle aree affini - ordinate per rilevanza
export const RELATED_AREAS: Record<LifeAreaId, LifeAreaId[]> = {
  salute: ['crescita', 'divertimento', 'spiritualita'],
  finanze: ['carriera', 'crescita', 'spiritualita'],
  carriera: ['finanze', 'crescita', 'relazioni'],
  relazioni: ['amore', 'crescita', 'divertimento'],
  amore: ['relazioni', 'crescita', 'spiritualita'],
  crescita: ['carriera', 'spiritualita', 'salute'],
  spiritualita: ['crescita', 'salute', 'amore'],
  divertimento: ['relazioni', 'salute', 'crescita']
}

// Descrizioni delle connessioni tra aree
export const AREA_CONNECTIONS: Record<LifeAreaId, Record<LifeAreaId, string>> = {
  salute: {
    crescita: 'La crescita personale spesso inizia dal prendersi cura del proprio corpo',
    divertimento: 'Il benessere fisico e la gioia di vivere sono strettamente collegati',
    spiritualita: 'Mente e corpo sono interconnessi nel percorso di benessere'
  },
  finanze: {
    carriera: 'Carriera e finanze sono due facce della stessa medaglia',
    crescita: 'Il mindset finanziario fa parte della crescita personale',
    spiritualita: 'Il rapporto con il denaro riflette i nostri valori profondi'
  },
  carriera: {
    finanze: 'Il successo professionale impatta direttamente le finanze',
    crescita: 'La crescita professionale richiede crescita personale',
    relazioni: 'Le relazioni professionali sono fondamentali per la carriera'
  },
  relazioni: {
    amore: 'Le competenze relazionali si applicano anche all\'amore',
    crescita: 'Migliorare le relazioni richiede lavorare su sé stessi',
    divertimento: 'Le relazioni sane includono momenti di leggerezza'
  },
  amore: {
    relazioni: 'L\'amore è una forma speciale di relazione',
    crescita: 'Crescere come persona migliora le relazioni amorose',
    spiritualita: 'L\'amore tocca la dimensione più profonda di noi'
  },
  crescita: {
    carriera: 'Crescere personalmente porta a crescere professionalmente',
    spiritualita: 'La crescita include la dimensione interiore',
    salute: 'Un corpo sano supporta una mente in crescita'
  },
  spiritualita: {
    crescita: 'La spiritualità è parte del percorso di crescita',
    salute: 'Il benessere spirituale influenza quello fisico',
    amore: 'L\'amore autentico ha radici spirituali'
  },
  divertimento: {
    relazioni: 'Il divertimento si amplifica quando condiviso',
    salute: 'Divertirsi riduce lo stress e migliora la salute',
    crescita: 'Anche il gioco è una forma di crescita'
  }
}

// Labels delle aree
export const AREA_LABELS: Record<LifeAreaId, string> = {
  salute: 'Salute e Vitalità',
  finanze: 'Finanze',
  carriera: 'Carriera e Lavoro',
  relazioni: 'Relazioni e Amicizie',
  amore: 'Amore',
  crescita: 'Crescita Personale',
  spiritualita: 'Spiritualità',
  divertimento: 'Divertimento'
}

// Funzione per ottenere aree affini con descrizione
export function getRelatedAreasWithDescription(area: LifeAreaId): Array<{
  area: LifeAreaId
  label: string
  connection: string
}> {
  const relatedAreas = RELATED_AREAS[area] || []
  
  return relatedAreas.map(relatedArea => ({
    area: relatedArea,
    label: AREA_LABELS[relatedArea],
    connection: AREA_CONNECTIONS[area]?.[relatedArea] || ''
  }))
}

// Funzione per generare messaggio quando non ci sono coach
export function getNoCoachMessage(area: LifeAreaId): {
  title: string
  message: string
  relatedAreas: Array<{ area: LifeAreaId; label: string; connection: string }>
} {
  const areaLabel = AREA_LABELS[area]
  const relatedAreas = getRelatedAreasWithDescription(area)
  
  return {
    title: `Non abbiamo ancora coach specializzati in ${areaLabel}`,
    message: `Stiamo ampliando la nostra rete di coach. Nel frattempo, questi coach potrebbero aiutarti perché lavorano su aree strettamente collegate:`,
    relatedAreas
  }
}

// Funzione per determinare se mostrare coach affini o lista d'attesa
export interface CoachSearchResult {
  hasDirectCoaches: boolean
  directCoaches: any[] // Array di coach
  hasRelatedCoaches: boolean
  relatedCoaches: any[] // Array di coach con area di provenienza
  showWaitlist: boolean
  message?: {
    title: string
    message: string
    relatedAreas: Array<{ area: LifeAreaId; label: string; connection: string }>
  }
}

export function categorizeCoachResults(
  area: LifeAreaId,
  allCoaches: any[] // Coach dal database
): CoachSearchResult {
  // Filtra coach per area diretta
  const directCoaches = allCoaches.filter(coach => 
    coach.lifeArea === area || 
    coach.specializations?.lifeAreas?.includes(area)
  )
  
  // Se ci sono coach diretti, mostrali
  if (directCoaches.length > 0) {
    return {
      hasDirectCoaches: true,
      directCoaches,
      hasRelatedCoaches: false,
      relatedCoaches: [],
      showWaitlist: false
    }
  }
  
  // Altrimenti cerca coach nelle aree affini
  const relatedAreaIds = RELATED_AREAS[area] || []
  const relatedCoaches = allCoaches
    .filter(coach => 
      relatedAreaIds.includes(coach.lifeArea) ||
      coach.specializations?.lifeAreas?.some((a: LifeAreaId) => relatedAreaIds.includes(a))
    )
    .map(coach => ({
      ...coach,
      matchedVia: coach.lifeArea, // Area tramite cui è stato trovato
      connectionReason: AREA_CONNECTIONS[area]?.[coach.lifeArea as LifeAreaId] || ''
    }))
  
  // Se ci sono coach affini, mostrali con messaggio
  if (relatedCoaches.length > 0) {
    return {
      hasDirectCoaches: false,
      directCoaches: [],
      hasRelatedCoaches: true,
      relatedCoaches,
      showWaitlist: false,
      message: getNoCoachMessage(area)
    }
  }
  
  // Nessun coach trovato - mostra lista d'attesa
  return {
    hasDirectCoaches: false,
    directCoaches: [],
    hasRelatedCoaches: false,
    relatedCoaches: [],
    showWaitlist: true,
    message: {
      title: `Stiamo cercando coach per ${AREA_LABELS[area]}`,
      message: `Al momento non abbiamo coach disponibili per quest'area. Lascia la tua email e ti avviseremo appena ne avremo!`,
      relatedAreas: []
    }
  }
}
