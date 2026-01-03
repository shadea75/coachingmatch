// src/app/api/emails/offer-created/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      coacheeEmail, 
      coacheeName,
      coachName,
      offerTitle,
      totalSessions,
      sessionDuration,
      priceTotal,
      pricePerSession,
      offerId
    } = body

    if (!coacheeEmail) {
      return NextResponse.json({ error: 'Email coachee mancante' }, { status: 400 })
    }

    // Inizializza Resend solo quando serve
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('RESEND_API_KEY non configurata')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.coachami.it'

    // Email al coachee
    const { data, error } = await resend.emails.send({
      from: 'CoachaMi <noreply@coachami.it>',
      to: coacheeEmail,
      subject: `🎯 Nuova offerta da ${coachName}`,
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
              <h1 style="color: white; margin: 0; font-size: 24px;">🎯 Nuova Offerta!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Ciao <strong>${coacheeName || 'Coachee'}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>${coachName}</strong> ti ha inviato un'offerta per un percorso di coaching personalizzato!
              </p>
              
              <!-- Offer Box -->
              <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin: 0 0 15px 0;">${offerTitle}</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6B7280; padding: 5px 0;">Sessioni:</td>
                    <td style="color: #1F2937; font-weight: bold; text-align: right;">${totalSessions}</td>
                  </tr>
                  <tr>
                    <td style="color: #6B7280; padding: 5px 0;">Durata sessione:</td>
                    <td style="color: #1F2937; font-weight: bold; text-align: right;">${sessionDuration} min</td>
                  </tr>
                  <tr>
                    <td style="color: #6B7280; padding: 5px 0;">Prezzo totale:</td>
                    <td style="color: #F97316; font-weight: bold; text-align: right;">€${priceTotal?.toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 1px solid #E5E7EB;">
                    <td style="color: #6B7280; padding: 10px 0 5px 0;">Pagamento a rate:</td>
                    <td style="color: #1F2937; font-weight: bold; text-align: right; padding-top: 10px;">€${pricePerSession?.toFixed(2)}/sessione</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
                💡 Pagherai una rata prima di ogni sessione. Nessun impegno a lungo termine!
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/offers" 
                   style="display: inline-block; background: #F97316; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Visualizza Offerta
                </a>
              </div>
              
              <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
                L'offerta scade tra 7 giorni. Non perdere questa opportunità!
              </p>
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

    if (error) {
      console.error('Errore Resend:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: data?.id })

  } catch (error: any) {
    console.error('Errore invio email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
