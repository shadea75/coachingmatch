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
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 30px 0; }
              .logo { font-size: 28px; font-weight: bold; color: #333; }
              .logo span { color: #EC7711; font-style: italic; }
              .content { background: #f9f9f9; border-radius: 12px; padding: 30px; margin: 20px 0; }
              .highlight { color: #EC7711; font-weight: 600; }
              .steps { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .step { display: flex; align-items: flex-start; margin: 15px 0; }
              .step-number { background: #EC7711; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
              .footer { text-align: center; color: #666; font-size: 14px; padding: 20px 0; }
              .button { display: inline-block; background: #EC7711; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Coacha<span>Mi</span></div>
              </div>
              
              <div class="content">
                <h2>Ciao ${data.name}! 👋</h2>
                <p>Grazie per esserti registrato come coach su <span class="highlight">CoachaMi</span>!</p>
                <p>Abbiamo ricevuto la tua candidatura e il nostro team la esaminerà con attenzione.</p>
                
                <div class="steps">
                  <h3>📋 Prossimi passi:</h3>
                  <div class="step">
                    <div class="step-number">1</div>
                    <div>
                      <strong>Revisione candidatura</strong><br>
                      <span style="color: #666;">Esamineremo il tuo profilo entro 48 ore lavorative</span>
                    </div>
                  </div>
                  <div class="step">
                    <div class="step-number">2</div>
                    <div>
                      <strong>Verifica documenti</strong><br>
                      <span style="color: #666;">Controlleremo le tue certificazioni</span>
                    </div>
                  </div>
                  <div class="step">
                    <div class="step-number">3</div>
                    <div>
                      <strong>Attivazione profilo</strong><br>
                      <span style="color: #666;">Una volta approvato, sarai visibile ai coachee</span>
                    </div>
                  </div>
                </div>
                
                <p>Ti contatteremo presto con l'esito della tua candidatura.</p>
                
                <center>
                  <a href="https://coachami.vercel.app" class="button">Visita CoachaMi</a>
                </center>
              </div>
              
              <div class="footer">
                <p>Hai domande? Rispondi a questa email o scrivici a <a href="mailto:coach@coachami.it" style="color: #EC7711;">coach@coachami.it</a></p>
                <p>© 2024 CoachaMi - Tutti i diritti riservati</p>
              </div>
            </div>
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
