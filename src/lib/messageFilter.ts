/**
 * messageFilter.ts
 * 
 * Filtra messaggi in chat per oscurare informazioni di contatto
 * (email, telefoni, link social/WhatsApp) e proteggere il modello di business.
 */

// Pattern per rilevare informazioni di contatto
const PATTERNS = {
  // Email: qualsiasi cosa con @ e dominio
  email: /[a-zA-Z0-9._%+\-]+\s*[@＠]\s*[a-zA-Z0-9.\-]+\s*[.．]\s*[a-zA-Z]{2,}/gi,
  
  // Email offuscate tipo "nome AT gmail DOT com" o "nome [at] gmail [dot] com"
  emailObfuscated: /[a-zA-Z0-9._%+\-]+\s*[\[\(]?\s*(?:at|AT|chiocciola)\s*[\]\)]?\s*[a-zA-Z0-9.\-]+\s*[\[\(]?\s*(?:dot|DOT|punto)\s*[\]\)]?\s*[a-zA-Z]{2,}/gi,

  // Numeri di telefono italiani: +39, 0039, 3xx, 0xx (almeno 6 cifre consecutive)
  phoneIT: /(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3,4}[\s.\-]?\d{3,4}(?:\d{1,4})?/g,
  
  // Numeri scritti a parole o con spazi/punti tipo "tre tre otto ..." o "3.3.8..."
  phoneSpaced: /(?:3[\s.\-]){2,}\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d/g,

  // WhatsApp link e menzioni
  whatsapp: /(?:wa\.me\/\d+|(?:api\.)?whatsapp\.com\S*|(?:scrivimi|contattami|scrivmi|chiamami|messaggiami)\s+(?:su|via|in)\s+whatsapp)/gi,
  
  // Social media handles e link
  socialLinks: /(?:(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|instagram|ig|telegram|t\.me|linkedin|twitter|x\.com|tiktok)\S*)|(?:[@][\w.]{2,30})/gi,
  
  // Menzioni dirette di social per scambiare contatti
  socialMention: /(?:(?:seguimi|trovami|cercami|aggiungimi|contattami|scrivimi|scrivmi)\s+(?:su|via|in)\s+(?:instagram|facebook|fb|telegram|whatsapp|linkedin|twitter|tiktok))/gi,

  // Link generici (http/https/www) — esclusi coachami.it
  genericLinks: /(?:https?:\/\/|www\.)[^\s]+/gi,
}

// Placeholder per il testo oscurato
const REPLACEMENT = '[contatto rimosso 🔒]'

// Messaggi di avviso
export const FILTER_WARNING = 'Per la tua sicurezza e per garantire la qualità del servizio, lo scambio di contatti personali non è consentito in chat. Tutte le sessioni vanno prenotate tramite CoachaMi.'

export interface FilterResult {
  /** Testo filtrato (con contatti oscurati) */
  filteredText: string
  /** true se almeno un pattern è stato trovato e oscurato */
  wasFiltered: boolean
  /** Tipi di contatto rilevati */
  detectedTypes: string[]
}

/**
 * Controlla se una stringa contiene un numero di telefono valido
 * (almeno 7 cifre per evitare falsi positivi con numeri normali come "5 sessioni")
 */
function isLikelyPhoneNumber(match: string): boolean {
  const digitsOnly = match.replace(/\D/g, '')
  // Un telefono italiano ha almeno 9-10 cifre (con prefisso), 
  // ma accettiamo 7+ per catturare anche formati parziali
  if (digitsOnly.length < 7) return false
  // Se inizia con 3 (cellulare italiano) o 0 (fisso) o + (internazionale), è probabilmente un telefono
  if (/^(?:3[0-9]|0[0-9]|39|00)/.test(digitsOnly)) return true
  // Se ha 10+ cifre è quasi certamente un numero
  if (digitsOnly.length >= 10) return true
  return false
}

/**
 * Controlla se un link è di CoachaMi (da non filtrare)
 */
function isCoachaMiLink(match: string): boolean {
  return /coachami\.it/i.test(match) || /coachami\.vercel\.app/i.test(match)
}

/**
 * Filtra un messaggio, oscurando informazioni di contatto.
 */
export function filterMessage(text: string): FilterResult {
  let filteredText = text
  const detectedTypes: string[] = []

  // 1. Email
  if (PATTERNS.email.test(filteredText)) {
    filteredText = filteredText.replace(PATTERNS.email, REPLACEMENT)
    detectedTypes.push('email')
  }
  // Reset lastIndex (global regex)
  PATTERNS.email.lastIndex = 0

  // 2. Email offuscate
  if (PATTERNS.emailObfuscated.test(filteredText)) {
    filteredText = filteredText.replace(PATTERNS.emailObfuscated, REPLACEMENT)
    if (!detectedTypes.includes('email')) detectedTypes.push('email')
  }
  PATTERNS.emailObfuscated.lastIndex = 0

  // 3. WhatsApp
  if (PATTERNS.whatsapp.test(filteredText)) {
    filteredText = filteredText.replace(PATTERNS.whatsapp, REPLACEMENT)
    detectedTypes.push('whatsapp')
  }
  PATTERNS.whatsapp.lastIndex = 0

  // 4. Social links
  if (PATTERNS.socialLinks.test(filteredText)) {
    filteredText = filteredText.replace(PATTERNS.socialLinks, REPLACEMENT)
    detectedTypes.push('social')
  }
  PATTERNS.socialLinks.lastIndex = 0

  // 5. Social mention (scrivimi su instagram, ecc.)
  if (PATTERNS.socialMention.test(filteredText)) {
    filteredText = filteredText.replace(PATTERNS.socialMention, REPLACEMENT)
    if (!detectedTypes.includes('social')) detectedTypes.push('social')
  }
  PATTERNS.socialMention.lastIndex = 0

  // 6. Link generici (esclusi coachami)
  filteredText = filteredText.replace(PATTERNS.genericLinks, (match) => {
    if (isCoachaMiLink(match)) return match
    detectedTypes.push('link')
    return REPLACEMENT
  })
  PATTERNS.genericLinks.lastIndex = 0

  // 7. Numeri di telefono (controlla che siano reali)
  filteredText = filteredText.replace(PATTERNS.phoneIT, (match) => {
    if (isLikelyPhoneNumber(match)) {
      if (!detectedTypes.includes('telefono')) detectedTypes.push('telefono')
      return REPLACEMENT
    }
    return match
  })
  PATTERNS.phoneIT.lastIndex = 0

  // 8. Numeri spaziati tipo "3 3 8 1 2 3 4 5 6 7"
  if (PATTERNS.phoneSpaced.test(filteredText)) {
    filteredText = filteredText.replace(PATTERNS.phoneSpaced, REPLACEMENT)
    if (!detectedTypes.includes('telefono')) detectedTypes.push('telefono')
  }
  PATTERNS.phoneSpaced.lastIndex = 0

  return {
    filteredText: filteredText.trim(),
    wasFiltered: detectedTypes.length > 0,
    detectedTypes: Array.from(new Set(detectedTypes))
  }
}
