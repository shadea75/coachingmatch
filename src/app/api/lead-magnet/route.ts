import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { LifeAreaId, LIFE_AREAS } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

// Label aree in italiano
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

// Consigli personalizzati per area prioritaria
const AREA_TIPS: Record<string, string[]> = {
  salute: [
    '🏃 Inizia con 10 minuti di movimento al giorno - anche una passeggiata conta',
    '😴 Stabilisci un orario fisso per andare a dormire e svegliarti',
    '🥗 Aggiungi una porzione extra di verdure a ogni pasto'
  ],
  finanze: [
    '📊 Traccia le tue spese per una settimana - la consapevolezza è il primo passo',
    '💰 Imposta un bonifico automatico verso un conto risparmio, anche piccolo',
    '📝 Scrivi 3 obiettivi finanziari concreti per i prossimi 12 mesi'
  ],
  carriera: [
    '🎯 Definisci come vorresti che fosse la tua giornata lavorativa ideale',
    '📚 Dedica 20 minuti al giorno a imparare qualcosa di nuovo nel tuo campo',
    '🤝 Contatta una persona al mese che ammiri professionalmente'
  ],
  relazioni: [
    '📱 Scrivi a un amico che non senti da tempo - oggi stesso',
    '🗓️ Pianifica un\'attività sociale fissa settimanale',
    '👂 Nella prossima conversazione, ascolta più di quanto parli'
  ],
  amore: [
    '💝 Se sei in coppia: pianifica una "date night" senza telefoni',
    '🪞 Rifletti: quali qualità cerchi davvero in un partner?',
    '💬 Pratica la comunicazione aperta sui tuoi bisogni emotivi'
  ],
  crescita: [
    '📖 Scegli un libro di crescita personale e leggine 10 pagine al giorno',
    '🧘 Inizia una pratica di journaling: 5 minuti ogni mattina',
    '🎯 Identifica una paura che ti blocca e fai un piccolo passo per affrontarla'
  ],
  spiritualita: [
    '🙏 Pratica 5 minuti di meditazione o silenzio ogni mattina',
    '📝 Scrivi i tuoi 5 valori più importanti - li stai vivendo?',
    '🌟 Chiediti: "Qual è il mio contributo unico al mondo?"'
  ],
  divertimento: [
    '🎨 Riscopri un hobby che amavi da bambino',
    '📅 Blocca in agenda 2 ore a settimana solo per te',
    '🎲 Prova qualcosa di nuovo questo mese - un corso, un ristorante, un\'attività'
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, scores, priorityArea, lifeScore } = body
    
    if (!email || !name || !scores || !priorityArea) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      )
    }
    
    // 1. Salva il lead nel database Firebase
    const leadData = {
      email,
      name,
      scores,
      priorityArea,
      lifeScore: parseFloat(lifeScore),
      source: 'test-gratuito',
      createdAt: serverTimestamp(),
      emailSent: false,
      convertedToUser: false
    }
    
    const docRef = await addDoc(collection(db, 'leads'), leadData)
    console.log('Lead salvato con ID:', docRef.id)
    
    // 2. Prepara i dati per l'email
    const sortedAreas = Object.entries(scores)
      .sort(([,a], [,b]) => (b as number) - (a as number))
    const strongestArea = sortedAreas[0]?.[0]
    const weakestArea = sortedAreas[sortedAreas.length - 1]?.[0]
    
    const tips = AREA_TIPS[priorityArea] || AREA_TIPS.crescita
    
    // 3. Costruisci l'HTML dell'email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Il tuo Report - Ruota della Vita</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f5f0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); border-radius: 16px 16px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎯 La tua Ruota della Vita</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Ciao ${name}!</p>
    </div>
    
    <!-- Life Score -->
    <div style="background: white; padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
      <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">IL TUO LIFE SCORE</p>
      <p style="font-size: 56px; font-weight: bold; color: #7C3AED; margin: 0;">${lifeScore}<span style="font-size: 24px; color: #9CA3AF;">/10</span></p>
    </div>
    
    <!-- Scores Table -->
    <div style="background: white; padding: 30px;">
      <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 20px 0;">📊 I tuoi punteggi per area</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${LIFE_AREAS.map(area => {
          const score = scores[area.id] || 0
          const barWidth = (score / 10) * 100
          return `
          <tr>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; width: 40%;">${AREA_LABELS[area.id]}</td>
            <td style="padding: 8px 0; width: 45%;">
              <div style="background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden;">
                <div style="background: ${area.color}; width: ${barWidth}%; height: 100%;"></div>
              </div>
            </td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${area.color}; width: 15%;">${score}/10</td>
          </tr>
          `
        }).join('')}
      </table>
    </div>
    
    <!-- Insights -->
    <div style="display: flex; gap: 10px; padding: 0 20px;">
      <div style="flex: 1; background: #ecfdf5; padding: 20px; border-radius: 12px; text-align: center;">
        <p style="color: #059669; font-size: 12px; margin: 0 0 5px 0;">✨ PUNTO DI FORZA</p>
        <p style="color: #1f2937; font-weight: bold; margin: 0; font-size: 14px;">${AREA_LABELS[strongestArea]}</p>
        <p style="color: #059669; font-size: 20px; font-weight: bold; margin: 5px 0 0 0;">${scores[strongestArea]}/10</p>
      </div>
      <div style="flex: 1; background: #fef3c7; padding: 20px; border-radius: 12px; text-align: center;">
        <p style="color: #d97706; font-size: 12px; margin: 0 0 5px 0;">⚡ DA MIGLIORARE</p>
        <p style="color: #1f2937; font-weight: bold; margin: 0; font-size: 14px;">${AREA_LABELS[weakestArea]}</p>
        <p style="color: #d97706; font-size: 20px; font-weight: bold; margin: 5px 0 0 0;">${scores[weakestArea]}/10</p>
      </div>
    </div>
    
    <!-- Priority Area Tips -->
    <div style="background: #7C3AED; margin: 20px; padding: 25px; border-radius: 12px;">
      <h2 style="color: white; font-size: 18px; margin: 0 0 5px 0;">🎯 La tua priorità: ${AREA_LABELS[priorityArea]}</h2>
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 20px 0;">Ecco 3 azioni concrete per iniziare:</p>
      
      ${tips.map((tip, i) => `
      <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px; margin-bottom: ${i < 2 ? '10px' : '0'};">
        <p style="color: white; margin: 0; font-size: 14px;">${tip}</p>
      </div>
      `).join('')}
    </div>
    
    <!-- CTA -->
    <div style="background: white; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
      <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 10px 0;">Pronto a trasformare la tua ${AREA_LABELS[priorityArea]}?</h2>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0;">
        I nostri coach specializzati possono aiutarti a raggiungere i tuoi obiettivi.
        <br>La prima call conoscitiva è gratuita.
      </p>
      <a href="https://www.coachami.it/coaches?area=${priorityArea}" 
         style="display: inline-block; background: #7C3AED; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Trova il tuo Coach →
      </a>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 30px 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
        Hai ricevuto questa email perché hai completato il test gratuito su CoachaMi.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="https://www.coachami.it" style="color: #7C3AED;">www.coachami.it</a>
      </p>
    </div>
    
  </div>
</body>
</html>
    `
    
    // 4. Invia l'email
    try {
      await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: email,
        subject: `${name}, ecco il tuo Report della Ruota della Vita 🎯`,
        html: emailHtml
      })
      
      // Aggiorna il lead per segnare che l'email è stata inviata
      // (in produzione useresti updateDoc)
      console.log('Email inviata a:', email)
      
    } catch (emailError) {
      console.error('Errore invio email:', emailError)
      // Non bloccare - il lead è comunque salvato
    }
    
    return NextResponse.json({ 
      success: true,
      leadId: docRef.id 
    })
    
  } catch (error) {
    console.error('Errore API lead-magnet:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
