import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { db } from '@/lib/firebase'
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore'
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
  divertimento: 'Divertimento'
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
        La prima call conoscitiva è <strong>completamente gratuita</strong> e senza impegno. 
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
        Abbiamo notato che non hai ancora prenotato una call con un coach. 
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
          ${coach.name} ti contatterà presto per organizzare la tua prima call gratuita. 
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
        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">📧 ${lead.email}</p>
        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">🎯 Priorità: ${AREA_LABELS[lead.priorityArea]}</p>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">📊 Life Score: ${lead.lifeScore}/10</p>
      </div>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          <strong>💡 Suggerimento</strong><br>
          Contatta ${lead.name} entro 24 ore per massimizzare le possibilità di conversione. 
          Puoi invitarlo/a a prenotare la call gratuita.
        </p>
      </div>
      
      <div style="text-align: center;">
        <a href="https://www.coachami.it/coach/office" 
           style="display: inline-block; background: #D4A574; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
          Vai al tuo Ufficio Virtuale →
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

async function findBestCoachForLead(lead: any): Promise<any | null> {
  try {
    // Cerca coach approvati specializzati nell'area prioritaria
    const coachesQuery = query(
      collection(db, 'coachApplications'),
      where('status', '==', 'approved')
    )
    const snapshot = await getDocs(coachesQuery)
    
    if (snapshot.empty) return null
    
    // Filtra e ordina per area e rating
    const coaches = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((coach: any) => {
        const areas = coach.lifeAreas || (coach.lifeArea ? [coach.lifeArea] : [])
        return areas.includes(lead.priorityArea)
      })
      .sort((a: any, b: any) => {
        // Priorità: rating, poi reviewCount
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (ratingB !== ratingA) return ratingB - ratingA
        return (b.reviewCount || 0) - (a.reviewCount || 0)
      })
    
    // Se nessun coach specializzato, prendi il primo disponibile
    if (coaches.length === 0) {
      const allCoaches = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
      return allCoaches[0] || null
    }
    
    return coaches[0]
  } catch (err) {
    console.error('Errore ricerca coach:', err)
    return null
  }
}

function daysSince(timestamp: any): number {
  if (!timestamp) return 999
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

// =====================
// MAIN HANDLER
// =====================

export async function GET(request: NextRequest) {
  // Verifica autorizzazione
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  console.log('🔔 Starting lead nurturing cron job')
  
  try {
    // Carica tutti i lead non ancora convertiti
    const leadsQuery = query(
      collection(db, 'leads'),
      where('status', 'in', ['new', 'reminded'])
    )
    const leadsSnapshot = await getDocs(leadsQuery)
    
    const results = {
      processed: 0,
      reminder1Sent: 0,
      reminder2Sent: 0,
      autoAssigned: 0,
      errors: 0,
      details: [] as string[]
    }
    
    for (const leadDoc of leadsSnapshot.docs) {
      const lead = { id: leadDoc.id, ...leadDoc.data() } as any
      const daysOld = daysSince(lead.createdAt)
      
      try {
        // Giorno 3: Primo reminder
        if (daysOld >= 3 && lead.reminderCount === 0) {
          if (resend) {
            await resend.emails.send({
              from: 'CoachaMi <noreply@coachami.it>',
              to: lead.email,
              subject: NURTURING_SCHEDULE[0].subject.replace('{{name}}', lead.name),
              html: generateReminder1Email(lead)
            })
          }
          
          await updateDoc(doc(db, 'leads', lead.id), {
            status: 'reminded',
            reminderCount: 1,
            lastReminderAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          })
          
          results.reminder1Sent++
          results.details.push(`📧 Reminder 1 sent to ${lead.name}`)
        }
        
        // Giorno 7: Secondo reminder con proposta coach
        else if (daysOld >= 7 && lead.reminderCount === 1) {
          const topCoach = await findBestCoachForLead(lead)
          
          if (topCoach && resend) {
            await resend.emails.send({
              from: 'CoachaMi <noreply@coachami.it>',
              to: lead.email,
              subject: NURTURING_SCHEDULE[1].subject,
              html: generateReminder2Email(lead, topCoach)
            })
          }
          
          await updateDoc(doc(db, 'leads', lead.id), {
            status: 'reminded',
            reminderCount: 2,
            suggestedCoachId: topCoach?.id || null,
            lastReminderAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          })
          
          results.reminder2Sent++
          results.details.push(`📧 Reminder 2 sent to ${lead.name} (suggested: ${topCoach?.name || 'none'})`)
        }
        
        // Giorno 10: Assegnazione automatica
        else if (daysOld >= 10 && lead.reminderCount === 2) {
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
            
            await updateDoc(doc(db, 'leads', lead.id), {
              status: 'assigned',
              assignedCoachId: assignedCoach.id,
              assignedAt: Timestamp.now(),
              updatedAt: Timestamp.now()
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
