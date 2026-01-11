import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { LIFE_AREAS, LifeAreaId } from '@/types'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// =====================
// CONFIGURAZIONE
// =====================

const AREA_LABELS: Record<string, string> = {
  salute: 'Salute e Vitalità',
  finanze: 'Finanze',
  carriera: 'Carriera e Lavoro',
  relazioni: 'Relazioni e Amicizie',
  amore: 'Amore',
  crescita: 'Crescita Personale',
  spiritualita: 'Spiritualità',
  divertimento: 'Divertimento'
}

// Fasce Life Score
const SCORE_BANDS = [
  { min: 1, max: 3.9, emoji: '🌱', title: 'Tempo di Rinascita', color: '#EF4444', description: 'Stai attraversando un momento di grande sfida. Questo è il punto di partenza perfetto per una trasformazione profonda.' },
  { min: 4, max: 5.4, emoji: '🌿', title: 'In Costruzione', color: '#F59E0B', description: 'Hai delle basi solide in alcune aree, ma altre richiedono più energia. È il momento di fare scelte strategiche.' },
  { min: 5.5, max: 6.9, emoji: '🌳', title: 'Buon Equilibrio', color: '#3B82F6', description: 'Hai costruito una vita con fondamenta solide. Sei nella posizione ideale per fare il salto di qualità.' },
  { min: 7, max: 8.4, emoji: '🌸', title: 'In Fioritura', color: '#10B981', description: 'La tua vita è in una fase molto positiva. Piccoli aggiustamenti possono portarti ancora più in alto.' },
  { min: 8.5, max: 10, emoji: '✨', title: 'Vita Straordinaria', color: '#8B5CF6', description: 'Hai raggiunto un equilibrio raro. Sei un esempio di cosa è possibile quando si lavora su sé stessi.' }
]

// Archetipi
const ARCHETYPES = [
  { id: 'achiever', name: 'Il Conquistatore', emoji: '🏆', description: 'Eccelli nella carriera e finanze, ma potresti trascurare relazioni e benessere. Il successo esterno è importante, ma la vera realizzazione viene dall\'equilibrio.', strengths: ['Determinazione', 'Focus sugli obiettivi', 'Capacità di realizzazione'], challenges: ['Work-life balance', 'Connessioni profonde', 'Rallentare'] },
  { id: 'nurturer', name: 'Il Custode', emoji: '💝', description: 'Le tue relazioni sono il tuo punto di forza. Dedichi molto agli altri, ma potresti dimenticare di mettere te stesso al primo posto.', strengths: ['Empatia', 'Relazioni profonde', 'Capacità di supporto'], challenges: ['Mettere confini', 'Prenderti cura di te', 'Chiedere aiuto'] },
  { id: 'seeker', name: 'L\'Esploratore', emoji: '🧭', description: 'Sei in una fase di ricerca e scoperta. Stai cercando il tuo posto nel mondo e sperimentando diverse direzioni.', strengths: ['Curiosità', 'Apertura al nuovo', 'Adattamento'], challenges: ['Definire priorità', 'Portare a termine', 'Trovare stabilità'] },
  { id: 'philosopher', name: 'Il Saggio', emoji: '🦉', description: 'Hai una vita interiore ricca. Spiritualità e crescita personale sono i tuoi punti di forza, ma potresti aver bisogno di più azione.', strengths: ['Saggezza interiore', 'Autoconsapevolezza', 'Visione profonda'], challenges: ['Passare all\'azione', 'Aspetti pratici', 'Tradurre insight in risultati'] },
  { id: 'phoenix', name: 'La Fenice', emoji: '🔥', description: 'Stai attraversando una fase di trasformazione profonda. I punteggi bassi non ti definiscono - sono il trampolino per la rinascita.', strengths: ['Resilienza', 'Capacità di rinnovarsi', 'Coraggio'], challenges: ['Ricostruire le fondamenta', 'Pazienza', 'Credere in te stesso'] },
  { id: 'harmonizer', name: 'L\'Armonizzatore', emoji: '☯️', description: 'Hai costruito un equilibrio invidiabile. Non eccelli in una singola cosa, ma la tua forza è nella stabilità complessiva.', strengths: ['Equilibrio', 'Stabilità emotiva', 'Visione d\'insieme'], challenges: ['Eccellere in qualcosa', 'Uscire dalla comfort zone', 'Ambizione mirata'] }
]

// Consigli per area
const AREA_ANALYSIS: Record<string, Record<string, { interpretation: string, tips: string[] }>> = {
  salute: {
    low: { interpretation: 'La tua salute richiede attenzione. Senza energia fisica, tutto il resto diventa più difficile.', tips: ['Inizia con 10 minuti di movimento al giorno', 'Stabilisci un orario fisso per dormire', 'Bevi 2 litri d\'acqua al giorno'] },
    medium: { interpretation: 'Base discreta sulla salute, ma potresti sentirti molto meglio con qualche aggiustamento.', tips: ['Migliora la qualità del sonno', 'Aggiungi verdure a ogni pasto', 'Riduci lo stress con 5 minuti di respirazione'] },
    high: { interpretation: 'Ottimo! La salute è chiaramente una tua priorità. Continua così!', tips: ['Aggiungi allenamento di forza', 'Sperimenta con alimentazione', 'Condividi le tue abitudini'] }
  },
  finanze: {
    low: { interpretation: 'Lo stress finanziario sta impattando altre aree. È il momento di prendere il controllo.', tips: ['Traccia ogni spesa per 7 giorni', 'Elimina una spesa ricorrente non essenziale', 'Scrivi 3 obiettivi finanziari'] },
    medium: { interpretation: 'Gestisci le finanze ma senza grande margine. È tempo di costruire sicurezza.', tips: ['Imposta un risparmio automatico', 'Crea un fondo emergenza', 'Negozia un aumento o cerca nuove entrate'] },
    high: { interpretation: 'Finanze solide! Hai raggiunto un buon livello di libertà finanziaria.', tips: ['Esplora investimenti', 'Diversifica le entrate', 'Considera come creare impatto positivo'] }
  },
  carriera: {
    low: { interpretation: 'Il lavoro è fonte di insoddisfazione. Meriti di meglio e puoi ottenerlo.', tips: ['Scrivi come sarebbe il tuo lavoro ideale', 'Aggiorna LinkedIn', 'Contatta qualcuno nel tuo settore ideale'] },
    medium: { interpretation: 'Lavoro ok, ma senti che c\'è di più. Hai ragione - è tempo di crescere.', tips: ['Identifica una competenza da sviluppare', 'Chiedi feedback al tuo manager', 'Cerca un mentore'] },
    high: { interpretation: 'Carriera in ottima forma! Stai costruendo qualcosa di importante.', tips: ['Diventa mentore di qualcuno', 'Pensa all\'impatto oltre il ruolo', 'Condividi la tua esperienza'] }
  },
  relazioni: {
    low: { interpretation: 'Ti senti isolato o le relazioni sono fonte di dolore. Non sei fatto per stare solo.', tips: ['Scrivi a un amico che non senti da tempo', 'Pianifica un\'attività sociale settimanale', 'Pratica l\'ascolto attivo'] },
    medium: { interpretation: 'Hai relazioni ma potresti desiderare più profondità o connessione.', tips: ['Fai domande più profonde nelle conversazioni', 'Esprimi gratitudine a chi ti è vicino', 'Organizza un momento speciale'] },
    high: { interpretation: 'Relazioni solide! Hai costruito una rete di supporto importante.', tips: ['Organizza eventi che uniscano le persone', 'Sii presente nei momenti difficili', 'Celebra i successi degli altri'] }
  },
  amore: {
    low: { interpretation: 'L\'amore è un\'area di sofferenza o assenza. Meriti di essere amato, iniziando da te stesso.', tips: ['Chiediti: mi sto amando abbastanza?', 'Scrivi le qualità che cerchi in un partner', 'Lavora sulla tua autostima'] },
    medium: { interpretation: 'C\'è del buono ma anche margini di crescita nella sfera amorosa.', tips: ['Pianifica momenti speciali senza telefono', 'Pratica comunicazione aperta', 'Esprimi i tuoi bisogni chiaramente'] },
    high: { interpretation: 'Vita amorosa fiorente! Hai costruito qualcosa di speciale.', tips: ['Mantieni viva la curiosità per il partner', 'Crescete insieme', 'Condividi cosa funziona con altri'] }
  },
  crescita: {
    low: { interpretation: 'Ti senti bloccato, fermo. La crescita personale è stata messa in pausa.', tips: ['Scegli UN libro e inizia oggi', 'Identifica una paura che ti blocca', 'Scrivi 3 obiettivi per i prossimi 90 giorni'] },
    medium: { interpretation: 'Stai crescendo ma forse non alla velocità che desideri.', tips: ['20 minuti al giorno per imparare', 'Trova un accountability partner', 'Esci dalla comfort zone una volta a settimana'] },
    high: { interpretation: 'Crescita personale eccellente! Sei studente perpetuo della vita.', tips: ['Insegna ciò che sai', 'Cerca sfide più grandi', 'Diventa coach informale per altri'] }
  },
  spiritualita: {
    low: { interpretation: 'Senti un vuoto di significato. La vita sembra mancare di scopo.', tips: ['5 minuti di silenzio al giorno', 'Scrivi cosa ti dà significato', 'Fai volontariato'] },
    medium: { interpretation: 'Hai intuizioni sul senso della vita ma forse non le coltivi abbastanza.', tips: ['Inizia meditazione o journaling', 'Allinea azioni e valori', 'Trova una community spirituale'] },
    high: { interpretation: 'Vita interiore ricca e profonda. Hai trovato un senso che ti guida.', tips: ['Condividi la tua saggezza', 'Guida altri nel loro percorso', 'Approfondisci la pratica'] }
  },
  divertimento: {
    low: { interpretation: 'La gioia è sparita dalla tua vita. Quando hai riso l\'ultima volta di cuore?', tips: ['Fai qualcosa di "inutile" ma divertente oggi', 'Riscopri un hobby da bambino', 'Pianifica qualcosa di spontaneo'] },
    medium: { interpretation: 'C\'è divertimento ma forse non abbastanza. La vita merita più leggerezza.', tips: ['Blocca 2 ore settimanali solo per te', 'Prova qualcosa di completamente nuovo', 'Ridi di più, anche delle piccole cose'] },
    high: { interpretation: 'Vivi con gioia! Hai capito che il divertimento non è un lusso.', tips: ['Organizza esperienze per altri', 'Esplora nuovi hobby', 'Celebra anche le piccole vittorie'] }
  }
}

// =====================
// FUNZIONI HELPER
// =====================

function getScoreBand(score: number) {
  return SCORE_BANDS.find(band => score >= band.min && score <= band.max) || SCORE_BANDS[2]
}

function determineArchetype(scores: Record<string, number>) {
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
  const variance = Object.values(scores).reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / Object.values(scores).length
  
  const careerFinance = ((scores.carriera || 0) + (scores.finanze || 0)) / 2
  const relationships = ((scores.relazioni || 0) + (scores.amore || 0)) / 2
  const innerLife = ((scores.spiritualita || 0) + (scores.crescita || 0)) / 2
  
  if (avgScore < 4) return ARCHETYPES.find(a => a.id === 'phoenix')!
  if (variance < 2 && avgScore >= 5.5) return ARCHETYPES.find(a => a.id === 'harmonizer')!
  if (careerFinance >= 7 && (relationships < 5.5)) return ARCHETYPES.find(a => a.id === 'achiever')!
  if (relationships >= 7 && careerFinance < 6) return ARCHETYPES.find(a => a.id === 'nurturer')!
  if (innerLife >= 7 && careerFinance < 6) return ARCHETYPES.find(a => a.id === 'philosopher')!
  if (variance >= 4 || avgScore < 5.5) return ARCHETYPES.find(a => a.id === 'seeker')!
  return ARCHETYPES.find(a => a.id === 'harmonizer')!
}

function getAreaLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 4) return 'low'
  if (score <= 7) return 'medium'
  return 'high'
}

function getAreaAnalysis(area: string, score: number) {
  const level = getAreaLevel(score)
  return AREA_ANALYSIS[area]?.[level] || { interpretation: '', tips: [] }
}

// =====================
// API HANDLER
// =====================

export async function POST(request: NextRequest) {
  console.log('🚀 API lead-magnet chiamata')
  
  try {
    const body = await request.json()
    console.log('📥 Dati ricevuti:', { email: body.email, name: body.name, priorityArea: body.priorityArea })
    
    const { email, name, scores, priorityArea, lifeScore, archetype: clientArchetype } = body
    
    if (!email || !name || !scores || !priorityArea) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
    }
    
    const leadId = 'lead_' + Date.now()
    
    // Calcola analisi
    const numericScore = parseFloat(lifeScore)
    const scoreBand = getScoreBand(numericScore)
    const archetype = determineArchetype(scores)
    const priorityAnalysis = getAreaAnalysis(priorityArea, scores[priorityArea])
    
    // Ordina aree
    const sortedAreas = Object.entries(scores).sort(([,a], [,b]) => (b as number) - (a as number))
    const top3 = sortedAreas.slice(0, 3)
    const bottom3 = sortedAreas.slice(-3).reverse()
    
    // Costruisci email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f5f0; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- HEADER -->
    <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, ${scoreBand.color} 0%, ${scoreBand.color}dd 100%); border-radius: 20px 20px 0 0;">
      <p style="font-size: 50px; margin: 0 0 10px 0;">${scoreBand.emoji}</p>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">${scoreBand.title}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Ciao ${name}!</p>
    </div>
    
    <!-- LIFE SCORE -->
    <div style="background: white; padding: 30px; text-align: center;">
      <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Il tuo Life Score</p>
      <p style="font-size: 64px; font-weight: 800; color: ${scoreBand.color}; margin: 0;">${lifeScore}<span style="font-size: 24px; color: #9CA3AF;">/10</span></p>
      <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 14px; max-width: 400px; margin-left: auto; margin-right: auto;">
        ${scoreBand.description}
      </p>
    </div>
    
    <!-- ARCHETIPO -->
    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); padding: 25px; margin: 0;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 60px; vertical-align: top;">
            <span style="font-size: 40px;">${archetype.emoji}</span>
          </td>
          <td style="vertical-align: top;">
            <p style="color: #7c3aed; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px 0;">Il tuo profilo</p>
            <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 22px;">${archetype.name}</h2>
            <p style="color: #4b5563; margin: 0; font-size: 14px;">${archetype.description}</p>
          </td>
        </tr>
      </table>
      
      <!-- Punti di forza e sfide -->
      <table style="width: 100%; margin-top: 20px; border-collapse: separate; border-spacing: 10px 0;">
        <tr>
          <td style="background: white; padding: 15px; border-radius: 10px; width: 50%; vertical-align: top;">
            <p style="color: #059669; font-size: 12px; font-weight: 600; margin: 0 0 10px 0;">✨ Punti di forza</p>
            ${archetype.strengths.map(s => `<p style="color: #374151; font-size: 13px; margin: 5px 0;">• ${s}</p>`).join('')}
          </td>
          <td style="background: white; padding: 15px; border-radius: 10px; width: 50%; vertical-align: top;">
            <p style="color: #d97706; font-size: 12px; font-weight: 600; margin: 0 0 10px 0;">⚡ Le tue sfide</p>
            ${archetype.challenges.map(c => `<p style="color: #374151; font-size: 13px; margin: 5px 0;">• ${c}</p>`).join('')}
          </td>
        </tr>
      </table>
    </div>
    
    <!-- PUNTEGGI PER AREA -->
    <div style="background: white; padding: 25px;">
      <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 16px;">📊 I tuoi punteggi</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${LIFE_AREAS.map(area => {
          const score = scores[area.id] || 0
          const barWidth = (score / 10) * 100
          return `
          <tr>
            <td style="padding: 8px 0; color: #374151; font-size: 13px; width: 35%;">${AREA_LABELS[area.id]}</td>
            <td style="padding: 8px 0; width: 50%;">
              <div style="background: #e5e7eb; border-radius: 10px; height: 10px; overflow: hidden;">
                <div style="background: ${area.color}; width: ${barWidth}%; height: 100%; border-radius: 10px;"></div>
              </div>
            </td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: ${area.color}; width: 15%; font-size: 14px;">${score}</td>
          </tr>
          `
        }).join('')}
      </table>
    </div>
    
    <!-- TOP 3 e BOTTOM 3 -->
    <div style="padding: 0 20px;">
      <table style="width: 100%; border-collapse: separate; border-spacing: 10px;">
        <tr>
          <td style="background: #ecfdf5; padding: 20px; border-radius: 12px; width: 50%; vertical-align: top;">
            <p style="color: #059669; font-size: 12px; font-weight: 600; margin: 0 0 15px 0;">🏆 Le tue aree top</p>
            ${top3.map(([area, score], i) => `
              <p style="color: #374151; font-size: 13px; margin: 8px 0;">
                ${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${AREA_LABELS[area]} <span style="float: right; font-weight: 700; color: #059669;">${score}/10</span>
              </p>
            `).join('')}
          </td>
          <td style="background: #fef3c7; padding: 20px; border-radius: 12px; width: 50%; vertical-align: top;">
            <p style="color: #d97706; font-size: 12px; font-weight: 600; margin: 0 0 15px 0;">🎯 Aree con potenziale</p>
            ${bottom3.map(([area, score], i) => `
              <p style="color: #374151; font-size: 13px; margin: 8px 0;">
                ${i === 0 ? '🎯' : i === 1 ? '📈' : '💪'} ${AREA_LABELS[area]} <span style="float: right; font-weight: 700; color: #d97706;">${score}/10</span>
              </p>
            `).join('')}
          </td>
        </tr>
      </table>
    </div>
    
    <!-- ANALISI AREA PRIORITARIA -->
    <div style="background: linear-gradient(135deg, #D4A574 0%, #C4956A 100%); margin: 20px; padding: 25px; border-radius: 16px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px 0;">🎯 La tua priorità</p>
      <h3 style="color: white; margin: 0 0 5px 0; font-size: 22px;">${AREA_LABELS[priorityArea]}</h3>
      <p style="color: white; font-size: 28px; font-weight: 800; margin: 0 0 15px 0;">${scores[priorityArea]}/10</p>
      
      <p style="color: rgba(255,255,255,0.95); font-size: 14px; margin: 0 0 20px 0;">
        ${priorityAnalysis.interpretation}
      </p>
      
      <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 12px;">
        <p style="color: white; font-size: 13px; font-weight: 600; margin: 0 0 15px 0;">⚡ Le tue 3 azioni immediate:</p>
        ${priorityAnalysis.tips.map((tip, i) => `
          <p style="color: white; font-size: 14px; margin: 10px 0; padding-left: 25px; position: relative;">
            <span style="position: absolute; left: 0;">${i + 1}.</span> ${tip}
          </p>
        `).join('')}
      </div>
    </div>
    
    <!-- CTA -->
    <div style="background: #1f2937; padding: 30px; text-align: center; border-radius: 0 0 20px 20px;">
      <h3 style="color: white; margin: 0 0 10px 0; font-size: 20px;">Pronto a trasformare la tua ${AREA_LABELS[priorityArea]}?</h3>
      <p style="color: #9ca3af; font-size: 14px; margin: 0 0 20px 0;">
        I nostri coach specializzati possono aiutarti.<br>La prima call conoscitiva è gratuita.
      </p>
      <a href="https://www.coachami.it/coaches?area=${priorityArea}" 
         style="display: inline-block; background: #D4A574; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
        Trova il tuo Coach →
      </a>
    </div>
    
    <!-- FOOTER -->
    <div style="text-align: center; padding: 30px 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Hai ricevuto questa email perché hai completato il test su CoachaMi.<br>
        <a href="https://www.coachami.it" style="color: #D4A574;">www.coachami.it</a>
      </p>
    </div>
    
  </div>
</body>
</html>
    `
    
    // Invia email
    if (resend) {
      try {
        const emailResult = await resend.emails.send({
          from: 'CoachaMi <noreply@coachami.it>',
          to: email,
          subject: `${name}, ecco il tuo Report completo della Ruota della Vita 🎯`,
          html: emailHtml
        })
        console.log('✅ Email inviata a:', email, emailResult)
      } catch (emailError: any) {
        console.error('❌ Errore invio email:', emailError?.message || emailError)
      }
    } else {
      console.log('⚠️ Resend non configurato')
    }
    
    // Salva lead in Firebase per nurturing
    try {
      await setDoc(doc(collection(db, 'leads'), leadId), {
        email,
        name,
        scores,
        archetypeId: archetype.id,
        priorityArea,
        lifeScore: parseFloat(lifeScore.toFixed(1)),
        status: 'new', // new | reminded | assigned | booked | converted
        reminderCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      console.log('✅ Lead salvato in Firebase:', leadId)
    } catch (dbError: any) {
      console.error('❌ Errore salvataggio lead:', dbError?.message || dbError)
    }
    
    console.log('✅ API completata')
    return NextResponse.json({ success: true, leadId })
    
  } catch (error: any) {
    console.error('❌ Errore API:', error?.message || error)
    return NextResponse.json({ error: 'Errore interno', details: error?.message }, { status: 500 })
  }
}
