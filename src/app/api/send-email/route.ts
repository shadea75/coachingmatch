import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('📧 API send-email chiamata')
  
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY non configurata')
      return NextResponse.json({ success: false, message: 'API key mancante' })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const body = await request.json()
    const { type, data } = body
    
    console.log('📨 Tipo email:', type)

    // Helper per footer comune
    const footer = `
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 30px 0; color: #666; font-size: 14px;">
            <p style="margin: 0;">© 2026 CoachaMi - Tutti i diritti riservati</p>
          </td>
        </tr>
      </table>
    `

    // Helper per header logo
    const logoHeader = `
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 30px 0;">
            <span style="font-size: 28px; font-weight: bold; color: #333;">Coacha</span><span style="font-size: 28px; font-weight: bold; color: #EC7711; font-style: italic;">Mi</span>
          </td>
        </tr>
      </table>
    `

    // =====================================================
    // EMAIL REGISTRAZIONE COACH
    // =====================================================
    if (type === 'coach_registration') {
      const coachEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: data.email,
        subject: '✅ Registrazione ricevuta - CoachaMi',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr><td>${logoHeader}
                <table width="100%" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                  <tr><td style="padding: 30px;">
                    <h2 style="margin: 0 0 20px 0;">Ciao ${data.name}! 👋</h2>
                    <p>Grazie per esserti registrato come coach su CoachaMi!</p>
                    <p>Abbiamo ricevuto la tua candidatura e il nostro team la esaminerà con attenzione.</p>
                    <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                      <h3>📋 Prossimi passi:</h3>
                      <p>1. Revisione candidatura (entro 48h)</p>
                      <p>2. Verifica documenti</p>
                      <p>3. Attivazione profilo</p>
                    </div>
                    <center><a href="https://www.coachami.it" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">Visita CoachaMi</a></center>
                  </td></tr>
                </table>
                ${footer}
              </td></tr>
            </table>
          </body></html>`
      })
      
      const adminEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: 'debora.carofiglio@gmail.com',
        subject: '🆕 Nuova registrazione coach - ' + data.name,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; padding: 20px;">
            <h2>🆕 Nuova Registrazione Coach</h2>
            <p><strong>Nome:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Aree:</strong> ${data.lifeAreas?.join(', ') || 'N/A'}</p>
            <p><strong>Esperienza:</strong> ${data.yearsOfExperience || 'N/A'} anni</p>
            <a href="https://www.coachami.it/admin/coaches" style="display: inline-block; background: #EC7711; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Vai alla Dashboard</a>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, coachEmail: coachEmailResult, adminEmail: adminEmailResult })
    }
    
    // =====================================================
    // EMAIL PRENOTAZIONE IN ATTESA
    // =====================================================
    if (type === 'booking_pending') {
      const { coachName, coachEmail, coacheeName, coacheeEmail, date, time, duration } = data
      
      const coacheeEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `⏳ Richiesta inviata a ${coachName} - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: white; border-radius: 12px; padding: 30px;">
                <div style="text-align: center; margin-bottom: 20px;"><span style="font-size: 40px;">⏳</span></div>
                <h2 style="text-align: center;">Richiesta inviata!</h2>
                <p>Ciao ${coacheeName}! La tua richiesta di call con <strong>${coachName}</strong> è stata inviata.</p>
                <div style="background: #FFF7ED; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>📅 Data:</strong> ${date}</p>
                  <p><strong>🕐 Ora:</strong> ${time}</p>
                  <p><strong>⏱️ Durata:</strong> ${duration} minuti</p>
                </div>
                <div style="background: #fef3c7; border-radius: 8px; padding: 15px;">
                  <p style="margin: 0; color: #92400e;"><strong>⏳ In attesa di conferma</strong><br>Il coach confermerà a breve.</p>
                </div>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      const coachEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `📥 Nuova richiesta da ${coacheeName} - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: white; border-radius: 12px; padding: 30px;">
                <h2>📥 Nuova richiesta di call!</h2>
                <p>Ciao ${coachName}! Hai ricevuto una richiesta da <strong>${coacheeName}</strong>.</p>
                <div style="background: #FFF7ED; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>📅 Data:</strong> ${date}</p>
                  <p><strong>🕐 Ora:</strong> ${time}</p>
                  <p><strong>⏱️ Durata:</strong> ${duration} minuti</p>
                </div>
                <center><a href="https://www.coachami.it/coach/sessions" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none;">Gestisci Richieste</a></center>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, coacheeEmail: coacheeEmailResult, coachEmail: coachEmailResult })
    }
    
    // =====================================================
    // EMAIL CONFERMA PRENOTAZIONE
    // =====================================================
    if (type === 'booking_confirmation' || type === 'session_confirmed') {
      const { coachName, coachEmail, coacheeName, coacheeEmail, date, time, duration, sessionDate } = data
      
      let googleCalendarUrl = ''
      if (sessionDate) {
        const startDate = new Date(sessionDate)
        const endDate = new Date(startDate.getTime() + (duration || 30) * 60000)
        const formatForGoogle = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Call coaching - ${coachName}`)}&dates=${formatForGoogle(startDate)}/${formatForGoogle(endDate)}&details=${encodeURIComponent('Sessione su CoachaMi')}&location=Videochiamata`
      }
      
      const calendarButton = googleCalendarUrl ? `<div style="text-align: center; margin: 20px 0;"><a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background: #4285F4; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">📅 Aggiungi a Google Calendar</a></div>` : ''
      
      const coacheeEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `✅ Prenotazione confermata con ${coachName} - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: white; border-radius: 12px; padding: 30px;">
                <div style="text-align: center; margin-bottom: 20px;"><span style="font-size: 40px;">✅</span></div>
                <h2 style="text-align: center;">Prenotazione confermata!</h2>
                <p>Ciao ${coacheeName}! La tua call con <strong>${coachName}</strong> è confermata.</p>
                <div style="background: #FFF7ED; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>📅 Data:</strong> ${date}</p>
                  <p><strong>🕐 Ora:</strong> ${time}</p>
                  <p><strong>⏱️ Durata:</strong> ${duration} minuti</p>
                </div>
                ${calendarButton}
                <div style="background: #d4edda; border-radius: 8px; padding: 15px;">
                  <p style="margin: 0; color: #155724;"><strong>✓</strong> Il coach ti invierà il link alla videochiamata.</p>
                </div>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      const coachEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `📅 Sessione confermata con ${coacheeName} - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: white; border-radius: 12px; padding: 30px;">
                <h2>📅 Sessione confermata!</h2>
                <p>Ciao ${coachName}! Sessione con <strong>${coacheeName}</strong> confermata.</p>
                <div style="background: #FFF7ED; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>👤 Coachee:</strong> ${coacheeName}</p>
                  <p><strong>📧 Email:</strong> ${coacheeEmail}</p>
                  <p><strong>📅 Data:</strong> ${date}</p>
                  <p><strong>🕐 Ora:</strong> ${time}</p>
                </div>
                ${calendarButton}
                <div style="background: #fff3cd; border-radius: 8px; padding: 15px;">
                  <p style="margin: 0; color: #856404;"><strong>⚠️</strong> Ricorda di inviare il link videochiamata!</p>
                </div>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, coacheeEmail: coacheeEmailResult, coachEmail: coachEmailResult })
    }
    
    // =====================================================
    // EMAIL RICHIESTA OFFERTA
    // =====================================================
    if (type === 'offer_request') {
      const { coachName, coachEmail, coacheeName, coacheeEmail, objectives, budget, notes } = data
      
      const coachEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `💼 Nuova richiesta offerta da ${coacheeName} - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: white; border-radius: 12px; padding: 30px;">
                <h2>💼 Richiesta offerta!</h2>
                <p>Ciao ${coachName}! <strong>${coacheeName}</strong> vuole iniziare un percorso con te.</p>
                <div style="background: #FFF7ED; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>👤 Coachee:</strong> ${coacheeName}</p>
                  <p><strong>📧 Email:</strong> ${coacheeEmail}</p>
                  <p><strong>🎯 Obiettivi:</strong> ${objectives}</p>
                  ${budget ? `<p><strong>💰 Budget:</strong> ${budget === 'da_definire' ? 'Da definire' : '€' + budget}</p>` : ''}
                  ${notes ? `<p><strong>📝 Note:</strong> ${notes}</p>` : ''}
                </div>
                <center><a href="https://www.coachami.it/coach/offers" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none;">Crea offerta</a></center>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, coachEmail: coachEmailResult })
    }
    
    // =====================================================
    // EMAIL SESSIONE ANNULLATA
    // =====================================================
    if (type === 'session_cancelled_by_coach') {
      const { coachName, coacheeName, coacheeEmail, date, time, reason } = data
      const reasonText = reason === 'rejected' ? 'non ha potuto accettare' : 'ha annullato'
      
      const coacheeEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `❌ Sessione annullata - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: white; border-radius: 12px; padding: 30px;">
                <div style="text-align: center; margin-bottom: 20px;"><span style="font-size: 40px;">❌</span></div>
                <h2 style="text-align: center;">Sessione annullata</h2>
                <p>Ciao ${coacheeName}, purtroppo <strong>${coachName}</strong> ${reasonText} la sessione.</p>
                <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>📅 Data prevista:</strong> ${date}</p>
                  <p><strong>🕐 Ora prevista:</strong> ${time}</p>
                </div>
                <center><a href="https://www.coachami.it/matching" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none;">Trova un altro coach</a></center>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, coacheeEmail: coacheeEmailResult })
    }
    
    // =====================================================
    // EMAIL SESSIONE RIMANDATA
    // =====================================================
    if (type === 'session_rescheduled_by_coach') {
      const { coachName, coacheeName, coacheeEmail, date, time, coachId } = data
      
      const coacheeEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `🔄 Sessione da riprogrammare - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: white; border-radius: 12px; padding: 30px;">
                <div style="text-align: center; margin-bottom: 20px;"><span style="font-size: 40px;">🔄</span></div>
                <h2 style="text-align: center;">Sessione da riprogrammare</h2>
                <p>Ciao ${coacheeName}, <strong>${coachName}</strong> ha chiesto di spostare la sessione.</p>
                <div style="background: #fff7ed; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>📅 Data originale:</strong> ${date}</p>
                  <p><strong>🕐 Ora originale:</strong> ${time}</p>
                </div>
                <center><a href="https://www.coachami.it/booking/${coachId}" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none;">Scegli nuova data</a></center>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, coacheeEmail: coacheeEmailResult })
    }

    // =====================================================
    // EMAIL CONFERMA PAGAMENTO
    // =====================================================
    if (type === 'payment-success') {
      // Parametri: amountPaid = pagato dal coachee, coachPayout = guadagno coach (70%)
      const { coachName, coachEmail, coacheeName, coacheeEmail, offerTitle, sessionNumber, amount, amountPaid, coachPayout } = data
      
      // Per retrocompatibilità: se non c'è amountPaid/coachPayout, calcola da amount
      const paidByCoachee = amountPaid || amount || 0
      const coachEarning = coachPayout || (paidByCoachee * 0.70)
      
      const coacheeEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `✅ Pagamento confermato - ${offerTitle} - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: white; border-radius: 12px; padding: 30px;">
                <div style="text-align: center; margin-bottom: 20px;"><span style="font-size: 40px;">✅</span></div>
                <h2 style="text-align: center;">Pagamento confermato!</h2>
                <p>Ciao ${coacheeName}! Il tuo pagamento è andato a buon fine.</p>
                <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>📦 Offerta:</strong> ${offerTitle}</p>
                  <p><strong>🔢 Sessione:</strong> ${sessionNumber}</p>
                  <p><strong>💰 Importo pagato:</strong> €${paidByCoachee.toFixed(2)}</p>
                  <p><strong>👤 Coach:</strong> ${coachName}</p>
                </div>
                <center><a href="https://www.coachami.it/offers" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none;">Prenota sessione</a></center>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      const coachEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `💰 Nuovo pagamento da ${coacheeName} - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: white; border-radius: 12px; padding: 30px;">
                <h2>💰 Nuovo pagamento!</h2>
                <p>Ciao ${coachName}! <strong>${coacheeName}</strong> ha pagato una sessione.</p>
                <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>👤 Coachee:</strong> ${coacheeName}</p>
                  <p><strong>📦 Offerta:</strong> ${offerTitle}</p>
                  <p><strong>🔢 Sessione:</strong> ${sessionNumber}</p>
                  <p><strong>💰 Tuo guadagno (70%):</strong> <span style="color: #059669; font-weight: bold; font-size: 20px;">€${coachEarning.toFixed(2)}</span></p>
                </div>
                <div style="background: #fef3c7; border-radius: 8px; padding: 15px;">
                  <p style="margin: 0; color: #92400e;"><strong>📋</strong> Per ricevere il pagamento dovrai emettere fattura di €${coachEarning.toFixed(2)} a CoachaMi.</p>
                </div>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, coacheeEmail: coacheeEmailResult, coachEmail: coachEmailResult })
    }

    // =====================================================
    // EMAIL NUOVA OFFERTA (Coach → Coachee)
    // =====================================================
    if (type === 'new_offer') {
      const { coacheeEmail, coacheeName, coachName, offerTitle, totalSessions, priceTotal, pricePerSession, validDays, offerId } = data
      
      const result = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `🎁 Nuova offerta da ${coachName} - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: linear-gradient(135deg, #EC7711, #F59E0B); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">🎁 Nuova Offerta!</h1>
              </div>
              <div style="background: white; border-radius: 0 0 12px 12px; padding: 30px;">
                <p>Ciao <strong>${coacheeName}</strong>,</p>
                <p><strong>${coachName}</strong> ti ha inviato un'offerta personalizzata!</p>
                
                <div style="background: #FFF7ED; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #EC7711;">
                  <h3 style="margin: 0 0 15px 0; color: #EC7711;">${offerTitle}</h3>
                  <p style="margin: 5px 0;"><strong>📅 Sessioni:</strong> ${totalSessions}</p>
                  <p style="margin: 5px 0;"><strong>💰 Prezzo totale:</strong> €${priceTotal?.toFixed(2)}</p>
                  <p style="margin: 5px 0;"><strong>💳 Pagamento:</strong> €${pricePerSession?.toFixed(2)} a sessione</p>
                  <p style="margin: 5px 0;"><strong>⏰ Validità:</strong> ${validDays} giorni</p>
                </div>
                
                <div style="background: #FEF3C7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>⏳ Attenzione:</strong> L'offerta scade tra ${validDays} giorni. Non perdertela!
                  </p>
                </div>
                
                <center>
                  <a href="https://www.coachami.it/offers" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">
                    Vedi Offerta
                  </a>
                </center>
                
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Accedendo potrai vedere i dettagli completi e decidere se accettare l'offerta.
                </p>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, result })
    }

    // =====================================================
    // EMAIL REMINDER OFFERTA (24h prima scadenza)
    // =====================================================
    if (type === 'offer_reminder') {
      const { coacheeEmail, coacheeName, coachName, offerTitle, totalSessions, priceTotal, pricePerSession, validUntil, hoursLeft } = data
      
      const result = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `⏰ L'offerta di ${coachName} scade domani! - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: linear-gradient(135deg, #F59E0B, #D97706); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">⏰ Offerta in Scadenza!</h1>
              </div>
              <div style="background: white; border-radius: 0 0 12px 12px; padding: 30px;">
                <p>Ciao <strong>${coacheeName}</strong>,</p>
                <p>Ti ricordiamo che l'offerta di <strong>${coachName}</strong> scade <strong>domani</strong>!</p>
                
                <div style="background: #FFF7ED; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                  <h3 style="margin: 0 0 15px 0; color: #D97706;">${offerTitle}</h3>
                  <p style="margin: 5px 0;"><strong>📅 Sessioni:</strong> ${totalSessions}</p>
                  <p style="margin: 5px 0;"><strong>💰 Prezzo totale:</strong> €${priceTotal?.toFixed(2)}</p>
                  <p style="margin: 5px 0;"><strong>💳 Pagamento:</strong> €${pricePerSession?.toFixed(2)} a sessione</p>
                  <p style="margin: 5px 0;"><strong>⏰ Scade il:</strong> ${validUntil}</p>
                </div>
                
                <div style="background: #FEF2F2; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #991B1B; font-weight: 600;">
                    ⚠️ Hai solo ${hoursLeft} ore per accettare questa offerta!
                  </p>
                </div>
                
                <center>
                  <a href="https://www.coachami.it/offers" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">
                    Accetta Ora
                  </a>
                </center>
                
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Non perdere questa opportunità di iniziare il tuo percorso di coaching!
                </p>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, result })
    }

    // =====================================================
    // EMAIL OFFERTA SCADUTA (al Coachee)
    // =====================================================
    if (type === 'offer_expired_coachee') {
      const { coacheeEmail, coacheeName, coachName, offerTitle } = data
      
      const result = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `😔 L'offerta di ${coachName} è scaduta - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: linear-gradient(135deg, #6B7280, #4B5563); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">😔 Offerta Scaduta</h1>
              </div>
              <div style="background: white; border-radius: 0 0 12px 12px; padding: 30px;">
                <p>Ciao <strong>${coacheeName}</strong>,</p>
                <p>Purtroppo l'offerta "<strong>${offerTitle}</strong>" di <strong>${coachName}</strong> è scaduta.</p>
                
                <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0; color: #4B5563;">
                    Non preoccuparti! Puoi sempre contattare ${coachName} per richiedere una nuova offerta personalizzata.
                  </p>
                </div>
                
                <center>
                  <a href="https://www.coachami.it/coaches" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">
                    Esplora altri Coach
                  </a>
                </center>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, result })
    }

    // =====================================================
    // EMAIL OFFERTA SCADUTA (al Coach)
    // =====================================================
    if (type === 'offer_expired_coach') {
      const { coachEmail, coachName, coacheeName, offerTitle } = data
      
      const result = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `📋 Offerta "${offerTitle}" scaduta - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: linear-gradient(135deg, #6B7280, #4B5563); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">📋 Offerta Scaduta</h1>
              </div>
              <div style="background: white; border-radius: 0 0 12px 12px; padding: 30px;">
                <p>Ciao <strong>${coachName}</strong>,</p>
                <p>L'offerta "<strong>${offerTitle}</strong>" inviata a <strong>${coacheeName}</strong> è scaduta senza essere accettata.</p>
                
                <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0; color: #4B5563;">
                    💡 <strong>Suggerimento:</strong> Potresti contattare ${coacheeName} per capire se ha ancora interesse e inviare una nuova offerta.
                  </p>
                </div>
                
                <center>
                  <a href="https://www.coachami.it/coach/offers" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">
                    Gestisci Offerte
                  </a>
                </center>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, result })
    }

    // =====================================================
    // EMAIL PAYOUT - FATTURA RICEVUTA
    // =====================================================
    if (type === 'payout_invoice_received') {
      const { coachEmail, coachName, offerTitle, sessionNumber, amount, invoiceNumber } = data
      
      const result = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `✅ Fattura ${invoiceNumber} registrata - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: linear-gradient(135deg, #10B981, #059669); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">✅ Fattura Registrata</h1>
              </div>
              <div style="background: white; border-radius: 0 0 12px 12px; padding: 30px;">
                <p>Ciao <strong>${coachName}</strong>,</p>
                <p>Abbiamo registrato la tua fattura. Procederemo alla verifica.</p>
                <div style="background: #f9fafb; border-radius: 8px; border-left: 4px solid #10B981; padding: 20px; margin: 20px 0;">
                  <p><strong>📄 N. Fattura:</strong> ${invoiceNumber}</p>
                  <p><strong>📦 Offerta:</strong> ${offerTitle} - Sessione ${sessionNumber}</p>
                  <p><strong>💰 Importo:</strong> <span style="font-size: 24px; color: #10B981; font-weight: bold;">€${amount?.toFixed(2)}</span></p>
                  <span style="display: inline-block; padding: 6px 12px; background: #DBEAFE; color: #1D4ED8; border-radius: 20px; font-size: 14px;">🔍 In verifica</span>
                </div>
                <p><strong>Prossimi passi:</strong></p>
                <ol>
                  <li>Verificheremo i dati della fattura</li>
                  <li>Ti invieremo conferma approvazione</li>
                  <li>Pagamento il prossimo lunedì</li>
                </ol>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, result })
    }

    // =====================================================
    // EMAIL PAYOUT - FATTURA VERIFICATA
    // =====================================================
    if (type === 'payout_invoice_verified') {
      const { coachEmail, coachName, offerTitle, sessionNumber, amount, invoiceNumber } = data
      
      const today = new Date()
      const daysUntilMonday = (8 - today.getDay()) % 7 || 7
      const nextMonday = new Date(today)
      nextMonday.setDate(today.getDate() + daysUntilMonday)
      const payoutDate = nextMonday.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
      
      const result = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `✅ Fattura approvata - Payout in arrivo! - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">🎉 Fattura Approvata!</h1>
              </div>
              <div style="background: white; border-radius: 0 0 12px 12px; padding: 30px;">
                <p>Ciao <strong>${coachName}</strong>,</p>
                <p>Ottime notizie! La tua fattura è stata approvata.</p>
                <div style="background: #f9fafb; border-radius: 8px; border-left: 4px solid #8B5CF6; padding: 20px; margin: 20px 0;">
                  <p><strong>📄 N. Fattura:</strong> ${invoiceNumber || 'N/A'}</p>
                  <p><strong>📦 Offerta:</strong> ${offerTitle} - Sessione ${sessionNumber}</p>
                  <p><strong>💰 Importo:</strong> <span style="font-size: 28px; color: #10B981; font-weight: bold;">€${amount?.toFixed(2)}</span></p>
                  <span style="display: inline-block; padding: 6px 12px; background: #F3E8FF; color: #7C3AED; border-radius: 20px; font-size: 14px;">✅ Pronto per payout</span>
                </div>
                <div style="background: #ECFDF5; border-radius: 8px; padding: 15px; text-align: center;">
                  <p style="margin: 0;">📅 Bonifico previsto: <strong style="color: #059669; font-size: 18px;">${payoutDate}</strong></p>
                </div>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, result })
    }

    // =====================================================
    // EMAIL PAYOUT - FATTURA RIFIUTATA
    // =====================================================
    if (type === 'payout_invoice_rejected') {
      const { coachEmail, coachName, offerTitle, sessionNumber, amount, invoiceNumber, rejectionReason } = data
      
      const result = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `⚠️ Fattura da correggere - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: linear-gradient(135deg, #F59E0B, #D97706); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">⚠️ Fattura da Correggere</h1>
              </div>
              <div style="background: white; border-radius: 0 0 12px 12px; padding: 30px;">
                <p>Ciao <strong>${coachName}</strong>,</p>
                <p>Abbiamo riscontrato un problema con la fattura. Ti chiediamo di inviarci una fattura corretta.</p>
                <div style="background: #f9fafb; border-radius: 8px; border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0;">
                  <p><strong>📄 N. Fattura:</strong> ${invoiceNumber || 'N/A'}</p>
                  <p><strong>📦 Offerta:</strong> ${offerTitle} - Sessione ${sessionNumber}</p>
                  <p><strong>💰 Importo:</strong> €${amount?.toFixed(2)}</p>
                </div>
                ${rejectionReason ? `
                <div style="background: #FEF3C7; border-radius: 8px; border: 1px solid #F59E0B; padding: 15px; margin-bottom: 20px;">
                  <p style="margin: 0;"><strong>❌ Motivo:</strong> ${rejectionReason}</p>
                </div>
                ` : ''}
                <div style="background: #F3F4F6; border-radius: 8px; padding: 15px; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;"><strong>📋 Dati per fatturazione CoachaMi:</strong></p>
                  <p style="margin: 0;">Debora Carofiglio</p>
                  <p style="margin: 0;">Strada Lungofino 187 Blocco H Modulo 14</p>
                  <p style="margin: 0;">65013 Città Sant'Angelo (PE)</p>
                  <p style="margin: 0;"><strong>P.IVA:</strong> IT02411430685</p>
                  <p style="margin: 0;"><strong>SDI:</strong> 6JXPS2J</p>
                  <p style="margin: 0;"><strong>PEC:</strong> deboracarofiglio@pec-mail.it</p>
                </div>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, result })
    }

    // =====================================================
    // EMAIL PAYOUT - COMPLETATO
    // =====================================================
    if (type === 'payout_payout_completed') {
      const { coachEmail, coachName, offerTitle, sessionNumber, amount, invoiceNumber } = data
      const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      
      const result = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `💰 Pagamento effettuato - €${amount?.toFixed(2)} - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: linear-gradient(135deg, #10B981, #059669); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">💰 Pagamento Effettuato!</h1>
              </div>
              <div style="background: white; border-radius: 0 0 12px 12px; padding: 30px;">
                <p>Ciao <strong>${coachName}</strong>,</p>
                <p>Abbiamo effettuato il bonifico per la tua fattura!</p>
                <div style="background: linear-gradient(135deg, #ECFDF5, #D1FAE5); border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0;">
                  <span style="display: inline-block; padding: 8px 16px; background: #10B981; color: white; border-radius: 20px; font-size: 14px; font-weight: 600;">✅ Pagamento completato</span>
                  <p style="font-size: 42px; font-weight: bold; color: #059669; margin: 15px 0;">€${amount?.toFixed(2)}</p>
                  <p style="color: #6b7280; margin: 0;">Bonifico del ${today}</p>
                </div>
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px;">
                  <p><strong>📄 N. Fattura:</strong> ${invoiceNumber || 'N/A'}</p>
                  <p><strong>📦 Offerta:</strong> ${offerTitle} - Sessione ${sessionNumber}</p>
                </div>
                <p style="margin-top: 20px;">L'importo sarà visibile sul tuo conto entro 1-2 giorni lavorativi.</p>
                <p>Grazie per il tuo lavoro con CoachaMi! 🙏</p>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, result })
    }

    // =====================================================
    // EMAIL PAYOUT - RESET
    // =====================================================
    if (type === 'payout_reset') {
      const { coachEmail, coachName, offerTitle, sessionNumber, amount } = data
      
      const result = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `📝 Richiesta nuova fattura - CoachaMi`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">${logoHeader}
              <div style="background: linear-gradient(135deg, #6366F1, #4F46E5); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">📝 Richiesta Nuova Fattura</h1>
              </div>
              <div style="background: white; border-radius: 0 0 12px 12px; padding: 30px;">
                <p>Ciao <strong>${coachName}</strong>,</p>
                <p>Ti chiediamo di inviarci una nuova fattura per:</p>
                <div style="background: #f9fafb; border-radius: 8px; border-left: 4px solid #6366F1; padding: 20px; margin: 20px 0;">
                  <p><strong>📦 Offerta:</strong> ${offerTitle} - Sessione ${sessionNumber}</p>
                  <p><strong>💰 Importo:</strong> <span style="font-size: 24px; color: #10B981; font-weight: bold;">€${amount?.toFixed(2)}</span></p>
                </div>
                <div style="background: #F3F4F6; border-radius: 8px; padding: 15px; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;"><strong>📋 Dati per fatturazione CoachaMi:</strong></p>
                  <p style="margin: 0;">Debora Carofiglio</p>
                  <p style="margin: 0;">Strada Lungofino 187 Blocco H Modulo 14</p>
                  <p style="margin: 0;">65013 Città Sant'Angelo (PE)</p>
                  <p style="margin: 0;"><strong>P.IVA:</strong> IT02411430685</p>
                  <p style="margin: 0;"><strong>SDI:</strong> 6JXPS2J</p>
                  <p style="margin: 0;"><strong>PEC:</strong> deboracarofiglio@pec-mail.it</p>
                </div>
                <p style="margin-top: 20px;">Rispondi a questa email allegando la fattura o invia tramite SDI.</p>
              </div>
              ${footer}
            </div>
          </body></html>`
      })
      
      return NextResponse.json({ success: true, result })
    }

    // =====================================================
    // EMAIL ALERT TENTATIVO SOSPETTO (per Admin)
    // =====================================================
    if (type === 'suspicious_attempt_alert') {
      const adminEmail = 'debora.carofiglio@gmail.com' // Email admin
      
      const attemptTypeLabels: Record<string, string> = {
        'email_duplicata': '📧 Email già registrata su CoachaMi',
        'telefono_duplicato': '📱 Telefono già registrato su CoachaMi',
        'nome_duplicato': '👤 Nome già registrato su CoachaMi'
      }
      
      const result = await resend.emails.send({
        from: 'CoachaMi Alert <noreply@coachami.it>',
        to: adminEmail,
        subject: `⚠️ ALERT: Tentativo sospetto da ${data.coachName}`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr><td>${logoHeader}
                <table width="100%" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                  <tr><td style="padding: 30px;">
                    <div style="background: #FEE2E2; border: 1px solid #EF4444; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                      <h2 style="margin: 0; color: #DC2626;">⚠️ Tentativo Sospetto Rilevato</h2>
                    </div>
                    
                    <p>Un coach ha tentato di creare un cliente esterno con dati che corrispondono a un utente già registrato su CoachaMi.</p>
                    
                    <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">👤 Coach</h3>
                    <table width="100%" style="margin-bottom: 20px;">
                      <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Nome:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${data.coachName}</td></tr>
                      <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${data.coachEmail}</td></tr>
                      <tr><td style="padding: 8px 0;"><strong>ID:</strong></td><td style="padding: 8px 0;">${data.coachId}</td></tr>
                    </table>
                    
                    <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">🚨 Tipo di Violazione</h3>
                    <p style="background: #FEF3C7; padding: 10px; border-radius: 6px; color: #92400E;">
                      <strong>${attemptTypeLabels[data.attemptType] || data.attemptType}</strong>
                    </p>
                    
                    <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">📝 Dati Inseriti dal Coach</h3>
                    <table width="100%" style="margin-bottom: 20px;">
                      <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Nome:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${data.attemptedName}</td></tr>
                      <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${data.attemptedEmail}</td></tr>
                      <tr><td style="padding: 8px 0;"><strong>Telefono:</strong></td><td style="padding: 8px 0;">${data.attemptedPhone}</td></tr>
                    </table>
                    
                    <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">🔍 Dato Corrispondente</h3>
                    <p style="background: #DBEAFE; padding: 10px; border-radius: 6px; color: #1E40AF;">
                      ${data.matchedData}
                    </p>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">
                      <strong>Data/Ora:</strong> ${data.timestamp}
                    </p>
                    
                    <div style="background: #F3F4F6; border-radius: 8px; padding: 15px; margin-top: 20px;">
                      <p style="margin: 0; font-size: 14px; color: #4B5563;">
                        <strong>💡 Azione consigliata:</strong> Verifica se questo coach sta tentando di evitare le commissioni. 
                        Puoi vedere tutti i tentativi sospetti nella collection <code>suspiciousAttempts</code> di Firebase 
                        o nel profilo del coach alla voce <code>suspiciousAttempts</code>.
                      </p>
                    </div>
                  </td></tr>
                </table>
                ${footer}
              </td></tr>
            </table>
          </body></html>`
      })
      
      console.log('✅ Email alert sospetto inviata:', result)
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json({ error: 'Tipo email non supportato' }, { status: 400 })

  } catch (error: any) {
    console.error('❌ Errore invio email:', error)
    return NextResponse.json({ error: 'Errore invio email', details: error?.message }, { status: 500 })
  }
}
