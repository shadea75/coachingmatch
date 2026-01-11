// Sistema di interpretazione Life Score per CoachaMi
// File: src/lib/lifeScoreInterpretation.ts

import { LifeAreaId } from '@/types'

// =====================
// FASCE LIFE SCORE
// =====================

export interface ScoreBand {
  min: number
  max: number
  level: string
  emoji: string
  title: string
  description: string
  encouragement: string
  color: string
}

export const SCORE_BANDS: ScoreBand[] = [
  {
    min: 1,
    max: 3.9,
    level: 'critical',
    emoji: '🌱',
    title: 'Tempo di Rinascita',
    description: 'Stai attraversando un momento di grande sfida. Molte aree della tua vita richiedono attenzione, ma questo è anche il punto di partenza perfetto per una trasformazione profonda.',
    encouragement: 'Ogni grande cambiamento inizia da qui. Hai il coraggio di guardarti dentro - questo è già il primo passo.',
    color: '#EF4444' // red
  },
  {
    min: 4,
    max: 5.4,
    level: 'developing',
    emoji: '🌿',
    title: 'In Costruzione',
    description: 'Hai delle basi solide in alcune aree, ma altre richiedono più energia. È il momento perfetto per fare scelte strategiche su dove concentrare i tuoi sforzi.',
    encouragement: 'Sei consapevole di dove vuoi arrivare. Con focus e supporto, i progressi arriveranno più velocemente di quanto pensi.',
    color: '#F59E0B' // amber
  },
  {
    min: 5.5,
    max: 6.9,
    level: 'balanced',
    emoji: '🌳',
    title: 'Buon Equilibrio',
    description: 'Hai costruito una vita con fondamenta solide. Alcune aree brillano, altre hanno margini di crescita. Sei nella posizione ideale per fare il salto di qualità.',
    encouragement: 'Hai già dimostrato di saper costruire. Ora è il momento di passare dal buono all\'eccellente.',
    color: '#3B82F6' // blue
  },
  {
    min: 7,
    max: 8.4,
    level: 'thriving',
    emoji: '🌸',
    title: 'In Fioritura',
    description: 'La tua vita è in una fase molto positiva. Hai lavorato bene su te stesso e i risultati si vedono. Piccoli aggiustamenti possono portarti ancora più in alto.',
    encouragement: 'Stai raccogliendo i frutti del tuo impegno. Continua così e ispira altri con il tuo esempio.',
    color: '#10B981' // green
  },
  {
    min: 8.5,
    max: 10,
    level: 'flourishing',
    emoji: '✨',
    title: 'Vita Straordinaria',
    description: 'Hai raggiunto un equilibrio raro. La maggior parte delle aree della tua vita sono in armonia. Sei un esempio di cosa è possibile quando si lavora su sé stessi.',
    encouragement: 'Hai costruito qualcosa di speciale. Il prossimo passo? Condividere la tua saggezza e aiutare altri nel loro percorso.',
    color: '#8B5CF6' // purple
  }
]

export function getScoreBand(score: number): ScoreBand {
  return SCORE_BANDS.find(band => score >= band.min && score <= band.max) || SCORE_BANDS[2]
}

// =====================
// PROFILI ARCHETIPO
// =====================

export interface ArchetypeProfile {
  id: string
  name: string
  emoji: string
  description: string
  strengths: string[]
  challenges: string[]
  advice: string
}

export const ARCHETYPES: ArchetypeProfile[] = [
  {
    id: 'achiever',
    name: 'Il Conquistatore',
    emoji: '🏆',
    description: 'Eccelli nella carriera e nelle finanze, ma potresti trascurare relazioni e benessere personale. Il successo esterno è importante, ma la vera realizzazione viene dall\'equilibrio.',
    strengths: ['Determinazione', 'Focus sugli obiettivi', 'Capacità di realizzazione'],
    challenges: ['Work-life balance', 'Connessioni profonde', 'Rallentare e goderti il viaggio'],
    advice: 'Il prossimo livello di successo passa attraverso le relazioni e il benessere. Investi in te stesso oltre che nei risultati.'
  },
  {
    id: 'nurturer',
    name: 'Il Custode',
    emoji: '💝',
    description: 'Le tue relazioni sono il tuo punto di forza. Dedichi molto agli altri, ma potresti dimenticare di mettere te stesso al primo posto qualche volta.',
    strengths: ['Empatia', 'Relazioni profonde', 'Capacità di supporto'],
    challenges: ['Mettere confini', 'Prenderti cura di te', 'Chiedere aiuto'],
    advice: 'Ricorda: non puoi versare da una tazza vuota. Prenderti cura di te non è egoismo, è necessità.'
  },
  {
    id: 'seeker',
    name: 'L\'Esploratore',
    emoji: '🧭',
    description: 'Sei in una fase di ricerca e scoperta. Stai cercando il tuo posto nel mondo e sperimentando diverse direzioni. È un momento prezioso di crescita.',
    strengths: ['Curiosità', 'Apertura al nuovo', 'Capacità di adattamento'],
    challenges: ['Definire priorità', 'Portare a termine', 'Trovare stabilità'],
    advice: 'La ricerca è preziosa, ma arriva un momento in cui bisogna piantare radici. Scegli una direzione e dai il tutto per tutto.'
  },
  {
    id: 'philosopher',
    name: 'Il Saggio',
    emoji: '🦉',
    description: 'Hai una vita interiore ricca e profonda. Spiritualità e crescita personale sono i tuoi punti di forza, ma potresti aver bisogno di più azione concreta.',
    strengths: ['Saggezza interiore', 'Autoconsapevolezza', 'Visione profonda'],
    challenges: ['Passare all\'azione', 'Aspetti pratici', 'Tradurre insight in risultati'],
    advice: 'La saggezza senza azione resta solo potenziale. Il mondo ha bisogno che tu metta in pratica ciò che sai.'
  },
  {
    id: 'phoenix',
    name: 'La Fenice',
    emoji: '🔥',
    description: 'Stai attraversando o hai appena attraversato una fase di trasformazione profonda. I punteggi bassi non ti definiscono - sono il trampolino per la rinascita.',
    strengths: ['Resilienza', 'Capacità di rinnovarsi', 'Coraggio di ricominciare'],
    challenges: ['Ricostruire le fondamenta', 'Pazienza nel processo', 'Credere in te stesso'],
    advice: 'Ogni fenice risorge più forte. Questo momento difficile sta forgiando la versione migliore di te.'
  },
  {
    id: 'harmonizer',
    name: 'L\'Armonizzatore',
    emoji: '☯️',
    description: 'Hai costruito un equilibrio invidiabile tra le diverse aree della vita. Non eccelli in una singola cosa, ma la tua forza è proprio nella stabilità complessiva.',
    strengths: ['Equilibrio', 'Stabilità emotiva', 'Visione d\'insieme'],
    challenges: ['Eccellere in qualcosa', 'Uscire dalla comfort zone', 'Ambizione mirata'],
    advice: 'L\'equilibrio è una base eccellente. Ora scegli un\'area e portala all\'eccellenza - senza perdere l\'armonia.'
  }
]

export function determineArchetype(scores: Record<LifeAreaId, number>): ArchetypeProfile {
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
  
  // Calcola varianza (quanto sono diversi i punteggi tra loro)
  const variance = Object.values(scores).reduce((sum, score) => {
    return sum + Math.pow(score - avgScore, 2)
  }, 0) / Object.values(scores).length
  
  // Identifica aree forti e deboli
  const careerFinance = ((scores.carriera || 0) + (scores.finanze || 0)) / 2
  const relationships = ((scores.relazioni || 0) + (scores.amore || 0)) / 2
  const innerLife = ((scores.spiritualita || 0) + (scores.crescita || 0)) / 2
  const wellness = ((scores.salute || 0) + (scores.divertimento || 0)) / 2
  
  // Logica di selezione archetipo
  
  // La Fenice: punteggio molto basso
  if (avgScore < 4) {
    return ARCHETYPES.find(a => a.id === 'phoenix')!
  }
  
  // L'Armonizzatore: varianza bassa, tutto equilibrato
  if (variance < 2 && avgScore >= 5.5) {
    return ARCHETYPES.find(a => a.id === 'harmonizer')!
  }
  
  // Il Conquistatore: carriera/finanze alte, relazioni/wellness basse
  if (careerFinance >= 7 && (relationships < 5.5 || wellness < 5.5)) {
    return ARCHETYPES.find(a => a.id === 'achiever')!
  }
  
  // Il Custode: relazioni alte, altre aree più basse
  if (relationships >= 7 && (careerFinance < 6 || innerLife < 6)) {
    return ARCHETYPES.find(a => a.id === 'nurturer')!
  }
  
  // Il Saggio: spiritualità/crescita alte
  if (innerLife >= 7 && careerFinance < 6) {
    return ARCHETYPES.find(a => a.id === 'philosopher')!
  }
  
  // L'Esploratore: alta varianza, in fase di ricerca
  if (variance >= 4 || avgScore < 5.5) {
    return ARCHETYPES.find(a => a.id === 'seeker')!
  }
  
  // Default: Armonizzatore
  return ARCHETYPES.find(a => a.id === 'harmonizer')!
}

// =====================
// ANALISI PER AREA
// =====================

export interface AreaAnalysis {
  level: 'critical' | 'low' | 'medium' | 'good' | 'excellent'
  interpretation: string
  quickWin: string
}

const AREA_INTERPRETATIONS: Record<LifeAreaId, Record<string, AreaAnalysis>> = {
  salute: {
    critical: {
      level: 'critical',
      interpretation: 'La tua salute richiede attenzione urgente. Senza energia fisica, tutto il resto diventa più difficile.',
      quickWin: 'Inizia con 10 minuti di camminata al giorno. Piccolo ma potente.'
    },
    low: {
      level: 'low',
      interpretation: 'Hai margini di miglioramento importanti sulla salute. Il tuo corpo sta chiedendo più attenzione.',
      quickWin: 'Aggiungi un\'abitudine: bevi 2 litri d\'acqua al giorno.'
    },
    medium: {
      level: 'medium',
      interpretation: 'Base discreta, ma potresti sentirti molto meglio con qualche aggiustamento.',
      quickWin: 'Migliora il sonno: stessa ora di sveglia ogni giorno, anche nel weekend.'
    },
    good: {
      level: 'good',
      interpretation: 'Stai investendo bene nella tua salute. Continua così!',
      quickWin: 'Prossimo livello: aggiungi 2 sessioni di movimento intenso a settimana.'
    },
    excellent: {
      level: 'excellent',
      interpretation: 'Eccellente! La salute è chiaramente una tua priorità.',
      quickWin: 'Condividi le tue abitudini con qualcuno che ne ha bisogno.'
    }
  },
  finanze: {
    critical: {
      level: 'critical',
      interpretation: 'Lo stress finanziario sta probabilmente impattando altre aree. È il momento di prendere il controllo.',
      quickWin: 'Traccia ogni spesa per 7 giorni. La consapevolezza è il primo passo.'
    },
    low: {
      level: 'low',
      interpretation: 'Le finanze sono una fonte di preoccupazione. Con un piano, puoi cambiare rotta.',
      quickWin: 'Elimina una spesa ricorrente non essenziale questa settimana.'
    },
    medium: {
      level: 'medium',
      interpretation: 'Gestisci le finanze ma senza grande margine. È tempo di costruire sicurezza.',
      quickWin: 'Imposta un bonifico automatico di risparmio, anche solo €50/mese.'
    },
    good: {
      level: 'good',
      interpretation: 'Buona gestione finanziaria. Hai costruito stabilità.',
      quickWin: 'Esplora una nuova fonte di reddito o investimento.'
    },
    excellent: {
      level: 'excellent',
      interpretation: 'Finanze solide! Hai raggiunto un livello di libertà importante.',
      quickWin: 'Considera come le tue risorse possono creare impatto positivo.'
    }
  },
  carriera: {
    critical: {
      level: 'critical',
      interpretation: 'Il lavoro è fonte di grande insoddisfazione. Meriti di meglio.',
      quickWin: 'Scrivi: "Il mio lavoro ideale è..." senza filtri. Chiarezza prima, azione poi.'
    },
    low: {
      level: 'low',
      interpretation: 'La carriera non ti sta dando ciò che meriti. È tempo di cambiare qualcosa.',
      quickWin: 'Aggiorna LinkedIn e contatta una persona del tuo settore ideale.'
    },
    medium: {
      level: 'medium',
      interpretation: 'Lavoro ok, ma senti che c\'è di più. Hai ragione.',
      quickWin: 'Identifica una competenza da sviluppare nei prossimi 3 mesi.'
    },
    good: {
      level: 'good',
      interpretation: 'Carriera in buona forma. Stai costruendo qualcosa di importante.',
      quickWin: 'Cerca un mentore o diventa tu mentore di qualcuno.'
    },
    excellent: {
      level: 'excellent',
      interpretation: 'Eccellente realizzazione professionale! Sei un esempio.',
      quickWin: 'Pensa a come il tuo lavoro può avere impatto oltre il singolo ruolo.'
    }
  },
  relazioni: {
    critical: {
      level: 'critical',
      interpretation: 'Ti senti isolato o le relazioni sono fonte di dolore. Non sei fatto per stare solo.',
      quickWin: 'Scrivi a una persona che non senti da tempo. Oggi.'
    },
    low: {
      level: 'low',
      interpretation: 'Le tue connessioni hanno bisogno di nutrimento. Le relazioni richiedono investimento.',
      quickWin: 'Pianifica un caffè/chiamata con un amico questa settimana.'
    },
    medium: {
      level: 'medium',
      interpretation: 'Hai relazioni ma potresti desiderare più profondità o connessione.',
      quickWin: 'Nella prossima conversazione, fai una domanda più profonda del solito.'
    },
    good: {
      level: 'good',
      interpretation: 'Relazioni solide. Hai costruito una rete di supporto importante.',
      quickWin: 'Esprimi gratitudine a qualcuno che conta per te.'
    },
    excellent: {
      level: 'excellent',
      interpretation: 'Le tue relazioni sono una ricchezza. Sei circondato da persone speciali.',
      quickWin: 'Organizza qualcosa che unisca le persone a cui tieni.'
    }
  },
  amore: {
    critical: {
      level: 'critical',
      interpretation: 'L\'amore è un\'area di grande sofferenza o assenza. Meriti di essere amato.',
      quickWin: 'Prima di cercare fuori, chiediti: "Mi sto amando abbastanza?"'
    },
    low: {
      level: 'low',
      interpretation: 'La vita sentimentale non ti sta dando ciò che desideri.',
      quickWin: 'Scrivi le 5 qualità non negoziabili che cerchi in un partner (o nella relazione attuale).'
    },
    medium: {
      level: 'medium',
      interpretation: 'C\'è del buono ma anche margini di crescita nella sfera amorosa.',
      quickWin: 'Se in coppia: pianifica un momento speciale. Se single: fai qualcosa di nuovo dove incontrare persone.'
    },
    good: {
      level: 'good',
      interpretation: 'L\'amore è presente nella tua vita in modo positivo.',
      quickWin: 'Esprimi qualcosa che apprezzi del tuo partner (o di te stesso nel dating).'
    },
    excellent: {
      level: 'excellent',
      interpretation: 'Vita amorosa fiorente! Hai costruito qualcosa di speciale.',
      quickWin: 'Cosa rende speciale la tua relazione? Condividilo con altri.'
    }
  },
  crescita: {
    critical: {
      level: 'critical',
      interpretation: 'Ti senti bloccato, fermo. La crescita personale è stata messa in pausa.',
      quickWin: 'Scegli UN libro di crescita personale e inizia oggi.'
    },
    low: {
      level: 'low',
      interpretation: 'Senti di non star evolvendo come vorresti. È tempo di investire in te.',
      quickWin: 'Identifica una paura che ti blocca. Solo riconoscerla è già crescita.'
    },
    medium: {
      level: 'medium',
      interpretation: 'Stai crescendo ma forse non alla velocità che desideri.',
      quickWin: '20 minuti al giorno per imparare qualcosa di nuovo. Non negoziabili.'
    },
    good: {
      level: 'good',
      interpretation: 'Buon percorso di crescita! Sei sulla strada giusta.',
      quickWin: 'Trova qualcuno più avanti di te nel tuo percorso e impara da lui/lei.'
    },
    excellent: {
      level: 'excellent',
      interpretation: 'Crescita personale eccellente! Sei diventato studente perpetuo della vita.',
      quickWin: 'Insegna ciò che sai. Insegnare è il modo migliore per approfondire.'
    }
  },
  spiritualita: {
    critical: {
      level: 'critical',
      interpretation: 'Senti un vuoto di significato. La vita sembra mancare di scopo.',
      quickWin: '5 minuti di silenzio al giorno. Niente telefono, niente musica. Solo tu.'
    },
    low: {
      level: 'low',
      interpretation: 'La dimensione interiore ha bisogno di più spazio nella tua vita.',
      quickWin: 'Scrivi: "Cosa mi dà veramente significato?" Lascia fluire.'
    },
    medium: {
      level: 'medium',
      interpretation: 'Hai intuizioni sul senso della vita ma forse non le coltivi abbastanza.',
      quickWin: 'Inizia una pratica quotidiana: meditazione, journaling, o gratitudine.'
    },
    good: {
      level: 'good',
      interpretation: 'Buona connessione con la dimensione spirituale/interiore.',
      quickWin: 'Come puoi portare più presenza nelle attività quotidiane?'
    },
    excellent: {
      level: 'excellent',
      interpretation: 'Vita interiore ricca e profonda. Hai trovato un senso che ti guida.',
      quickWin: 'Condividi la tua saggezza con chi sta cercando.'
    }
  },
  divertimento: {
    critical: {
      level: 'critical',
      interpretation: 'La gioia è sparita dalla tua vita. Quando hai riso l\'ultima volta di cuore?',
      quickWin: 'Fai qualcosa di "inutile" ma divertente oggi. Senza sensi di colpa.'
    },
    low: {
      level: 'low',
      interpretation: 'Stai prendendo la vita troppo seriamente. Il gioco è essenziale.',
      quickWin: 'Riscopri un hobby che amavi da bambino. Provalo questa settimana.'
    },
    medium: {
      level: 'medium',
      interpretation: 'C\'è divertimento ma forse non abbastanza. La vita merita più leggerezza.',
      quickWin: 'Blocca in agenda 2 ore a settimana SOLO per fare qualcosa che ti piace.'
    },
    good: {
      level: 'good',
      interpretation: 'Sai goderti la vita! Il divertimento ha il suo spazio.',
      quickWin: 'Prova qualcosa di completamente nuovo questo mese.'
    },
    excellent: {
      level: 'excellent',
      interpretation: 'Vivi con gioia! Hai capito che il divertimento non è un lusso.',
      quickWin: 'Organizza qualcosa di divertente per altri. La gioia condivisa si moltiplica.'
    }
  }
}

export function getAreaAnalysis(area: LifeAreaId, score: number): AreaAnalysis {
  let level: string
  if (score <= 3) level = 'critical'
  else if (score <= 5) level = 'low'
  else if (score <= 6.5) level = 'medium'
  else if (score <= 8) level = 'good'
  else level = 'excellent'
  
  return AREA_INTERPRETATIONS[area]?.[level] || {
    level: 'medium',
    interpretation: 'Quest\'area ha margini di miglioramento.',
    quickWin: 'Identifica una piccola azione che puoi fare oggi.'
  }
}

// =====================
// ANALISI COMPLESSIVA
// =====================

export interface FullAnalysis {
  lifeScore: number
  scoreBand: ScoreBand
  archetype: ArchetypeProfile
  strongestAreas: { area: LifeAreaId; score: number; label: string }[]
  weakestAreas: { area: LifeAreaId; score: number; label: string }[]
  priorityAnalysis: AreaAnalysis | null
  balanceInsight: string
}

const AREA_LABELS: Record<LifeAreaId, string> = {
  salute: 'Salute',
  finanze: 'Finanze',
  carriera: 'Carriera',
  relazioni: 'Relazioni',
  amore: 'Amore',
  crescita: 'Crescita',
  spiritualita: 'Spiritualità',
  divertimento: 'Divertimento'
}

export function generateFullAnalysis(
  scores: Record<LifeAreaId, number>,
  priorityArea?: LifeAreaId
): FullAnalysis {
  // Calcola Life Score
  const scoreValues = Object.values(scores)
  const lifeScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
  
  // Ordina aree
  const sortedAreas = Object.entries(scores)
    .map(([area, score]) => ({
      area: area as LifeAreaId,
      score,
      label: AREA_LABELS[area as LifeAreaId]
    }))
    .sort((a, b) => b.score - a.score)
  
  // Calcola varianza per insight equilibrio
  const variance = scoreValues.reduce((sum, score) => {
    return sum + Math.pow(score - lifeScore, 2)
  }, 0) / scoreValues.length
  
  let balanceInsight: string
  if (variance < 1.5) {
    balanceInsight = 'Le tue aree sono molto equilibrate tra loro. Questa stabilità è una forza!'
  } else if (variance < 3) {
    balanceInsight = 'C\'è un buon equilibrio generale, con alcune aree che spiccano più di altre.'
  } else if (variance < 5) {
    balanceInsight = 'Noti differenze significative tra le aree. Concentrarti su quelle più basse può portare grande impatto.'
  } else {
    balanceInsight = 'C\'è un forte squilibrio tra le aree. Lavorare sulle aree deboli può trasformare la tua vita.'
  }
  
  return {
    lifeScore: Math.round(lifeScore * 10) / 10,
    scoreBand: getScoreBand(lifeScore),
    archetype: determineArchetype(scores),
    strongestAreas: sortedAreas.slice(0, 3),
    weakestAreas: sortedAreas.slice(-3).reverse(),
    priorityAnalysis: priorityArea ? getAreaAnalysis(priorityArea, scores[priorityArea]) : null,
    balanceInsight
  }
}
