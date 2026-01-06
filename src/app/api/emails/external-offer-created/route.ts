// src/app/api/emails/external-offer-created/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const {
      clientEmail,
      clientName,
      coachName,
      offerTitle,
      totalSessions,
      sessionDuration,
      pricePerSession,
      priceTotal,
      description,
      offerId
    } = await request.json()

    const offerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/external-offer/${offerId}`

    // Email al cliente
    await resend.emails.send({
      from: 'CoachaMi <noreply@coachami.it>',
      to: clientEmail,
      subject: `🎯 ${coachName} ti ha inviato un'offerta di coaching`,
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
                <div style="width: 64px; height: 64px; background: #FEF3C7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                  <span style="font-size: 32px;">🎯</span>
                </div>
                <h1 style="color: #1F2937; margin: 0; font-size: 24px;">Hai ricevuto un'offerta!</h1>
              </div>
              
              <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
                Ciao <strong>${clientName}</strong>,
              </p>
              
              <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
                <strong>${coachName}</strong> ti ha preparato un percorso di coaching personalizzato:
              </p>
              
              <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 16px; padding: 24px; margin: 24px 0;">
                <h2 style="color: #92400E; margin: 0 0 16px 0; font-size: 20px;">${offerTitle}</h2>
                
                ${description ? `<p style="color: #78350F; margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">${description}</p>` : ''}
                
                <div style="background: white; border-radius: 12px; padding: 16px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #6B7280; font-size: 14px;">Sessioni</span>
                    <span style="color: #1F2937; font-weight: 600;">${totalSessions}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #6B7280; font-size: 14px;">Durata</span>
                    <span style="color: #1F2937; font-weight: 600;">${sessionDuration} min</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #6B7280; font-size: 14px;">Per sessione</span>
                    <span style="color: #1F2937; font-weight: 600;">€${pricePerSession.toFixed(2)}</span>
                  </div>
                  <div style="border-top: 1px solid #E5E7EB; padding-top: 12px; margin-top: 12px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #1F2937; font-weight: 600; font-size: 16px;">Totale</span>
                      <span style="color: #F97316; font-weight: 700; font-size: 20px;">€${priceTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p style="color: #4B5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                💡 Puoi pagare una sessione alla volta. Dopo ogni pagamento, ${coachName} ti contatterà per programmare la sessione.
              </p>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="${offerUrl}" 
                   style="display: inline-block; background: #F97316; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Visualizza offerta e paga
                </a>
              </div>
              
              <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 32px;">
                Se non hai richiesto questa offerta, puoi ignorare questa email.<br>
                Questa email è stata inviata tramite CoachaMi
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    return NextResponse.json({ success: true, offerUrl })
  } catch (error: any) {
    console.error('Error sending external offer email:', error)
    return NextResponse.json(
      { error: error.message || 'Errore invio email' },
      { status: 500 }
    )
  }
}
