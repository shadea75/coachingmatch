import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

// Email al coach dopo la registrazione
export async function POST(request: NextRequest) {
  console.log('📧 API send-email chiamata')
  
  try {
    // Verifica che l'API key sia presente
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY non configurata')
      return NextResponse.json({ success: false, message: 'API key mancante' })
    }
    
    console.log('✅ RESEND_API_KEY presente')

    const resend = new Resend(process.env.RESEND_API_KEY)
    const body = await request.json()
    const { type, data } = body
    
    console.log('📨 Tipo email:', type)
    console.log('📨 Dati:', JSON.stringify(data))

    if (type === 'coach_registration') {
      // Email al coach
      console.log('📤 Invio email al coach:', data.email)
      
      const coachEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: data.email,
        subject: '✅ Registrazione ricevuta - CoachaMi',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr>
                <td>
                  <!-- Header con Logo -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #333;">Coacha</span><span style="font-size: 28px; font-weight: bold; color: #EC7711; font-style: italic;">Mi</span>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Content -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #333;">Ciao ${data.name}! 👋</h2>
                        <p style="margin: 0 0 15px 0;">Grazie per esserti registrato come coach su <strong style="color: #EC7711;">Coacha</strong><strong style="color: #EC7711; font-style: italic;">Mi</strong>!</p>
                        <p style="margin: 0 0 25px 0;">Abbiamo ricevuto la tua candidatura e il nostro team la esaminerà con attenzione.</p>
                        
                        <!-- Steps Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; border-radius: 8px;">
                          <tr>
                            <td style="padding: 20px;">
                              <h3 style="margin: 0 0 20px 0; color: #333;">📋 Prossimi passi:</h3>
                              
                              <!-- Step 1 -->
                              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                                <tr>
                                  <td width="40" valign="top">
                                    <table cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td style="background: #EC7711; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; font-weight: bold; font-size: 14px; line-height: 28px;">1</td>
                                      </tr>
                                    </table>
                                  </td>
                                  <td valign="top">
                                    <strong style="color: #333;">Revisione candidatura</strong><br>
                                    <span style="color: #666; font-size: 14px;">Esamineremo il tuo profilo entro 48 ore lavorative</span>
                                  </td>
                                </tr>
                              </table>
                              
                              <!-- Step 2 -->
                              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                                <tr>
                                  <td width="40" valign="top">
                                    <table cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td style="background: #EC7711; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; font-weight: bold; font-size: 14px; line-height: 28px;">2</td>
                                      </tr>
                                    </table>
                                  </td>
                                  <td valign="top">
                                    <strong style="color: #333;">Verifica documenti</strong><br>
                                    <span style="color: #666; font-size: 14px;">Controlleremo le tue certificazioni</span>
                                  </td>
                                </tr>
                              </table>
                              
                              <!-- Step 3 -->
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td width="40" valign="top">
                                    <table cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td style="background: #EC7711; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; font-weight: bold; font-size: 14px; line-height: 28px;">3</td>
                                      </tr>
                                    </table>
                                  </td>
                                  <td valign="top">
                                    <strong style="color: #333;">Attivazione profilo</strong><br>
                                    <span style="color: #666; font-size: 14px;">Una volta approvato, sarai visibile ai coachee</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 25px 0;">Ti contatteremo presto con l'esito della tua candidatura.</p>
                        
                        <!-- Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://coachami.vercel.app" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">Visita CoachaMi</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Footer -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0; color: #666; font-size: 14px;">
                        <p style="margin: 0 0 10px 0;">Hai domande? Rispondi a questa email o scrivici a <a href="mailto:coach@coachami.it" style="color: #EC7711;">coach@coachami.it</a></p>
                        <p style="margin: 0;">© 2025 CoachaMi - Tutti i diritti riservati</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      })
      
      console.log('✅ Email coach inviata:', coachEmailResult)

      // Email di notifica all'admin
      console.log('📤 Invio email admin: debora.carofiglio@gmail.com')
      
      const adminEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: 'debora.carofiglio@gmail.com',
        subject: '🆕 Nuova registrazione coach - ' + data.name,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #EC7711; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center; }
              .content { background: #f9f9f9; border-radius: 0 0 12px 12px; padding: 30px; }
              .info-box { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; }
              .label { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
              .value { font-size: 16px; font-weight: 500; }
              .button { display: inline-block; background: #EC7711; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">🆕 Nuova Registrazione Coach</h2>
              </div>
              
              <div class="content">
                <p>Un nuovo coach si è registrato sulla piattaforma:</p>
                
                <div class="info-box">
                  <div class="label">Nome</div>
                  <div class="value">${data.name}</div>
                </div>
                
                <div class="info-box">
                  <div class="label">Email</div>
                  <div class="value">${data.email}</div>
                </div>
                
                <div class="info-box">
                  <div class="label">Aree di specializzazione</div>
                  <div class="value">${data.lifeAreas?.join(', ') || 'Non specificate'}</div>
                </div>
                
                <div class="info-box">
                  <div class="label">Anni di esperienza</div>
                  <div class="value">${data.yearsOfExperience || 'Non specificato'}</div>
                </div>
                
                <center style="margin-top: 20px;">
                  <a href="https://coachami.vercel.app/admin/coaches" class="button">
                    Vai alla Dashboard Admin
                  </a>
                </center>
              </div>
            </div>
          </body>
          </html>
        `
      })
      
      console.log('✅ Email admin inviata:', adminEmailResult)

      return NextResponse.json({ 
        success: true, 
        message: 'Email inviate con successo',
        coachEmail: coachEmailResult,
        adminEmail: adminEmailResult
      })
    }
    
    // EMAIL CONFERMA PRENOTAZIONE
    if (type === 'booking_confirmation') {
      console.log('📤 Invio email conferma prenotazione')
      
      const { coachName, coachEmail, coacheeName, coacheeEmail, date, time, duration, sessionDate } = data
      
      // Genera link per Google Calendar
      // sessionDate deve essere passato come ISO string dal client
      let googleCalendarUrl = ''
      let icsDownloadUrl = ''
      
      if (sessionDate) {
        const startDate = new Date(sessionDate)
        const endDate = new Date(startDate.getTime() + (duration || 30) * 60000)
        
        // Formato per Google Calendar
        const formatForGoogle = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        
        const eventTitle = `Call di coaching con ${coachName}`
        const eventDescription = `Sessione di coaching su CoachaMi`
        
        googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatForGoogle(startDate)}/${formatForGoogle(endDate)}&details=${encodeURIComponent(eventDescription)}&location=Videochiamata`
      }
      
      // Email al coachee
      const coacheeEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `✅ Prenotazione confermata con ${coachName} - CoachaMi`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #333;">Coacha</span><span style="font-size: 28px; font-weight: bold; color: #EC7711; font-style: italic;">Mi</span>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 30px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                          <div style="width: 60px; height: 60px; background: #d4edda; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 30px;">✓</span>
                          </div>
                        </div>
                        
                        <h2 style="margin: 0 0 20px 0; color: #333; text-align: center;">Prenotazione confermata!</h2>
                        
                        <p style="margin: 0 0 25px 0;">Ciao ${coacheeName}! La tua call con <strong>${coachName}</strong> è stata confermata.</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF7ED; border-radius: 8px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0;"><strong>📅 Data:</strong> ${date}</p>
                              <p style="margin: 0 0 10px 0;"><strong>🕐 Ora:</strong> ${time}</p>
                              <p style="margin: 0 0 10px 0;"><strong>⏱️ Durata:</strong> ${duration} minuti</p>
                              <p style="margin: 0;"><strong>📹 Modalità:</strong> Videochiamata</p>
                            </td>
                          </tr>
                        </table>
                        
                        ${googleCalendarUrl ? `
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center;">
                              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Aggiungi al calendario:</p>
                              <a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background: #4285F4; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">📅 Google Calendar</a>
                            </td>
                          </tr>
                        </table>
                        ` : ''}
                        
                        <div style="background: #d4edda; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; color: #155724; font-size: 14px;">
                            <strong>✓ Prima call di orientamento gratuita</strong><br>
                            Il coach ti contatterà per inviarti il link alla videochiamata.
                          </p>
                        </div>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://www.coachami.it/dashboard" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">Vedi le tue sessioni</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0; color: #666; font-size: 14px;">
                        <p style="margin: 0;">© 2025 CoachaMi - Tutti i diritti riservati</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      })
      
      console.log('✅ Email coachee inviata:', coacheeEmailResult)
      
      // Email al coach
      const coachEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `📅 Nuova prenotazione da ${coacheeName} - CoachaMi`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #333;">Coacha</span><span style="font-size: 28px; font-weight: bold; color: #EC7711; font-style: italic;">Mi</span>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #333;">📅 Nuova prenotazione!</h2>
                        
                        <p style="margin: 0 0 25px 0;">Ciao ${coachName}! Hai ricevuto una nuova prenotazione da <strong>${coacheeName}</strong>.</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF7ED; border-radius: 8px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0;"><strong>👤 Coachee:</strong> ${coacheeName}</p>
                              <p style="margin: 0 0 10px 0;"><strong>📧 Email:</strong> ${coacheeEmail}</p>
                              <p style="margin: 0 0 10px 0;"><strong>📅 Data:</strong> ${date}</p>
                              <p style="margin: 0 0 10px 0;"><strong>🕐 Ora:</strong> ${time}</p>
                              <p style="margin: 0;"><strong>⏱️ Durata:</strong> ${duration} minuti</p>
                            </td>
                          </tr>
                        </table>
                        
                        ${googleCalendarUrl ? `
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center;">
                              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Aggiungi al calendario:</p>
                              <a href="${googleCalendarUrl.replace(coachName, coacheeName)}" target="_blank" style="display: inline-block; background: #4285F4; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">📅 Google Calendar</a>
                            </td>
                          </tr>
                        </table>
                        ` : ''}
                        
                        <div style="background: #fff3cd; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; color: #856404; font-size: 14px;">
                            <strong>⚠️ Azione richiesta:</strong><br>
                            Ricordati di inviare il link alla videochiamata al coachee prima della sessione.
                          </p>
                        </div>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://www.coachami.it/coach/dashboard" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">Vai alla Dashboard</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0; color: #666; font-size: 14px;">
                        <p style="margin: 0;">© 2025 CoachaMi - Tutti i diritti riservati</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      })
      
      console.log('✅ Email coach inviata:', coachEmailResult)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email di conferma inviate',
        coacheeEmail: coacheeEmailResult,
        coachEmail: coachEmailResult
      })
    }
    
    // EMAIL RICHIESTA OFFERTA
    if (type === 'offer_request') {
      console.log('📤 Invio email richiesta offerta')
      
      const { coachName, coachEmail, coacheeName, coacheeEmail, objectives, budget, notes } = data
      
      const coachEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `💼 Nuova richiesta offerta da ${coacheeName} - CoachaMi`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #333;">Coacha</span><span style="font-size: 28px; font-weight: bold; color: #EC7711; font-style: italic;">Mi</span>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #333;">💼 Nuova richiesta offerta!</h2>
                        
                        <p style="margin: 0 0 25px 0;">Ciao ${coachName}! <strong>${coacheeName}</strong> è interessato/a ai tuoi servizi e ti ha inviato una richiesta di offerta.</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF7ED; border-radius: 8px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0;"><strong>👤 Da:</strong> ${coacheeName}</p>
                              <p style="margin: 0 0 15px 0;"><strong>📧 Email:</strong> ${coacheeEmail}</p>
                              
                              <p style="margin: 0 0 5px 0;"><strong>🎯 Obiettivi:</strong></p>
                              <p style="margin: 0 0 15px 0; padding: 10px; background: white; border-radius: 6px;">${objectives}</p>
                              
                              ${budget ? `<p style="margin: 0 0 10px 0;"><strong>💰 Budget indicativo:</strong> ${budget === 'da_definire' ? 'Da definire insieme' : '€' + budget}</p>` : ''}
                              
                              ${notes ? `
                              <p style="margin: 0 0 5px 0;"><strong>📝 Note:</strong></p>
                              <p style="margin: 0; padding: 10px; background: white; border-radius: 6px;">${notes}</p>
                              ` : ''}
                            </td>
                          </tr>
                        </table>
                        
                        <div style="background: #e8f5e9; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                            <strong>💡 Suggerimento:</strong><br>
                            Rispondi entro 24-48 ore per non perdere questo potenziale cliente. Crea un'offerta personalizzata dalla tua dashboard.
                          </p>
                        </div>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://www.coachami.it/coach/offers/new?coacheeId=${coacheeEmail}" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">Crea offerta</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0; color: #666; font-size: 14px;">
                        <p style="margin: 0;">© 2025 CoachaMi - Tutti i diritti riservati</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      })
      
      console.log('✅ Email richiesta offerta inviata:', coachEmailResult)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email richiesta offerta inviata',
        coachEmail: coachEmailResult
      })
    }
    
    // EMAIL SESSIONE CONFERMATA DAL COACH
    if (type === 'session_confirmed') {
      console.log('📤 Invio email sessione confermata')
      
      const { coachName, coachEmail, coacheeName, coacheeEmail, date, time, duration, sessionDate, type: sessionType } = data
      
      // Genera link per Google Calendar
      let googleCalendarUrl = ''
      if (sessionDate) {
        const startDate = new Date(sessionDate)
        const endDate = new Date(startDate.getTime() + (duration || 30) * 60000)
        const formatForGoogle = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        const eventTitle = `Call di coaching - ${coachName} & ${coacheeName}`
        const eventDescription = `Sessione di coaching su CoachaMi`
        googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatForGoogle(startDate)}/${formatForGoogle(endDate)}&details=${encodeURIComponent(eventDescription)}&location=Videochiamata`
      }
      
      // Email al COACHEE
      const coacheeEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `✅ Sessione confermata con ${coachName} - CoachaMi`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #333;">Coacha</span><span style="font-size: 28px; font-weight: bold; color: #EC7711; font-style: italic;">Mi</span>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 30px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                          <div style="width: 60px; height: 60px; background: #d4edda; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 30px;">✓</span>
                          </div>
                        </div>
                        
                        <h2 style="margin: 0 0 20px 0; color: #333; text-align: center;">Sessione confermata!</h2>
                        
                        <p style="margin: 0 0 25px 0;">Ciao ${coacheeName}! <strong>${coachName}</strong> ha confermato la tua sessione.</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF7ED; border-radius: 8px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0;"><strong>📅 Data:</strong> ${date}</p>
                              <p style="margin: 0 0 10px 0;"><strong>🕐 Ora:</strong> ${time}</p>
                              <p style="margin: 0 0 10px 0;"><strong>⏱️ Durata:</strong> ${duration} minuti</p>
                              <p style="margin: 0;"><strong>📹 Modalità:</strong> Videochiamata</p>
                            </td>
                          </tr>
                        </table>
                        
                        ${googleCalendarUrl ? `
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center;">
                              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Aggiungi al calendario:</p>
                              <a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background: #4285F4; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">📅 Google Calendar</a>
                            </td>
                          </tr>
                        </table>
                        ` : ''}
                        
                        <div style="background: #d4edda; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; color: #155724; font-size: 14px;">
                            <strong>✓ ${sessionType === 'free_consultation' ? 'Call di orientamento gratuita' : 'Sessione confermata'}</strong><br>
                            Il coach ti invierà il link alla videochiamata prima della sessione.
                          </p>
                        </div>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://www.coachami.it/dashboard" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">Vai alla Dashboard</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0; color: #666; font-size: 14px;">
                        <p style="margin: 0;">© 2025 CoachaMi - Tutti i diritti riservati</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      })
      
      console.log('✅ Email coachee (conferma) inviata:', coacheeEmailResult)
      
      // Email al COACH (promemoria con link calendario)
      const coachEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coachEmail,
        subject: `📅 Sessione confermata con ${coacheeName} - CoachaMi`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #333;">Coacha</span><span style="font-size: 28px; font-weight: bold; color: #EC7711; font-style: italic;">Mi</span>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #333;">📅 Sessione confermata!</h2>
                        
                        <p style="margin: 0 0 25px 0;">Ciao ${coachName}! Hai confermato la sessione con <strong>${coacheeName}</strong>.</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF7ED; border-radius: 8px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0;"><strong>👤 Coachee:</strong> ${coacheeName}</p>
                              <p style="margin: 0 0 10px 0;"><strong>📧 Email:</strong> ${coacheeEmail}</p>
                              <p style="margin: 0 0 10px 0;"><strong>📅 Data:</strong> ${date}</p>
                              <p style="margin: 0 0 10px 0;"><strong>🕐 Ora:</strong> ${time}</p>
                              <p style="margin: 0;"><strong>⏱️ Durata:</strong> ${duration} minuti</p>
                            </td>
                          </tr>
                        </table>
                        
                        ${googleCalendarUrl ? `
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center;">
                              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Aggiungi al calendario:</p>
                              <a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background: #4285F4; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">📅 Google Calendar</a>
                            </td>
                          </tr>
                        </table>
                        ` : ''}
                        
                        <div style="background: #fff3cd; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; color: #856404; font-size: 14px;">
                            <strong>⚠️ Ricorda:</strong><br>
                            Invia il link alla videochiamata al coachee prima della sessione.
                          </p>
                        </div>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://www.coachami.it/coach/sessions" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">Gestisci Sessioni</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0; color: #666; font-size: 14px;">
                        <p style="margin: 0;">© 2025 CoachaMi - Tutti i diritti riservati</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      })
      
      console.log('✅ Email coach (conferma) inviata:', coachEmailResult)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email di conferma sessione inviate',
        coacheeEmail: coacheeEmailResult,
        coachEmail: coachEmailResult
      })
    }
    
    // EMAIL SESSIONE ANNULLATA DAL COACH
    if (type === 'session_cancelled_by_coach') {
      console.log('📤 Invio email sessione annullata')
      
      const { coachName, coachEmail, coacheeName, coacheeEmail, date, time, reason } = data
      
      const reasonText = reason === 'rejected' 
        ? 'non ha potuto accettare la tua richiesta'
        : 'ha dovuto annullare la sessione'
      
      // Email al COACHEE
      const coacheeEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `❌ Sessione annullata - CoachaMi`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #333;">Coacha</span><span style="font-size: 28px; font-weight: bold; color: #EC7711; font-style: italic;">Mi</span>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 30px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                          <div style="width: 60px; height: 60px; background: #fee2e2; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 30px;">✕</span>
                          </div>
                        </div>
                        
                        <h2 style="margin: 0 0 20px 0; color: #333; text-align: center;">Sessione annullata</h2>
                        
                        <p style="margin: 0 0 25px 0;">Ciao ${coacheeName}, purtroppo <strong>${coachName}</strong> ${reasonText}.</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-radius: 8px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0;"><strong>📅 Data prevista:</strong> ${date}</p>
                              <p style="margin: 0;"><strong>🕐 Ora prevista:</strong> ${time}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <div style="background: #f0f9ff; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; color: #1e40af; font-size: 14px;">
                            <strong>💡 Non preoccuparti!</strong><br>
                            Puoi prenotare una nuova sessione con un altro coach o riprovare più avanti.
                          </p>
                        </div>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://www.coachami.it/matching" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">Trova un altro coach</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0; color: #666; font-size: 14px;">
                        <p style="margin: 0;">© 2025 CoachaMi - Tutti i diritti riservati</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      })
      
      console.log('✅ Email coachee (annullamento) inviata:', coacheeEmailResult)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email annullamento inviata',
        coacheeEmail: coacheeEmailResult
      })
    }
    
    // EMAIL SESSIONE RIMANDATA DAL COACH
    if (type === 'session_rescheduled_by_coach') {
      console.log('📤 Invio email sessione rimandata')
      
      const { coachName, coachEmail, coacheeName, coacheeEmail, date, time, coachId } = data
      
      // Email al COACHEE
      const coacheeEmailResult = await resend.emails.send({
        from: 'CoachaMi <noreply@coachami.it>',
        to: coacheeEmail,
        subject: `🔄 Sessione da riprogrammare - CoachaMi`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #333;">Coacha</span><span style="font-size: 28px; font-weight: bold; color: #EC7711; font-style: italic;">Mi</span>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 30px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                          <div style="width: 60px; height: 60px; background: #fef3c7; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 30px;">🔄</span>
                          </div>
                        </div>
                        
                        <h2 style="margin: 0 0 20px 0; color: #333; text-align: center;">Sessione da riprogrammare</h2>
                        
                        <p style="margin: 0 0 25px 0;">Ciao ${coacheeName}, <strong>${coachName}</strong> ha chiesto di spostare la sessione ad un'altra data.</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #fff7ed; border-radius: 8px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0;"><strong>📅 Data originale:</strong> ${date}</p>
                              <p style="margin: 0;"><strong>🕐 Ora originale:</strong> ${time}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <div style="background: #ecfdf5; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; color: #065f46; font-size: 14px;">
                            <strong>📅 Cosa fare?</strong><br>
                            Prenota una nuova data che ti sia comoda. La tua call gratuita è ancora valida!
                          </p>
                        </div>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://www.coachami.it/booking/${coachId}" style="display: inline-block; background: #EC7711; color: white; padding: 14px 35px; border-radius: 25px; text-decoration: none; font-weight: 600;">Scegli nuova data</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0; color: #666; font-size: 14px;">
                        <p style="margin: 0;">© 2025 CoachaMi - Tutti i diritti riservati</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      })
      
      console.log('✅ Email coachee (rimando) inviata:', coacheeEmailResult)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email rimando inviata',
        coacheeEmail: coacheeEmailResult
      })
    }

    return NextResponse.json({ error: 'Tipo email non supportato' }, { status: 400 })

  } catch (error: any) {
    console.error('❌ Errore invio email:', error)
    console.error('❌ Dettagli errore:', JSON.stringify(error, null, 2))
    return NextResponse.json({ 
      error: 'Errore invio email', 
      details: error?.message || 'Errore sconosciuto'
    }, { status: 500 })
  }
}
