import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp as AdminTimestamp } from 'firebase-admin/firestore'
import { LifeAreaId } from '@/types'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const CRON_SECRET = process.env.CRON_SECRET || 'coachami-cron-2026'

// =====================
// CONFIGURAZIONE NURTURING
// =====================

const NURTURING_SCHEDULE = [
  { 
    day: 3, 
    type: 'reminder_1',
    subject: '💫 I tuoi coach ti aspettano, {{name}}!',
    preheader: 'Hai fatto il primo passo, ora fai il secondo'
  },
  { 
    day: 7, 
    type: 'reminder_2',
    subject: '🎯 Non hai ancora scelto? Ti aiutiamo noi!',
    preheader: 'Ecco il coach più compatibile con te'
  },
  { 
    day: 10, 
    type: 'auto_assign',
    subject: '✨ Ti abbiamo trovato il coach perfetto!',
    preheader: 'Abbiamo selezionato un coach specializzato per te'
  }
]

const AREA_LABELS: Record<string, string> = {
  salute: 'Salute e Vitalità',
  finanze: 'Finanze',
  carriera: 'Carriera e Lavoro',
  relazioni: 'Relazioni e Amicizie',
  amore: 'Amore',
  crescita: 'Crescita Personale',
  spiritualita: 'Spiritualità',
  sport: 'Sport & Performance'
}

// =====================
// EMAIL TEMPLATES
// =====================

function generateReminder1Email(lead: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f5f0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #D4A574 0%, #C4956A 100%); border-radius: 20px 20px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">CoachaMi</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0;">Ciao ${lead.name}! 👋</h2>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Qualche giorno fa hai completato il tuo test della Ruota della Vita e hai scoperto 
        che la tua area prioritaria è <strong>${AREA_LABELS[lead.priorityArea]}</strong>.
      </p>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Hai fatto il primo passo importante: riconoscere dove vuoi migliorare. 
        Ora è il momento di fare il secondo passo! 🚀
      </p>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          <strong>💡 Lo sapevi?</strong><br>
          I nostri coach specializzati in ${AREA_LABELS[lead.priorityArea]} hanno aiutato 
          centinaia di persone come te a trasformare quest'area della loro vita.
        </p>
      </div>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 25px 0;">
        Puoi <strong>chattare direttamente</strong> con il tuo coach per conoscervi. 
        È l'occasione perfetta per capire se c'è sintonia.
      </p>
      
      <div style="text-align: center;">
        <a href="https://www.coachami.it/coaches?area=${lead.priorityArea}&scores=${encodeURIComponent(JSON.stringify(lead.scores))}" 
           style="display: inline-block; background: #D4A574; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
          Scegli il tuo Coach →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Ricevi questa email perché hai completato il test su CoachaMi.<br>
        <a href="https://www.coachami.it" style="color: #D4A574;">www.coachami.it</a>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

function generateReminder2Email(lead: any, topCoach: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f5f0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #D4A574 0%, #C4956A 100%); border-radius: 20px 20px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">CoachaMi</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0;">${lead.name}, hai bisogno di una mano? 🤝</h2>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Abbiamo notato che non hai ancora contattato un coach. 
        Sappiamo che scegliere può essere difficile, quindi ti aiutiamo noi!
      </p>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Basandoci sul tuo profilo, ecco il coach che riteniamo più compatibile con te:
      </p>
      
      <!-- Coach Card -->
      <div style="background: #f8f5f0; padding: 20px; border-radius: 16px; margin: 20px 0;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${topCoach.photo 
            ? `<img src="${topCoach.photo}" alt="${topCoach.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">`
            : `<div style="width: 80px; height: 80px; border-radius: 50%; background: #D4A574; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold;">${topCoach.name.charAt(0)}</div>`
          }
          <div>
            <h3 style="color: #1f2937; margin: 0 0 5px 0; font-size: 18px;">${topCoach.name}</h3>
            <p style="color: #D4A574; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">
              Specializzato in ${AREA_LABELS[lead.priorityArea]}
            </p>
            ${topCoach.rating ? `
              <p style="color: #f59e0b; margin: 0; font-size: 14px;">
                ⭐ ${topCoach.rating.toFixed(1)} (${topCoach.reviewCount || 0} recensioni)
              </p>
            ` : ''}
          </div>
        </div>
        ${topCoach.bio ? `
          <p style="color: #6b7280; font-size: 13px; margin: 15px 0 0 0; line-height: 1.5;">
            "${topCoach.bio.substring(0, 150)}${topCoach.bio.length > 150 ? '...' : ''}"
          </p>
        ` : ''}
      </div>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 25px 0;">
        Se non ti scegli un coach entro i prossimi 3 giorni, ti abbineremo automaticamente 
        a ${topCoach.name} per facilitarti il processo. Potrai sempre cambiare idea!
      </p>
      
      <div style="text-align: center;">
        <a href="https://www.coachami.it/booking/${topCoach.id}?lead=${lead.id}" 
           style="display: inline-block; background: #D4A574; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
          Prenota con ${topCoach.name} →
        </a>
        <p style="margin: 15px 0 0 0;">
          <a href="https://www.coachami.it/coaches?area=${lead.priorityArea}" style="color: #D4A574; font-size: 14px;">
            Oppure scegli un altro coach
          </a>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="https://www.coachami.it" style="color: #D4A574;">www.coachami.it</a>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

function generateAutoAssignEmail(lead: any, coach: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f5f0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 20px 20px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Ti abbiamo abbinato!</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0;">Ciao ${lead.name}!</h2>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Per aiutarti a iniziare il tuo percorso di crescita, ti abbiamo abbinato al coach 
        che riteniamo più adatto al tuo profilo:
      </p>
      
      <!-- Coach Card -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 16px; margin: 20px 0; border: 2px solid #86efac;">
        <div style="text-align: center;">
          ${coach.photo 
            ? `<img src="${coach.photo}" alt="${coach.name}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">`
            : `<div style="width: 100px; height: 100px; border-radius: 50%; background: #10B981; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; margin: 0 auto; border: 4px solid white;">${coach.name.charAt(0)}</div>`
          }
          <h3 style="color: #1f2937; margin: 15px 0 5px 0; font-size: 22px;">${coach.name}</h3>
          <p style="color: #10B981; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">
            ✓ Il tuo coach per ${AREA_LABELS[lead.priorityArea]}
          </p>
          ${coach.rating ? `
            <p style="color: #f59e0b; margin: 0; font-size: 14px;">
              ⭐ ${coach.rating.toFixed(1)} (${coach.reviewCount || 0} recensioni)
            </p>
          ` : ''}
        </div>
      </div>
      
      <div style="background: #fffbeb; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          <strong>🎁 Il prossimo passo</strong><br>
          ${coach.name} ti contatterà presto via chat per conoscervi meglio. 
          Oppure puoi prendere l'iniziativa tu!
        </p>
      </div>
      
      <div style="text-align: center;">
        <a href="https://www.coachami.it/booking/${coach.id}?lead=${lead.id}" 
           style="display: inline-block; background: #10B981; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
          Prenota la tua Call Gratuita →
        </a>
      </div>
      
      <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
        Non ti piace l'abbinamento? Nessun problema!<br>
        <a href="https://www.coachami.it/coaches?area=${lead.priorityArea}" style="color: #D4A574;">
          Scegli un altro coach qui
        </a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="https://www.coachami.it" style="color: #D4A574;">www.coachami.it</a>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

function generateCoachNotificationEmail(coach: any, lead: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f5f0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #D4A574 0%, #C4956A 100%); border-radius: 20px 20px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Nuovo Lead Assegnato!</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0;">Ciao ${coach.name}!</h2>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Ti abbiamo assegnato un nuovo lead che cerca aiuto nell'area <strong>${AREA_LABELS[lead.priorityArea]}</strong>.
      </p>
      
      <!-- Lead Card -->
      <div style="background: #f8f5f0; padding: 20px; border-radius: 16px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin: 0 0 10px 0;">${lead.name}</h3>
        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">🎯 Priorità: ${AREA_LABELS[lead.priorityArea]}</p>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">📊 Life Score: ${lead.lifeScore}/10</p>
      </div>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          <strong>⚠️ Importante</strong><br>
          Contatta ${lead.name} entro 7 giorni, altrimenti il lead verrà riassegnato automaticamente ad un altro coach.
        </p>
      </div>
      
      <div style="text-align: center;">
        <a href="https://www.coachami.it/coach/dashboard" 
           style="display: inline-block; background: #D4A574; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
          Vai alla Dashboard →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="https://www.coachami.it" style="color: #D4A574;">www.coachami.it</a>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

// Email per coach che perde il lead
function generateCoachLostLeadEmail(coach: any, lead: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f5f0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-radius: 20px 20px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Lead Riassegnato</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0;">Ciao ${coach.name},</h2>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Il lead <strong>${lead.name}</strong> che ti era stato assegnato è stato riassegnato 
        ad un altro coach perché non è stato contattato entro 7 giorni.
      </p>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #EF4444;">
        <p style="color: #991b1b; margin: 0; font-size: 14px;">
          <strong>💡 Ricorda</strong><br>
          I lead devono essere contattati entro 7 giorni dall'assegnazione per garantire 
          un servizio di qualità ai nostri coachee.
        </p>
      </div>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Per evitare che questo succeda in futuro, controlla regolarmente la tua dashboard 
        per vedere i nuovi lead assegnati.
      </p>
      
      <div style="text-align: center;">
        <a href="https://www.coachami.it/coach/dashboard" 
           style="display: inline-block; background: #6b7280; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
          Vai alla Dashboard →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="https://www.coachami.it" style="color: #D4A574;">www.coachami.it</a>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

// Email al lead quando viene riassegnato
function generateLeadReassignedEmail(lead: any, newCoach: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f5f0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 20px 20px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🔄 Nuovo Coach per Te!</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0;">Ciao ${lead.name}!</h2>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Per offrirti un servizio migliore, ti abbiamo assegnato un nuovo coach 
        specializzato in <strong>${AREA_LABELS[lead.priorityArea]}</strong>:
      </p>
      
      <!-- New Coach Card -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 16px; margin: 20px 0; border: 2px solid #86efac;">
        <div style="text-align: center;">
          ${newCoach.photo 
            ? `<img src="${newCoach.photo}" alt="${newCoach.name}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">`
            : `<div style="width: 100px; height: 100px; border-radius: 50%; background: #10B981; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; margin: 0 auto; border: 4px solid white;">${newCoach.name.charAt(0)}</div>`
          }
          <h3 style="color: #1f2937; margin: 15px 0 5px 0; font-size: 22px;">${newCoach.name}</h3>
          <p style="color: #10B981; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">
            ✓ Il tuo nuovo coach
          </p>
        </div>
      </div>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        ${newCoach.name} ti contatterà presto via chat per conoscervi meglio.
      </p>
      
      <div style="text-align: center;">
        <a href="https://www.coachami.it/booking/${newCoach.id}?lead=${lead.id}" 
           style="display: inline-block; background: #10B981; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
          Prenota la Call Gratuita →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="https://www.coachami.it" style="color: #D4A574;">www.coachami.it</a>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

// =====================
// HELPER FUNCTIONS
// =====================

async function findBestCoachForLead(lead: any, excludeCoachId?: string): Promise<any | null> {
  try {
    const snapshot = await adminDb.collection('coachApplications')
      .where('status', '==', 'approved')
      .get()
    
    if (snapshot.empty) return null

    const allApprovedRaw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Filtra coach sospesi controllando users.isSuspended
    const suspendedSet = new Set<string>()
    for (const coach of allApprovedRaw) {
      try {
        const userDoc = await adminDb.collection('users').doc(coach.id).get()
        if (userDoc.exists && userDoc.data()?.isSuspended === true) {
          suspendedSet.add(coach.id)
        }
      } catch { /* ignora errori singoli */ }
    }
    const allApproved = allApprovedRaw.filter((c: any) => !suspendedSet.has(c.id))

    // Includi solo active e free — tutto il resto (expired, inactive, trial, trialing, undefined) = escluso
    const ALLOWED_STATUSES = new Set(['active', 'free'])
    const activeCoaches = allApproved.filter((coach: any) => {
      const s = coach.subscriptionStatus
      return s && ALLOWED_STATUSES.has(s)
    })

    // Coach qualificati per l'area prioritaria del lead (escluso eventuale coach precedente)
    let qualifiedCoaches = activeCoaches.filter((coach: any) => {
      if (excludeCoachId && coach.id === excludeCoachId) return false
      const areas = coach.lifeAreas || (coach.lifeArea ? [coach.lifeArea] : [])
      return areas.includes(lead.priorityArea)
    })

    // Fallback: tutti i coach attivi se nessuno copre l'area
    if (qualifiedCoaches.length === 0) {
      qualifiedCoaches = activeCoaches.filter((coach: any) =>
        !excludeCoachId || coach.id !== excludeCoachId
      )
    }

    if (qualifiedCoaches.length === 0) return null

    // Conta i lead assegnati (attivi) per ogni coach — su TUTTE le aree
    const leadsSnap = await adminDb.collection('leads')
      .where('status', 'in', ['assigned', 'booked', 'converted'])
      .get()

    const activeLeadsPerCoach: Record<string, number> = {}  // lead attivi (assigned/booked)
    const totalLeadsPerCoach: Record<string, number> = {}   // storico totale (per meritocratica)
    leadsSnap.docs.forEach((d: any) => {
      const data = d.data()
      if (!data.assignedCoachId) return
      // Lead attivi (assigned o booked) — usati per il limite max 1
      if (data.status === 'assigned' || data.status === 'booked') {
        activeLeadsPerCoach[data.assignedCoachId] = (activeLeadsPerCoach[data.assignedCoachId] || 0) + 1
      }
      // Totale storico per area — usato per l'ordinamento equo
      if (data.priorityArea === lead.priorityArea) {
        totalLeadsPerCoach[data.assignedCoachId] = (totalLeadsPerCoach[data.assignedCoachId] || 0) + 1
      }
    })

    // Leggi i punti community per ogni coach (per ordinamento meritocratico)
    const coachIds = qualifiedCoaches.map((c: any) => c.id)
    const pointsPerCoach: Record<string, number> = {}
    for (const coachId of coachIds) {
      try {
        const pointsDoc = await adminDb.collection('coachPoints').doc(coachId).get()
        pointsPerCoach[coachId] = pointsDoc.exists ? (pointsDoc.data()?.totalPoints || 0) : 0
      } catch {
        pointsPerCoach[coachId] = 0
      }
    }

    // Regola MAX 1 LEAD ATTIVO per coach:
    // Prima prova con i coach che non hanno lead attivi
    // Se tutti ne hanno già uno, apri a tutti (ciclo completo)
    const coachesWithoutActiveLead = qualifiedCoaches.filter((c: any) =>
      (activeLeadsPerCoach[c.id] || 0) === 0
    )
    const candidateCoaches = coachesWithoutActiveLead.length > 0
      ? coachesWithoutActiveLead
      : qualifiedCoaches  // tutti hanno già 1 lead → giro completo, passa al prossimo

    // Ordina meritocraticamente:
    // 1) più punti community → va prima
    // 2) parità punti → meno lead storici ricevuti per quest'area
    // 3) parità assoluta → ID alfabetico
    candidateCoaches.sort((a: any, b: any) => {
      const aPoints = pointsPerCoach[a.id] || 0
      const bPoints = pointsPerCoach[b.id] || 0
      if (aPoints !== bPoints) return bPoints - aPoints
      const aLeads = totalLeadsPerCoach[a.id] || 0
      const bLeads = totalLeadsPerCoach[b.id] || 0
      if (aLeads !== bLeads) return aLeads - bLeads
      return a.id.localeCompare(b.id)
    })

    const selectedCoach = candidateCoaches[0] as any
    console.log(`🔄 Lead balancing [${lead.priorityArea}]: ${selectedCoach.name} | attivi: ${activeLeadsPerCoach[selectedCoach.id] || 0} | storici: ${totalLeadsPerCoach[selectedCoach.id] || 0} | pt: ${pointsPerCoach[selectedCoach.id] || 0}`)
    return selectedCoach

  } catch (err) {
    console.error('Errore ricerca coach:', err)
    return null
  }
}

async function getCoachById(coachId: string): Promise<any | null> {
  try {
    const coachDoc = await adminDb.collection('coachApplications').doc(coachId).get()
    if (!coachDoc.exists) return null
    return { id: coachDoc.id, ...coachDoc.data() }
  } catch (err) {
    return null
  }
}

function daysSince(timestamp: any): number {
  if (!timestamp) return 999
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

// =====================
// SYNC ROUND-ROBIN
// =====================

async function syncRoundRobinCursors(): Promise<void> {
  const leadsSnap = await adminDb.collection('leads')
    .where('status', 'in', ['assigned', 'booked', 'converted'])
    .get()

  const coachesSnap = await adminDb.collection('coachApplications')
    .where('status', '==', 'approved')
    .get()

  const allCoaches = coachesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

  // Per ogni area, traccia l'ultimo coach assegnato in ordine cronologico
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

  await adminDb.collection('settings').doc('roundRobin').set(cursors, { merge: true })
}

// =====================
// MAIN HANDLER
// =====================

export async function GET(request: NextRequest) {
  // Verifica autorizzazione - supporta Vercel Cron e chiamate manuali
  const authHeader = request.headers.get('authorization')
  const vercelCronSecret = request.headers.get('x-vercel-cron-auth-token')
  const isVercelCron = vercelCronSecret === process.env.CRON_SECRET
  const isManualCall = authHeader === `Bearer ${CRON_SECRET}`
  
  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  console.log('🔔 Starting lead nurturing cron job')

  // Auto-sync cursori round-robin all'inizio di ogni run
  try {
    await syncRoundRobinCursors()
    console.log('✅ Round-robin cursori sincronizzati')
  } catch (syncErr) {
    console.error('⚠️ Errore sync round-robin (non bloccante):', syncErr)
  }

  // Auto-scadenza trial: se subscriptionEndDate è passata, imposta expired
  try {
    const now = new Date()
    const trialSnap = await adminDb.collection('coachApplications')
      .where('status', '==', 'approved')
      .where('subscriptionStatus', 'in', ['trial', 'trialing'])
      .get()

    for (const doc of trialSnap.docs) {
      const data = doc.data()
      const endDate = data.subscriptionEndDate?.toDate?.()
      if (endDate && endDate < now) {
        await adminDb.collection('coachApplications').doc(doc.id).update({
          subscriptionStatus: 'expired',
          updatedAt: new Date()
        })
        console.log(`⏰ Trial scaduto: ${data.name} (${data.email})`)
      }
    }
  } catch (trialErr) {
    console.error('⚠️ Errore controllo scadenza trial (non bloccante):', trialErr)
  }
  
  try {
    // Carica tutti i lead non ancora convertiti
    const leadsSnapshot = await adminDb.collection('leads')
      .where('status', 'in', ['new', 'reminded', 'assigned'])
      .get()
    
    const results = {
      processed: 0,
      reminder1Sent: 0,
      reminder2Sent: 0,
      autoAssigned: 0,
      reassigned: 0,
      errors: 0,
      details: [] as string[]
    }
    
    for (const leadDoc of leadsSnapshot.docs) {
      const lead = { id: leadDoc.id, ...leadDoc.data() } as any
      const daysOld = daysSince(lead.createdAt)
      const daysSinceAssigned = daysSince(lead.assignedAt)
      
      try {
        // RIASSEGNAZIONE: Se assegnato da più di 7 giorni e non ancora prenotato
        if (lead.status === 'assigned' && daysSinceAssigned >= 7) {
          const oldCoachId = lead.assignedCoachId
          const oldCoach = oldCoachId ? await getCoachById(oldCoachId) : null
          const newCoach = await findBestCoachForLead(lead, oldCoachId)
          
          if (newCoach && newCoach.id !== oldCoachId) {
            // Email al vecchio coach
            if (resend && oldCoach?.email) {
              await resend.emails.send({
                from: 'CoachaMi <noreply@coachami.it>',
                to: oldCoach.email,
                subject: `⚠️ Lead riassegnato: ${lead.name}`,
                html: generateCoachLostLeadEmail(oldCoach, lead)
              })
            }
            
            // Email al nuovo coach
            if (resend && newCoach.email) {
              await resend.emails.send({
                from: 'CoachaMi <noreply@coachami.it>',
                to: newCoach.email,
                subject: `🎉 Nuovo lead assegnato: ${lead.name}`,
                html: generateCoachNotificationEmail(newCoach, lead)
              })
            }
            
            // Email al lead
            if (resend) {
              await resend.emails.send({
                from: 'CoachaMi <noreply@coachami.it>',
                to: lead.email,
                subject: `🔄 Ti abbiamo trovato un nuovo coach!`,
                html: generateLeadReassignedEmail(lead, newCoach)
              })
            }
            
            // Aggiorna lead
            await adminDb.collection('leads').doc(lead.id).update({
              previousCoachId: oldCoachId,
              assignedCoachId: newCoach.id,
              assignedAt: AdminTimestamp.now(),
              reassignedAt: AdminTimestamp.now(),
              reassignCount: (lead.reassignCount || 0) + 1,
              updatedAt: AdminTimestamp.now()
            })
            
            results.reassigned++
            results.details.push(`🔄 Reassigned ${lead.name} from ${oldCoach?.name || 'unknown'} to ${newCoach.name}`)
          }
          
          results.processed++
          continue
        }
        
        // Giorno 3: Primo reminder (solo per lead non assegnati)
        if (lead.status === 'new' && daysOld >= 3 && lead.reminderCount === 0) {
          if (resend) {
            await resend.emails.send({
              from: 'CoachaMi <noreply@coachami.it>',
              to: lead.email,
              subject: NURTURING_SCHEDULE[0].subject.replace('{{name}}', lead.name),
              html: generateReminder1Email(lead)
            })
          }
          
          await adminDb.collection('leads').doc(lead.id).update({
            status: 'reminded',
            reminderCount: 1,
            lastReminderAt: AdminTimestamp.now(),
            updatedAt: AdminTimestamp.now()
          })
          
          results.reminder1Sent++
          results.details.push(`📧 Reminder 1 sent to ${lead.name}`)
        }
        
        // Giorno 7: Secondo reminder con proposta coach (solo per reminded)
        else if (lead.status === 'reminded' && daysOld >= 7 && lead.reminderCount === 1) {
          const topCoach = await findBestCoachForLead(lead)
          
          if (topCoach && resend) {
            await resend.emails.send({
              from: 'CoachaMi <noreply@coachami.it>',
              to: lead.email,
              subject: NURTURING_SCHEDULE[1].subject,
              html: generateReminder2Email(lead, topCoach)
            })
          }
          
          await adminDb.collection('leads').doc(lead.id).update({
            status: 'reminded',
            reminderCount: 2,
            suggestedCoachId: topCoach?.id || null,
            lastReminderAt: AdminTimestamp.now(),
            updatedAt: AdminTimestamp.now()
          })
          
          results.reminder2Sent++
          results.details.push(`📧 Reminder 2 sent to ${lead.name} (suggested: ${topCoach?.name || 'none'})`)
        }
        
        // Giorno 10: Assegnazione automatica (solo per reminded)
        else if (lead.status === 'reminded' && daysOld >= 10 && lead.reminderCount === 2) {
          const assignedCoach = await findBestCoachForLead(lead)
          
          if (assignedCoach) {
            // Email al lead
            if (resend) {
              await resend.emails.send({
                from: 'CoachaMi <noreply@coachami.it>',
                to: lead.email,
                subject: NURTURING_SCHEDULE[2].subject,
                html: generateAutoAssignEmail(lead, assignedCoach)
              })
              
              // Email al coach
              if (assignedCoach.email) {
                await resend.emails.send({
                  from: 'CoachaMi <noreply@coachami.it>',
                  to: assignedCoach.email,
                  subject: `🎉 Nuovo lead assegnato: ${lead.name}`,
                  html: generateCoachNotificationEmail(assignedCoach, lead)
                })
              }
            }
            
            await adminDb.collection('leads').doc(lead.id).update({
              status: 'assigned',
              assignedCoachId: assignedCoach.id,
              assignedAt: AdminTimestamp.now(),
              updatedAt: AdminTimestamp.now()
            })
            
            results.autoAssigned++
            results.details.push(`✨ Auto-assigned ${lead.name} to ${assignedCoach.name}`)
          }
        }
        
        results.processed++
        
      } catch (err: any) {
        console.error(`Error processing lead ${lead.id}:`, err)
        results.errors++
        results.details.push(`❌ Error for ${lead.name}: ${err.message}`)
      }
    }
    
    console.log('✅ Lead nurturing completed:', results)
    
    return NextResponse.json({
      success: true,
      ...results
    })
    
  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
