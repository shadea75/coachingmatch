import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface Coach {
  id: string
  email: string
  name: string
}

export async function POST(request: NextRequest) {
  try {
    const { coaches, subject, body } = await request.json()
    
    if (!coaches || !Array.isArray(coaches) || coaches.length === 0) {
      return NextResponse.json({ error: 'Nessun coach selezionato' }, { status: 400 })
    }
    
    if (!subject || !body) {
      return NextResponse.json({ error: 'Oggetto e messaggio sono obbligatori' }, { status: 400 })
    }
    
    if (!resend) {
      return NextResponse.json({ error: 'Resend non configurato' }, { status: 500 })
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }
    
    // Invia email a ogni coach
    for (const coach of coaches as Coach[]) {
      try {
        // Sostituisci variabili
        const personalizedSubject = subject
          .replace(/\{\{name\}\}/g, coach.name)
          .replace(/\{\{email\}\}/g, coach.email)
        
        const personalizedBody = body
          .replace(/\{\{name\}\}/g, coach.name)
          .replace(/\{\{email\}\}/g, coach.email)
        
        // Genera HTML email
        const html = generateEmailHtml(coach.name, personalizedBody)
        
        await resend.emails.send({
          from: 'CoachaMi <noreply@coachami.it>',
          to: coach.email,
          subject: personalizedSubject,
          html
        })
        
        results.success++
        
        // Piccola pausa per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (err: any) {
        results.failed++
        results.errors.push(`${coach.name}: ${err.message}`)
        console.error(`Error sending to ${coach.email}:`, err)
      }
    }
    
    console.log(`📧 Broadcast completed: ${results.success} sent, ${results.failed} failed`)
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    console.error('Broadcast error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateEmailHtml(name: string, body: string): string {
  // Converte newlines in <br> e paragraphs
  const formattedBody = body
    .split('\n\n')
    .map(para => `<p style="margin: 0 0 16px 0; color: #374151;">${
      para.replace(/\n/g, '<br>')
    }</p>`)
    .join('')
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f5f0; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #D4A574 0%, #C4956A 100%); border-radius: 20px 20px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">CoachaMi</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px;">
      ${formattedBody}
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 30px 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
        Questa email è stata inviata da CoachaMi.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="https://www.coachami.it" style="color: #D4A574;">www.coachami.it</a> |
        <a href="https://www.coachami.it/settings" style="color: #D4A574;">Gestisci preferenze</a>
      </p>
    </div>
    
  </div>
</body>
</html>
  `
}
