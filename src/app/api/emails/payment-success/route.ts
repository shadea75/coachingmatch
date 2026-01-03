// src/app/api/emails/payment-success/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      coacheeEmail, 
      coacheeName,
      coachEmail,
      coachName,
      offerTitle,
      sessionNumber,
      totalSessions,
      amountPaid,
      offerId
    } = body

    // Inizializza Resend solo quando serve
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('RESEND_API_KEY non configurata')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.coachami.it'
    const emails = []

    // Email al coachee (conferma pagamento)
    if (coacheeEmail) {
      emails.push(
        resend.emails.send({
          from: 'CoachaMi <noreply@coachami.it>',
          to: coacheeEmail,
          subject: `✅ Pagamento confermato - Sessione #${sessionNumber}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FDF8F3; margin: 0; padding: 20px;">
              <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #10B981, #34D399); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">✅ Pagamento Confermato!</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Ciao <strong>${coacheeName || 'Coachee'}</strong>,
                  </p>
                  
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Il tuo pagamento è stato elaborato con successo!
                  </p>
                  
                  <!-- Receipt Box -->
                  <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #166534; margin: 0 0 15px 0;">Riepilogo</h3>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="color: #6B7280; padding: 5px 0;">Percorso:</td>
                        <td style="color: #1F2937; font-weight: bold; text-align: right;">${offerTitle}</td>
                      </tr>
                      <tr>
                        <td style="color: #6B7280; padding: 5px 0;">Coach:</td>
                        <td style="color: #1F2937; font-weight: bold; text-align: right;">${coachName}</td>
                      </tr>
                      <tr>
                        <td style="color: #6B7280; padding: 5px 0;">Sessione:</td>
                        <td style="color: #1F2937; font-weight: bold; text-align: right;">#${sessionNumber} di ${totalSessions}</td>
                      </tr>
                      <tr style="border-top: 1px solid #BBF7D0;">
                        <td style="color: #6B7280; padding: 10px 0 5px 0;">Importo pagato:</td>
                        <td style="color: #166534; font-weight: bold; font-size: 18px; text-align: right; padding-top: 10px;">€${amountPaid?.toFixed(2)}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
                    📅 Il tuo coach riceverà una notifica. Potrai prenotare la sessione dalla tua dashboard.
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${appUrl}/offers" 
                       style="display: inline-block; background: #F97316; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Vai alle mie Offerte
                    </a>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                  <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                    © 2026 CoachaMi - Trova il coach giusto per te
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      )
    }

    // Email al coach (notifica pagamento ricevuto)
    if (coachEmail) {
      emails.push(
        resend.emails.send({
          from: 'CoachaMi <noreply@coachami.it>',
          to: coachEmail,
          subject: `💰 Nuovo pagamento ricevuto - ${coacheeName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FDF8F3; margin: 0; padding: 20px;">
              <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #F97316, #FB923C); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">💰 Pagamento Ricevuto!</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Ciao <strong>${coachName}</strong>,
                  </p>
                  
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    <strong>${coacheeName}</strong> ha pagato la sessione #${sessionNumber} del percorso "${offerTitle}".
                  </p>
                  
                  <!-- Info Box -->
                  <div style="background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="color: #6B7280; padding: 5px 0;">Sessione:</td>
                        <td style="color: #1F2937; font-weight: bold; text-align: right;">#${sessionNumber} di ${totalSessions}</td>
                      </tr>
                      <tr style="border-top: 1px solid #FED7AA;">
                        <td style="color: #6B7280; padding: 10px 0 5px 0;">Il tuo guadagno:</td>
                        <td style="color: #EA580C; font-weight: bold; font-size: 18px; text-align: right; padding-top: 10px;">€${(amountPaid * 0.7 / 1.22).toFixed(2)}</td>
                      </tr>
                    </table>
                    <p style="color: #9CA3AF; font-size: 11px; margin: 5px 0 0 0;">
                      (70% dopo IVA - il pagamento sarà trasferito sul tuo account Stripe)
                    </p>
                  </div>
                  
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
                    📅 Contatta ${coacheeName} per fissare la sessione.
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${appUrl}/coach/offers" 
                       style="display: inline-block; background: #F97316; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Vai alle Offerte
                    </a>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                  <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                    © 2026 CoachaMi - Trova il coach giusto per te
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      )
    }

    // Invia tutte le email
    const results = await Promise.allSettled(emails)
    
    const errors = results.filter(r => r.status === 'rejected')
    if (errors.length > 0) {
      console.error('Alcuni errori invio email:', errors)
    }

    return NextResponse.json({ 
      success: true, 
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: errors.length
    })

  } catch (error: any) {
    console.error('Errore invio email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
