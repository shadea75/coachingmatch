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
      offerId,
      // Nuovi campi per opzioni pagamento
      allowSinglePayment,
      allowInstallments,
      installmentFeePercent,
      priceTotalWithFee
    } = await request.json()

    const offerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/external-offer/${offerId}`
    
    // Calcola prezzi
    const hasInstallmentFee = installmentFeePercent && installmentFeePercent > 0
    const installmentTotal = priceTotalWithFee || priceTotal
    const pricePerInstallment = installmentTotal / totalSessions

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
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF8F4;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 32px;">
                      
                      <!-- Header -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding-bottom: 24px;">
                            <img src="https://www.coachami.it/logo.png" alt="CoachaMi" width="120" style="display: block;">
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-bottom: 32px;">
                            <h1 style="color: #1F2937; margin: 0; font-size: 24px; font-weight: 700;">Hai ricevuto un'offerta!</h1>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Saluto -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color: #4B5563; font-size: 16px; line-height: 1.6; padding-bottom: 16px;">
                            Ciao <strong>${clientName}</strong>,
                          </td>
                        </tr>
                        <tr>
                          <td style="color: #4B5563; font-size: 16px; line-height: 1.6; padding-bottom: 24px;">
                            <strong>${coachName}</strong> ti ha preparato un percorso di coaching personalizzato:
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Box Offerta -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 16px;">
                        <tr>
                          <td style="padding: 24px;">
                            <h2 style="color: #92400E; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">${offerTitle}</h2>
                            
                            ${description ? `<p style="color: #78350F; margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">${description}</p>` : ''}
                            
                            <!-- Dettagli -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px;">
                              <tr>
                                <td style="padding: 16px;">
                                  <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                      <td style="color: #6B7280; font-size: 14px; padding: 8px 0;">Sessioni</td>
                                      <td align="right" style="color: #1F2937; font-weight: 600; font-size: 14px; padding: 8px 0;">${totalSessions}</td>
                                    </tr>
                                    <tr>
                                      <td style="color: #6B7280; font-size: 14px; padding: 8px 0;">Durata sessione</td>
                                      <td align="right" style="color: #1F2937; font-weight: 600; font-size: 14px; padding: 8px 0;">${sessionDuration} min</td>
                                    </tr>
                                    <tr>
                                      <td style="color: #6B7280; font-size: 14px; padding: 8px 0;">Prezzo per sessione</td>
                                      <td align="right" style="color: #1F2937; font-weight: 600; font-size: 14px; padding: 8px 0;">€${pricePerSession.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                      <td colspan="2" style="border-top: 1px solid #E5E7EB; padding-top: 12px;"></td>
                                    </tr>
                                    <tr>
                                      <td style="color: #1F2937; font-weight: 600; font-size: 16px; padding: 8px 0;">Totale</td>
                                      <td align="right" style="color: #F97316; font-weight: 700; font-size: 20px; padding: 8px 0;">€${priceTotal.toFixed(2)}</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Opzioni pagamento -->
                      ${(allowSinglePayment !== false || allowInstallments !== false) ? `
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                        <tr>
                          <td style="background: #F0FDF4; border-radius: 12px; padding: 16px;">
                            <p style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">💰 Opzioni di pagamento disponibili:</p>
                            ${allowSinglePayment !== false ? `<p style="color: #15803D; font-size: 14px; margin: 4px 0;">✓ Pagamento unico: <strong>€${priceTotal.toFixed(2)}</strong></p>` : ''}
                            ${allowInstallments !== false ? `<p style="color: #15803D; font-size: 14px; margin: 4px 0;">✓ Pagamento rateale: <strong>${totalSessions} rate da €${pricePerInstallment.toFixed(2)}</strong>${hasInstallmentFee ? ` (+${installmentFeePercent}%)` : ''}</p>` : ''}
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <!-- Info -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                        <tr>
                          <td style="color: #4B5563; font-size: 14px; line-height: 1.6;">
                            💡 Dopo il pagamento, ${coachName} ti contatterà per programmare le sessioni.
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Pulsante -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                        <tr>
                          <td align="center">
                            <a href="${offerUrl}" 
                               style="display: inline-block; background: #F97316; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                              Visualizza offerta e paga →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Link alternativo -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                        <tr>
                          <td align="center" style="color: #9CA3AF; font-size: 12px;">
                            Se il pulsante non funziona, copia questo link nel browser:<br>
                            <a href="${offerUrl}" style="color: #F97316; word-break: break-all;">${offerUrl}</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Footer -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 24px;">
                        <tr>
                          <td align="center" style="color: #9CA3AF; font-size: 12px;">
                            Se non hai richiesto questa offerta, puoi ignorare questa email.<br>
                            Questa email è stata inviata tramite CoachaMi
                          </td>
                        </tr>
                      </table>
                      
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

    return NextResponse.json({ success: true, offerUrl })
  } catch (error: any) {
    console.error('Error sending external offer email:', error)
    return NextResponse.json(
      { error: error.message || 'Errore invio email' },
      { status: 500 }
    )
  }
}
