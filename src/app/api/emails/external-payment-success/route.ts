// src/app/api/emails/external-payment-success/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const {
      clientEmail,
      clientName,
      coachEmail,
      coachName,
      offerTitle,
      sessionNumber,
      totalSessions,
      amountPaid,
      offerId
    } = await request.json()

    // Email al cliente
    await resend.emails.send({
      from: 'CoachaMi <noreply@coachami.it>',
      to: clientEmail,
      subject: `✅ Pagamento confermato - Sessione ${sessionNumber}/${totalSessions}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #FDF8F4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 64px; height: 64px; background: #DEF7EC; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                  <span style="font-size: 32px;">✅</span>
                </div>
                <h1 style="color: #1F2937; margin: 0; font-size: 24px;">Pagamento confermato!</h1>
              </div>
              
              <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
                Ciao <strong>${clientName}</strong>,
              </p>
              
              <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
                Il tuo pagamento è stato ricevuto con successo.
              </p>
              
              <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #1F2937; margin: 0 0 12px 0; font-size: 16px;">${offerTitle}</h3>
                <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 14px;">
                  Coach: <strong>${coachName}</strong>
                </p>
                <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 14px;">
                  Sessione: <strong>${sessionNumber}/${totalSessions}</strong>
                </p>
                <p style="color: #059669; margin: 0; font-size: 18px; font-weight: 600;">
                  Importo: €${amountPaid.toFixed(2)}
                </p>
              </div>
              
              <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
                <strong>${coachName}</strong> ti contatterà presto per programmare la tua sessione.
              </p>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/external-offer/${offerId}" 
                   style="display: inline-block; background: #F97316; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
                  Vedi stato pagamenti
                </a>
              </div>
              
              <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 32px;">
                Questa email è stata inviata tramite CoachaMi
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    // Email al coach
    await resend.emails.send({
      from: 'CoachaMi <noreply@coachami.it>',
      to: coachEmail,
      subject: `💰 Nuovo pagamento ricevuto da ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #FDF8F4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 64px; height: 64px; background: #DEF7EC; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                  <span style="font-size: 32px;">💰</span>
                </div>
                <h1 style="color: #1F2937; margin: 0; font-size: 24px;">Nuovo pagamento ricevuto!</h1>
              </div>
              
              <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
                Ciao <strong>${coachName}</strong>,
              </p>
              
              <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
                <strong>${clientName}</strong> ha effettuato un pagamento per il percorso:
              </p>
              
              <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #1F2937; margin: 0 0 12px 0; font-size: 16px;">${offerTitle}</h3>
                <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 14px;">
                  Cliente: <strong>${clientName}</strong> (${clientEmail})
                </p>
                <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 14px;">
                  Sessione: <strong>${sessionNumber}/${totalSessions}</strong>
                </p>
                <p style="color: #059669; margin: 0; font-size: 18px; font-weight: 600;">
                  Importo ricevuto: €${amountPaid.toFixed(2)}
                </p>
              </div>
              
              <div style="background: #FEF3C7; border-radius: 12px; padding: 16px; margin: 24px 0;">
                <p style="color: #92400E; margin: 0; font-size: 14px;">
                  💡 <strong>Prossimo passo:</strong> Contatta ${clientName} per programmare la sessione.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/coach/office" 
                   style="display: inline-block; background: #F97316; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
                  Vai all'Ufficio Virtuale
                </a>
              </div>
              
              <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 32px;">
                Questa email è stata inviata tramite CoachaMi
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending external payment email:', error)
    return NextResponse.json(
      { error: error.message || 'Errore invio email' },
      { status: 500 }
    )
  }
}
