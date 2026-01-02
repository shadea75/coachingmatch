import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export interface MatchingInput {
  userScores: Record<string, number>
  userObjectives: Record<string, string[]>
  coaches: Array<{
    id: string
    name: string
    specializations: {
      lifeAreas: string[]
      problemsAddressed: string[]
      style: string[]
    }
    bio: string
  }>
}

export async function generateCoachMatching(input: MatchingInput): Promise<{
  matches: Array<{
    coachId: string
    score: number
    reasons: string[]
  }>
}> {
  const prompt = `
Sei un sistema di matching per una piattaforma di coaching. Devi analizzare il profilo di un utente e trovare i 3 coach più adatti tra quelli disponibili.

PROFILO UTENTE:
- Punteggi aree della vita (1-10, più basso = più bisogno di aiuto):
${Object.entries(input.userScores).map(([area, score]) => `  - ${area}: ${score}/10`).join('\n')}

- Obiettivi selezionati:
${Object.entries(input.userObjectives).map(([area, objectives]) => 
  objectives.length > 0 ? `  - ${area}: ${objectives.join(', ')}` : ''
).filter(Boolean).join('\n')}

COACH DISPONIBILI:
${input.coaches.map((coach, i) => `
${i + 1}. ${coach.name} (ID: ${coach.id})
   - Aree di specializzazione: ${coach.specializations.lifeAreas.join(', ')}
   - Problemi trattati: ${coach.specializations.problemsAddressed.join(', ')}
   - Stile: ${coach.specializations.style.join(', ')}
   - Bio: ${coach.bio.substring(0, 200)}...
`).join('\n')}

ISTRUZIONI:
1. Identifica le aree dove l'utente ha più bisogno (punteggi bassi + obiettivi selezionati)
2. Trova i 3 coach che meglio si allineano con questi bisogni
3. Per ogni match, fornisci 2-3 ragioni specifiche e personali in italiano

Rispondi SOLO con un JSON valido in questo formato esatto:
{
  "matches": [
    {
      "coachId": "id_del_coach",
      "score": 95,
      "reasons": ["Ragione 1 specifica", "Ragione 2 specifica"]
    }
  ]
}
`

  try {
    const result = await geminiModel.generateContent(prompt)
    const response = result.response.text()
    
    // Estrai JSON dalla risposta
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Error generating coach matching:', error)
    
    // Fallback: matching basato su overlap di aree
    const userPriorityAreas = Object.entries(input.userScores)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([area]) => area)
    
    const scoredCoaches = input.coaches.map(coach => {
      const areaOverlap = coach.specializations.lifeAreas
        .filter(area => userPriorityAreas.includes(area)).length
      
      return {
        coachId: coach.id,
        score: (areaOverlap / 3) * 100,
        reasons: [
          `Specializzato nelle aree che vuoi migliorare`,
          `Stile di coaching ${coach.specializations.style[0] || 'versatile'}`
        ]
      }
    })
    
    return {
      matches: scoredCoaches
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    }
  }
}

// Genera motivazione personalizzata per un singolo match
export async function generateMatchReason(
  coachName: string,
  coachSpecializations: string[],
  userNeeds: string[]
): Promise<string> {
  const prompt = `
Scrivi una frase breve e personale (max 30 parole) in italiano che spieghi perché ${coachName} è un buon match per un utente che vuole lavorare su: ${userNeeds.join(', ')}.

Il coach è specializzato in: ${coachSpecializations.join(', ')}.

Usa un tono caldo e rassicurante. Inizia con "${coachName}" e non usare virgolette.
`

  try {
    const result = await geminiModel.generateContent(prompt)
    return result.response.text().trim()
  } catch {
    return `${coachName} ha esperienza nelle aree che vuoi sviluppare e può accompagnarti nel tuo percorso di crescita.`
  }
}
