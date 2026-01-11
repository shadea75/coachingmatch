// Sistema Archetipi Avanzato per CoachaMi
// 12 archetipi + combinazioni + domande di conferma
// File: src/lib/archetypes.ts

import { LifeAreaId } from '@/types'

// =====================
// 12 ARCHETIPI
// =====================

export interface Archetype {
  id: string
  name: string
  emoji: string
  tagline: string // Frase breve per teaser
  description: string // Descrizione completa
  strengths: string[]
  challenges: string[]
  advice: string
  // Pattern di punteggi che identificano questo archetipo
  pattern: {
    highAreas: LifeAreaId[] // Aree che devono essere alte (≥7)
    lowAreas: LifeAreaId[] // Aree che devono essere basse (≤5)
    conditions?: (scores: Record<LifeAreaId, number>) => boolean
  }
}

export const ARCHETYPES: Archetype[] = [
  // === ARCHETIPI ORIENTATI AL SUCCESSO ===
  {
    id: 'achiever',
    name: 'Il Conquistatore',
    emoji: '🏆',
    tagline: 'Costruisci successo, ma a quale prezzo?',
    description: 'Sei una forza della natura quando si tratta di raggiungere obiettivi. Carriera e finanze sono il tuo terreno di gioco, dove eccelli con determinazione impressionante. Ma la corsa al successo potrebbe averti fatto perdere di vista ciò che conta davvero: le connessioni umane e il tuo benessere interiore.',
    strengths: ['Determinazione incrollabile', 'Visione strategica', 'Capacità di esecuzione', 'Resilienza professionale'],
    challenges: ['Equilibrio vita-lavoro', 'Connessioni emotive profonde', 'Rallentare senza sentirti in colpa', 'Definire il successo oltre i numeri'],
    advice: 'Il vero successo include le persone che ami. Il prossimo traguardo? Investire nelle relazioni con la stessa energia che dedichi al lavoro.',
    pattern: {
      highAreas: ['carriera', 'finanze'],
      lowAreas: ['relazioni', 'amore', 'divertimento']
    }
  },
  {
    id: 'leader',
    name: 'Il Leader',
    emoji: '👑',
    tagline: 'Guidi gli altri, ma chi guida te?',
    description: 'Hai una naturale capacità di ispirare e guidare. Le persone si rivolgono a te per direzione e supporto. Carriera e relazioni professionali sono i tuoi punti di forza. Ma essere sempre "quello forte" può essere stancante - quando è stata l\'ultima volta che hai chiesto aiuto?',
    strengths: ['Carisma naturale', 'Capacità decisionale', 'Ispirare gli altri', 'Gestione delle responsabilità'],
    challenges: ['Mostrare vulnerabilità', 'Delegare veramente', 'Tempo per te stesso', 'Relazioni alla pari'],
    advice: 'Anche i leader hanno bisogno di essere guidati qualche volta. Trova il tuo mentore o coach - non è debolezza, è saggezza.',
    pattern: {
      highAreas: ['carriera', 'relazioni'],
      lowAreas: ['spiritualita', 'divertimento']
    }
  },
  {
    id: 'strategist',
    name: 'Lo Stratega',
    emoji: '♟️',
    tagline: 'Pianifichi tutto, ma vivi abbastanza?',
    description: 'La tua mente è una macchina di pianificazione. Finanze solide, crescita costante, ogni mossa è calcolata. Ma tra un piano e l\'altro, ti sei dimenticato di vivere il presente? La spontaneità non è caos - è vita.',
    strengths: ['Pensiero a lungo termine', 'Gestione del rischio', 'Disciplina', 'Costruzione sistematica'],
    challenges: ['Spontaneità', 'Vivere il presente', 'Accettare l\'imprevisto', 'Lasciarsi andare'],
    advice: 'Il miglior piano è quello che include spazio per l\'inaspettato. Prova a fare qualcosa di non pianificato questa settimana.',
    pattern: {
      highAreas: ['finanze', 'crescita'],
      lowAreas: ['divertimento', 'amore']
    }
  },

  // === ARCHETIPI ORIENTATI ALLE RELAZIONI ===
  {
    id: 'nurturer',
    name: 'Il Custode',
    emoji: '💝',
    tagline: 'Dai tanto agli altri, ma chi si prende cura di te?',
    description: 'Il tuo cuore è grande come una casa. Le relazioni sono il centro della tua vita e dai tutto te stesso per chi ami. Ma attenzione: a forza di riempire le tazze degli altri, la tua potrebbe essere vuota. L\'amore per gli altri inizia dall\'amore per te stesso.',
    strengths: ['Empatia profonda', 'Creare connessioni', 'Supporto incondizionato', 'Intuizione emotiva'],
    challenges: ['Mettere confini sani', 'Chiedere aiuto', 'Dire di no', 'Prioritizzare te stesso'],
    advice: 'Non puoi versare da una tazza vuota. Questa settimana, fai qualcosa solo per te - senza sensi di colpa.',
    pattern: {
      highAreas: ['relazioni', 'amore'],
      lowAreas: ['carriera', 'finanze']
    }
  },
  {
    id: 'connector',
    name: 'Il Connettore',
    emoji: '🌐',
    tagline: 'Unisci mondi, ma hai trovato il tuo posto?',
    description: 'Sei il ponte tra le persone. La tua rete è vasta, le tue relazioni tante. Sai mettere in contatto le persone giuste e creare sinergie. Ma tra tante connessioni superficiali, quante sono veramente profonde? Qualità vs quantità.',
    strengths: ['Networking naturale', 'Creare opportunità', 'Diplomazia', 'Vedere il potenziale negli altri'],
    challenges: ['Relazioni profonde vs ampie', 'Tempo per intimità', 'Essere invece di fare', 'Connessione con te stesso'],
    advice: 'Scegli 3 relazioni da approfondire questo mese. Meno ma meglio.',
    pattern: {
      highAreas: ['relazioni', 'carriera'],
      lowAreas: ['spiritualita', 'crescita']
    }
  },
  {
    id: 'romantic',
    name: 'Il Romantico',
    emoji: '🌹',
    tagline: 'Cerchi l\'amore ideale, ma ami te stesso?',
    description: 'L\'amore è la tua lingua madre. Credi nelle connessioni profonde, nei gesti significativi, nelle storie che durano per sempre. Ma a volte l\'idealismo può portare a delusioni. L\'amore più importante è quello che dai a te stesso.',
    strengths: ['Profondità emotiva', 'Dedizione', 'Vedere il bello', 'Creare intimità'],
    challenges: ['Aspettative realistiche', 'Indipendenza emotiva', 'Amare senza perdersi', 'Accettare l\'imperfezione'],
    advice: 'L\'amore perfetto non esiste, ma l\'amore autentico sì. Inizia amando le tue imperfezioni.',
    pattern: {
      highAreas: ['amore', 'spiritualita'],
      lowAreas: ['carriera', 'finanze']
    }
  },

  // === ARCHETIPI ORIENTATI ALLA CRESCITA INTERIORE ===
  {
    id: 'philosopher',
    name: 'Il Saggio',
    emoji: '🦉',
    tagline: 'Pensi in profondità, ma agisci abbastanza?',
    description: 'La tua mente è un tempio di riflessione. Cerchi significato, esplori idee, vedi oltre la superficie. Spiritualità e crescita personale sono il tuo pane quotidiano. Ma la saggezza senza azione resta solo potenziale. Il mondo ha bisogno che tu metta in pratica ciò che sai.',
    strengths: ['Profondità di pensiero', 'Autoconsapevolezza', 'Visione filosofica', 'Capacità di insight'],
    challenges: ['Passare all\'azione', 'Aspetti pratici della vita', 'Uscire dalla testa', 'Tradurre idee in realtà'],
    advice: 'Un\'idea vale zero finché non diventa azione. Scegli un insight e trasformalo in comportamento concreto oggi.',
    pattern: {
      highAreas: ['spiritualita', 'crescita'],
      lowAreas: ['carriera', 'finanze']
    }
  },
  {
    id: 'healer',
    name: 'Il Guaritore',
    emoji: '🙏',
    tagline: 'Curi gli altri, ma le tue ferite?',
    description: 'Hai un dono naturale per aiutare gli altri a stare meglio. La tua sensibilità ti permette di vedere il dolore altrui e offrire conforto. Ma i guaritori spesso dimenticano di guarire se stessi. Le tue ferite meritano la stessa attenzione.',
    strengths: ['Sensibilità', 'Capacità di ascolto', 'Presenza compassionevole', 'Intuizione del bisogno altrui'],
    challenges: ['Assorbire emozioni altrui', 'Proteggere la tua energia', 'Guarire te stesso', 'Confini emotivi'],
    advice: 'Prima di guarire il mondo, prenditi cura delle tue ferite. Non è egoismo, è necessità.',
    pattern: {
      highAreas: ['spiritualita', 'relazioni'],
      lowAreas: ['salute', 'finanze']
    }
  },

  // === ARCHETIPI IN TRANSIZIONE ===
  {
    id: 'phoenix',
    name: 'La Fenice',
    emoji: '🔥',
    tagline: 'Dalle ceneri risorgi più forte.',
    description: 'Stai attraversando - o hai appena attraversato - un periodo di profonda trasformazione. I punteggi bassi non ti definiscono: sono il terreno fertile per la rinascita. Ogni fenice deve bruciare prima di risorgere. Questo è il tuo momento.',
    strengths: ['Resilienza straordinaria', 'Capacità di ricominciare', 'Coraggio nel cambiamento', 'Autenticità forzata'],
    challenges: ['Pazienza nel processo', 'Fiducia nel futuro', 'Accettare aiuto', 'Non tornare indietro'],
    advice: 'Questo momento passerà e tu ne uscirai trasformato. Non affrettare il processo - ogni fase ha il suo scopo.',
    pattern: {
      highAreas: [],
      lowAreas: ['salute', 'carriera', 'finanze', 'relazioni'],
      conditions: (scores) => {
        const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 8
        return avg < 4.5
      }
    }
  },
  {
    id: 'seeker',
    name: 'L\'Esploratore',
    emoji: '🧭',
    tagline: 'Cerchi la tua strada, il viaggio è iniziato.',
    description: 'Sei in una fase di ricerca e scoperta. Non hai ancora trovato il tuo equilibrio, e va bene così. Stai esplorando chi sei e cosa vuoi veramente. Il viaggio di scoperta è tanto importante quanto la destinazione.',
    strengths: ['Curiosità infinita', 'Apertura al nuovo', 'Flessibilità', 'Coraggio di cercare'],
    challenges: ['Trovare direzione', 'Impegnarsi in una scelta', 'Pazienza', 'Fidarsi del processo'],
    advice: 'Non devi avere tutte le risposte oggi. Continua a esplorare, ma ricorda: a un certo punto dovrai piantare radici.',
    pattern: {
      highAreas: [],
      lowAreas: [],
      conditions: (scores) => {
        const values = Object.values(scores)
        const avg = values.reduce((a, b) => a + b, 0) / 8
        const variance = values.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / 8
        return variance > 5 // Alta varianza = punteggi molto diversi
      }
    }
  },

  // === ARCHETIPI DI EQUILIBRIO ===
  {
    id: 'harmonizer',
    name: 'L\'Armonizzatore',
    emoji: '☯️',
    tagline: 'Equilibrio raro, ma c\'è spazio per eccellere.',
    description: 'Hai costruito qualcosa di raro: un equilibrio tra le diverse aree della vita. Non eccelli in una singola cosa, ma la tua forza è proprio nella stabilità complessiva. Ora la sfida è: mantenere l\'equilibrio mentre punti all\'eccellenza in ciò che conta di più per te.',
    strengths: ['Equilibrio naturale', 'Visione d\'insieme', 'Stabilità emotiva', 'Gestione delle priorità'],
    challenges: ['Eccellere in qualcosa', 'Evitare la mediocrità diffusa', 'Osare di più', 'Scegliere una direzione'],
    advice: 'L\'equilibrio è la tua base. Ora scegli un\'area e portala all\'eccellenza - senza perdere l\'armonia.',
    pattern: {
      highAreas: [],
      lowAreas: [],
      conditions: (scores) => {
        const values = Object.values(scores)
        const avg = values.reduce((a, b) => a + b, 0) / 8
        const variance = values.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / 8
        return variance < 2 && avg >= 5.5
      }
    }
  },
  {
    id: 'creative',
    name: 'Il Creativo',
    emoji: '🎨',
    tagline: 'Vedi bellezza ovunque, ora crea la tua vita.',
    description: 'Hai un\'anima artistica. Divertimento, espressione e crescita personale ti guidano. Vedi possibilità dove altri vedono ostacoli. Ma la creatività senza struttura può disperdersi. Il tuo prossimo capolavoro? Una vita progettata con intenzione.',
    strengths: ['Pensiero divergente', 'Vedere possibilità', 'Espressività', 'Innovazione'],
    challenges: ['Struttura e disciplina', 'Monetizzare i talenti', 'Portare a termine', 'Aspetti pratici'],
    advice: 'La creatività fiorisce con la struttura, non nonostante essa. Crea routine che supportino la tua arte.',
    pattern: {
      highAreas: ['divertimento', 'crescita'],
      lowAreas: ['finanze', 'carriera']
    }
  }
]

// =====================
// DOMANDE DI CONFERMA
// =====================

export interface ConfirmationQuestion {
  id: string
  question: string
  options: {
    text: string
    archetypeBonus: Record<string, number> // archetypeId -> bonus points
  }[]
}

export const CONFIRMATION_QUESTIONS: ConfirmationQuestion[] = [
  {
    id: 'weekend',
    question: 'Come trascorri idealmente il weekend?',
    options: [
      { 
        text: 'Lavorando su progetti personali o professionali', 
        archetypeBonus: { achiever: 2, strategist: 2, leader: 1 } 
      },
      { 
        text: 'Con famiglia e amici', 
        archetypeBonus: { nurturer: 2, connector: 1, romantic: 1 } 
      },
      { 
        text: 'In solitudine, riflettendo o meditando', 
        archetypeBonus: { philosopher: 2, healer: 1, creative: 1 } 
      },
      { 
        text: 'Esplorando posti nuovi o provando cose diverse', 
        archetypeBonus: { seeker: 2, creative: 2, harmonizer: 1 } 
      }
    ]
  },
  {
    id: 'stress',
    question: 'Quando sei sotto stress, cosa fai?',
    options: [
      { 
        text: 'Mi concentro ancora di più sul lavoro', 
        archetypeBonus: { achiever: 2, leader: 1, strategist: 1 } 
      },
      { 
        text: 'Cerco supporto dalle persone care', 
        archetypeBonus: { nurturer: 2, connector: 1, romantic: 1 } 
      },
      { 
        text: 'Mi ritiro per elaborare da solo', 
        archetypeBonus: { philosopher: 2, healer: 1, phoenix: 1 } 
      },
      { 
        text: 'Cerco distrazioni o nuove esperienze', 
        archetypeBonus: { seeker: 2, creative: 1, harmonizer: 1 } 
      }
    ]
  },
  {
    id: 'success',
    question: 'Cosa significa "successo" per te?',
    options: [
      { 
        text: 'Raggiungere obiettivi concreti e riconoscimento', 
        archetypeBonus: { achiever: 3, leader: 2, strategist: 1 } 
      },
      { 
        text: 'Avere relazioni profonde e significative', 
        archetypeBonus: { nurturer: 3, romantic: 2, connector: 1 } 
      },
      { 
        text: 'Trovare pace interiore e significato', 
        archetypeBonus: { philosopher: 3, healer: 2, phoenix: 1 } 
      },
      { 
        text: 'Libertà di vivere come voglio', 
        archetypeBonus: { seeker: 2, creative: 2, harmonizer: 2 } 
      }
    ]
  }
]

// =====================
// ALGORITMO DI CALCOLO
// =====================

export interface ArchetypeResult {
  primary: Archetype
  secondary: Archetype | null
  scores: Record<string, number> // Punteggio per ogni archetipo
  combination: string | null // Es: "Conquistatore con anima da Saggio"
}

export function calculateArchetype(
  areaScores: Record<LifeAreaId, number>,
  questionAnswers?: Record<string, number> // questionId -> optionIndex
): ArchetypeResult {
  const archetypeScores: Record<string, number> = {}
  
  // Inizializza punteggi a 0
  ARCHETYPES.forEach(a => archetypeScores[a.id] = 0)
  
  // 1. Calcola punteggi base dai pattern delle aree
  ARCHETYPES.forEach(archetype => {
    let score = 0
    
    // Bonus per aree alte
    archetype.pattern.highAreas.forEach(area => {
      if (areaScores[area] >= 7) score += 3
      else if (areaScores[area] >= 6) score += 1
    })
    
    // Bonus per aree basse (conferma il pattern)
    archetype.pattern.lowAreas.forEach(area => {
      if (areaScores[area] <= 5) score += 2
      else if (areaScores[area] <= 6) score += 1
    })
    
    // Condizioni speciali
    if (archetype.pattern.conditions) {
      if (archetype.pattern.conditions(areaScores)) {
        score += 5 // Bonus significativo per condizioni speciali
      }
    }
    
    archetypeScores[archetype.id] = score
  })
  
  // 2. Aggiungi bonus dalle domande di conferma
  if (questionAnswers) {
    CONFIRMATION_QUESTIONS.forEach(q => {
      const answerIndex = questionAnswers[q.id]
      if (answerIndex !== undefined && q.options[answerIndex]) {
        const bonuses = q.options[answerIndex].archetypeBonus
        Object.entries(bonuses).forEach(([archetypeId, bonus]) => {
          archetypeScores[archetypeId] = (archetypeScores[archetypeId] || 0) + bonus
        })
      }
    })
  }
  
  // 3. Trova primary e secondary
  const sortedArchetypes = Object.entries(archetypeScores)
    .sort(([, a], [, b]) => b - a)
    .map(([id, score]) => ({
      archetype: ARCHETYPES.find(a => a.id === id)!,
      score
    }))
  
  const primary = sortedArchetypes[0].archetype
  const secondary = sortedArchetypes[1].score >= sortedArchetypes[0].score * 0.6 
    ? sortedArchetypes[1].archetype 
    : null
  
  // 4. Genera combinazione se c'è secondary significativo
  let combination: string | null = null
  if (secondary && sortedArchetypes[1].score >= sortedArchetypes[0].score * 0.7) {
    combination = `${primary.name} con anima da ${secondary.name.replace('Il ', '').replace('La ', '').replace('Lo ', '').replace("L'", '')}`
  }
  
  return {
    primary,
    secondary,
    scores: archetypeScores,
    combination
  }
}

// =====================
// COMBINAZIONI SPECIALI
// =====================

export const SPECIAL_COMBINATIONS: Record<string, {
  name: string
  description: string
}> = {
  'achiever+philosopher': {
    name: 'Il Visionario',
    description: 'Unisci ambizione e profondità. Puoi raggiungere grandi cose con significato.'
  },
  'nurturer+leader': {
    name: 'Il Leader Compassionevole',
    description: 'Guidi con il cuore. Le persone ti seguono perché si sentono viste.'
  },
  'creative+strategist': {
    name: 'L\'Innovatore',
    description: 'Creatività con metodo. Trasformi idee in realtà concrete.'
  },
  'healer+phoenix': {
    name: 'Il Guaritore Ferito',
    description: 'Le tue cicatrici sono la tua forza. Capisci il dolore perché l\'hai vissuto.'
  },
  'seeker+philosopher': {
    name: 'Il Pellegrino',
    description: 'Cerchi verità profonde. Il viaggio è la destinazione.'
  }
}

export function getSpecialCombination(primaryId: string, secondaryId: string): { name: string; description: string } | null {
  const key1 = `${primaryId}+${secondaryId}`
  const key2 = `${secondaryId}+${primaryId}`
  return SPECIAL_COMBINATIONS[key1] || SPECIAL_COMBINATIONS[key2] || null
}
