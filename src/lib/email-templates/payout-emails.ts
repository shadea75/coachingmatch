// src/lib/email-templates/payout-emails.ts
// Template email per il flusso payout Modello A

// ============= COACH: RICHIESTA FATTURA =============

export const coachInvoiceRequestTemplate = (data: {
  coachName: string
  coacheeName: string
  offerTitle: string
  sessionNumber: number
  amount: string
  amountNet: string
  amountVat: string
  deadline: string
}) => ({
  subject: `💰 Emetti fattura per sessione ${data.sessionNumber} - ${data.offerTitle}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Ciao ${data.coachName}! 👋</h2>
      
      <p>Ottima notizia! <strong>${data.coacheeName}</strong> ha pagato la sessione ${data.sessionNumber} del percorso "<strong>${data.offerTitle}</strong>".</p>
      
      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1F2937;">📄 Dati per la fattura</h3>
        <p><strong>Intestazione:</strong> CoachaMi Srl</p>
        <p><strong>P.IVA:</strong> IT______________ (da inserire)</p>
        <p><strong>Indirizzo:</strong> Via __________, Città</p>
        
        <hr style="border: none; border-top: 1px solid #D1D5DB; margin: 15px 0;">
        
        <p><strong>Imponibile:</strong> €${data.amountNet}</p>
        <p><strong>IVA 22%:</strong> €${data.amountVat}</p>
        <p style="font-size: 18px;"><strong>Totale fattura:</strong> €${data.amount}</p>
      </div>
      
      <p>Per ricevere il pagamento, registra il numero della tua fattura nella tua dashboard coach entro <strong>${data.deadline}</strong>.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/coach/invoices" 
           style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Registra fattura
        </a>
      </div>
      
      <p style="color: #6B7280; font-size: 14px;">
        Il payout verrà processato il prossimo lunedì dopo la verifica della fattura.
      </p>
      
      <p>Grazie per far parte di CoachaMi! 🚀</p>
      
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 12px;">
        Questa email è stata inviata automaticamente da CoachaMi.
      </p>
    </div>
  `,
})

// ============= COACH: PAYOUT COMPLETATO =============

export const coachPayoutCompletedTemplate = (data: {
  coachName: string
  amount: string
  invoiceNumber: string
  transferId: string
  offerTitle: string
  sessionNumber: number
}) => ({
  subject: `✅ Payout completato: €${data.amount}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Payout completato! 💸</h2>
      
      <p>Ciao ${data.coachName},</p>
      
      <p>Abbiamo trasferito <strong>€${data.amount}</strong> sul tuo conto Stripe!</p>
      
      <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
        <p style="margin: 0;"><strong>Dettagli:</strong></p>
        <p style="margin: 5px 0;">Percorso: ${data.offerTitle}</p>
        <p style="margin: 5px 0;">Sessione: ${data.sessionNumber}</p>
        <p style="margin: 5px 0;">Fattura: ${data.invoiceNumber}</p>
        <p style="margin: 5px 0; font-size: 12px; color: #6B7280;">Transfer ID: ${data.transferId}</p>
      </div>
      
      <p>I fondi saranno disponibili sul tuo conto bancario secondo i tempi di Stripe (solitamente 2-7 giorni lavorativi).</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://dashboard.stripe.com" 
           style="background: #635BFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Vedi su Stripe Dashboard
        </a>
      </div>
      
      <p>Continua così! 🌟</p>
      
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 12px;">
        Questa email è stata inviata automaticamente da CoachaMi.
      </p>
    </div>
  `,
})

// ============= COACH: FATTURA RIFIUTATA =============

export const coachInvoiceRejectedTemplate = (data: {
  coachName: string
  invoiceNumber: string
  reason: string
  amount: string
  offerTitle: string
  sessionNumber: number
}) => ({
  subject: `⚠️ Fattura rifiutata - Azione richiesta`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #DC2626;">Fattura rifiutata</h2>
      
      <p>Ciao ${data.coachName},</p>
      
      <p>La fattura <strong>${data.invoiceNumber}</strong> per €${data.amount} è stata rifiutata.</p>
      
      <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
        <p style="margin: 0;"><strong>Motivo:</strong></p>
        <p style="margin: 10px 0;">${data.reason}</p>
      </div>
      
      <p><strong>Cosa fare:</strong></p>
      <ol>
        <li>Verifica i dati della fattura</li>
        <li>Emetti una nuova fattura corretta</li>
        <li>Registrala nella tua dashboard</li>
      </ol>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/coach/invoices" 
           style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Registra nuova fattura
        </a>
      </div>
      
      <p style="color: #6B7280;">
        Per assistenza, rispondi a questa email o contatta il supporto.
      </p>
      
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 12px;">
        Questa email è stata inviata automaticamente da CoachaMi.
      </p>
    </div>
  `,
})

// ============= ADMIN: NUOVA FATTURA DA VERIFICARE =============

export const adminInvoiceReceivedTemplate = (data: {
  payoutId: string
  coachName: string
  coachEmail: string
  invoiceNumber: string
  amount: string
  amountNet: string
  offerTitle: string
  sessionNumber: number
}) => ({
  subject: `📋 Nuova fattura da verificare - ${data.coachName}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Nuova fattura da verificare</h2>
      
      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Coach:</strong> ${data.coachName} (${data.coachEmail})</p>
        <p><strong>Numero fattura:</strong> ${data.invoiceNumber}</p>
        <p><strong>Importo:</strong> €${data.amount} (imponibile €${data.amountNet})</p>
        <p><strong>Percorso:</strong> ${data.offerTitle}</p>
        <p><strong>Sessione:</strong> ${data.sessionNumber}</p>
        <p style="font-size: 12px; color: #6B7280;"><strong>Payout ID:</strong> ${data.payoutId}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/payouts" 
           style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
          ✓ Verifica fatture
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 12px;">
        Notifica automatica CoachaMi Admin.
      </p>
    </div>
  `,
})

// ============= COACH: PUOI REINVIARE FATTURA =============

export const coachInvoiceResubmitTemplate = (data: {
  coachName: string
  amount: string
  offerTitle: string
  sessionNumber: number
}) => ({
  subject: `📝 Puoi inviare una nuova fattura - ${data.offerTitle}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Invia una nuova fattura</h2>
      
      <p>Ciao ${data.coachName},</p>
      
      <p>Il payout per la sessione ${data.sessionNumber} di "<strong>${data.offerTitle}</strong>" è stato reimpostato.</p>
      
      <p>Puoi ora inviare una nuova fattura di <strong>€${data.amount}</strong>.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/coach/invoices" 
           style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Registra fattura
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      <p style="color: #9CA3AF; font-size: 12px;">
        Questa email è stata inviata automaticamente da CoachaMi.
      </p>
    </div>
  `,
})
