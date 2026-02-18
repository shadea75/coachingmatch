/**
 * messageFilter.ts
 * 
 * Filtra messaggi in chat per oscurare informazioni di contatto
 * (email, telefoni, link social/WhatsApp) e proteggere il modello di business.
 * 
 * STRATEGIA ANTI-SPEZZAMENTO:
 * - Messaggi composti solo da cifre (es. "389", "005", "4330") vengono bloccati
 * - Questo impedisce di inviare numeri di telefono in messaggi separati
 */

// Pattern per rilevare informazioni di contatto
const PATTERNS = {
  // Email: qualsiasi cosa con @ e dominio (anche con spazi attorno a @ e .)
  email: /[a-zA-Z0-9._%+\-]+\s*[@＠]\s*[a-zA-Z0-9.\-]+\s*[.．]\s*[a-zA-Z]{2,}/gi,
  
  // Email offuscate tipo "nome AT gmail DOT com", "nome [at] gmail [dot] com",
  // "nome chiocciola gmail punto com" — anche con spazi nei domini
  emailObfuscated: /[a-zA-Z0-9._%+\-]+\s*[\[\(]?\s*(?:at|AT|At|chiocciola|CHIOCCIOLA)\s*[\]\)]?\s*[a-zA-Z0-9.\-]+\s*[\[\(]?\s*(?:dot|DOT|Dot|punto|PUNTO)\s*[\]\)]?\s*[a-zA-Z]{2,}/gi,

  // Email con spazi intenzionali tipo "nome @ gmail . com" o "nome @gmail .com"
  emailSpaced: /[a-zA-Z0-9._%+\-]+\s+@\s*[a-zA-Z0-9.\-]+\s*\.\s*[a-zA-Z]{2,}/gi,

  // Numeri di telefono italiani: +39, 0039, 3xx, 0xx (almeno 6 cifre consecutive)
  phoneIT: /(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3,4}[\s.\-]?\d{3,4}(?:\d{1,4})?/g,
  
  // Numeri scritti con spazi/punti tra ogni cifra: "3 3 8 1 2 3 4 5 6 7" o "3.3.8.1.2.3.4"
  phoneSpaced: /(?:\d[\s.\-]){5,}\d/g,

  // Numeri scritti a parole italiane  
  phoneWords: /(?:tre|due|uno|zero|quattro|cinque|sei|sette|otto|nove)(?:\s+(?:tre|due|uno|zero|quattro|cinque|sei|sette|otto|nove)){4,}/gi,

  // WhatsApp link e menzioni
  whatsapp: /(?:wa\.me\/\d+|(?:api\.)?whatsapp\.com\S*|(?:scrivimi|contattami|scrivmi|chiamami|messaggiami|scrivi)\s+(?:su|via|in|a)?\s*whatsapp)/gi,
  
  // Social media handles e link
  socialLinks: /(?:(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|instagram|ig|telegram|t\.me|linkedin|twitter|x\.com|tiktok)\S*)|(?:[@][\w.]{2,30})/gi,
  
  // Menzioni dirette di social per scambiare contatti
  socialMention: /(?:(?:seguimi|trovami|cercami|aggiungimi|contattami|scrivimi|scrivmi|scrivi)\s+(?:su|via|in)\s+(?:instagram|facebook|fb|telegram|whatsapp|linkedin|twitter|tiktok))/gi,

  // Link generici (http/https/www) — esclusi coachami.it
  genericLinks: /(?:https?:\/\/|www\.)[^\s]+/gi,

  // Domini email pubblici/gratuiti menzionati in chat (tentativo di comunicare email a pezzi)
  emailDomains: /\b(?:gmail|yahoo|hotmail|outlook|libero|virgilio|alice|tiscali|fastwebnet|aruba|pec|icloud|live|msn|aol|protonmail|proton|mail|email|thunderbird|zoho|yandex|gmx|tutanota|tim|vodafone|wind|tre)(?:\s*\.\s*(?:com|it|net|org|eu|co|me|mail|pec))?\b/gi,
}

// Placeholder per il testo oscurato
const REPLACEMENT = '[contatto rimosso 🔒]'

// Messaggi di avviso
export const FILTER_WARNING = 'Per la tua sicurezza e per garantire la qualità del servizio, lo scambio di contatti personali non è consentito in chat. Tutte le sessioni vanno prenotate tramite CoachaMi.'

export const DIGITS_WARNING = 'Non è possibile inviare messaggi composti solo da numeri. Se hai bisogno di condividere informazioni sulle sessioni, usa le funzionalità della piattaforma.'

export interface FilterResult {
  /** Testo filtrato (con contatti oscurati) */
  filteredText: string
  /** true se almeno un pattern è stato trovato e oscurato */
  wasFiltered: boolean
  /** true se il messaggio è stato bloccato completamente (non inviato) */
  blocked: boolean
  /** Tipi di contatto rilevati */
  detectedTypes: string[]
  /** Messaggio di warning specifico */
  warningMessage: string
}

/**
 * Controlla se un messaggio è composto solo da cifre/separatori
 * (tentativo di inviare numero di telefono a pezzi)
 * Es: "389", "005", "4330", "389 005"
 */
function isDigitsOnlyMessage(text: string): boolean {
  const cleaned = text.replace(/[\s.\-\+\(\)\/]/g, '')
  // Se dopo aver rimosso spazi e separatori rimangono solo cifre
  // e ci sono almeno 2 cifre, è sospetto
  return /^\d{2,}$/.test(cleaned)
}

/**
 * Controlla se una stringa contiene un numero di telefono valido
 * (almeno 7 cifre per evitare falsi positivi con numeri normali come "5 sessioni")
 */
function isLikelyPhoneNumber(match: string): boolean {
  const digitsOnly = match.replace(/\D/g, '')
  if (digitsOnly.length < 7) return false
  if (/^(?:3[0-9]|0[0-9]|39|00)/.test(digitsOnly)) return true
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
 * Reset di tutti i lastIndex delle regex globali
 */
function resetPatterns(): void {
  Object.values(PATTERNS).forEach(function(pattern) {
    if (pattern instanceof RegExp) {
      pattern.lastIndex = 0
    }
  })
}

/**
 * Filtra un messaggio, oscurando informazioni di contatto.
 * Blocca completamente i messaggi composti solo da numeri.
 */
export function filterMessage(text: string): FilterResult {
  // STEP 0: Blocca messaggi composti solo da cifre (anti-spezzamento)
  if (isDigitsOnlyMessage(text)) {
    return {
      filteredText: '',
      wasFiltered: true,
      blocked: true,
      detectedTypes: ['telefono-spezzato'],
      warningMessage: DIGITS_WARNING
    }
  }

  var filteredText = text
  var detectedTypes: string[] = []

  // Assicura reset pattern prima di iniziare
  resetPatterns()

  // 1. Email standard (con @)
  if (PATTERNS.email.test(filteredText)) {
    PATTERNS.email.lastIndex = 0
    filteredText = filteredText.replace(PATTERNS.email, REPLACEMENT)
    detectedTypes.push('email')
  }
  PATTERNS.email.lastIndex = 0

  // 2. Email con spazi attorno a @ (es. "nome @ gmail . com")
  if (PATTERNS.emailSpaced.test(filteredText)) {
    PATTERNS.emailSpaced.lastIndex = 0
    filteredText = filteredText.replace(PATTERNS.emailSpaced, REPLACEMENT)
    if (detectedTypes.indexOf('email') === -1) detectedTypes.push('email')
  }
  PATTERNS.emailSpaced.lastIndex = 0

  // 3. Email offuscate (at/chiocciola, dot/punto)
  if (PATTERNS.emailObfuscated.test(filteredText)) {
    PATTERNS.emailObfuscated.lastIndex = 0
    filteredText = filteredText.replace(PATTERNS.emailObfuscated, REPLACEMENT)
    if (detectedTypes.indexOf('email') === -1) detectedTypes.push('email')
  }
  PATTERNS.emailObfuscated.lastIndex = 0

  // 4. WhatsApp
  if (PATTERNS.whatsapp.test(filteredText)) {
    PATTERNS.whatsapp.lastIndex = 0
    filteredText = filteredText.replace(PATTERNS.whatsapp, REPLACEMENT)
    detectedTypes.push('whatsapp')
  }
  PATTERNS.whatsapp.lastIndex = 0

  // 5. Social links
  if (PATTERNS.socialLinks.test(filteredText)) {
    PATTERNS.socialLinks.lastIndex = 0
    filteredText = filteredText.replace(PATTERNS.socialLinks, REPLACEMENT)
    detectedTypes.push('social')
  }
  PATTERNS.socialLinks.lastIndex = 0

  // 6. Social mention (scrivimi su instagram, ecc.)
  if (PATTERNS.socialMention.test(filteredText)) {
    PATTERNS.socialMention.lastIndex = 0
    filteredText = filteredText.replace(PATTERNS.socialMention, REPLACEMENT)
    if (detectedTypes.indexOf('social') === -1) detectedTypes.push('social')
  }
  PATTERNS.socialMention.lastIndex = 0

  // 7. Link generici (esclusi coachami)
  filteredText = filteredText.replace(PATTERNS.genericLinks, function(match) {
    if (isCoachaMiLink(match)) return match
    if (detectedTypes.indexOf('link') === -1) detectedTypes.push('link')
    return REPLACEMENT
  })
  PATTERNS.genericLinks.lastIndex = 0

  // 8. Domini email menzionati (gmail, libero, yahoo, ecc.)
  if (PATTERNS.emailDomains.test(filteredText)) {
    PATTERNS.emailDomains.lastIndex = 0
    filteredText = filteredText.replace(PATTERNS.emailDomains, REPLACEMENT)
    if (detectedTypes.indexOf('email') === -1) detectedTypes.push('email')
  }
  PATTERNS.emailDomains.lastIndex = 0

  // 9. Numeri di telefono completi (controlla che siano reali)
  filteredText = filteredText.replace(PATTERNS.phoneIT, function(match) {
    if (isLikelyPhoneNumber(match)) {
      if (detectedTypes.indexOf('telefono') === -1) detectedTypes.push('telefono')
      return REPLACEMENT
    }
    return match
  })
  PATTERNS.phoneIT.lastIndex = 0

  // 10. Numeri spaziati tipo "3 3 8 1 2 3 4 5 6 7"
  if (PATTERNS.phoneSpaced.test(filteredText)) {
    PATTERNS.phoneSpaced.lastIndex = 0
    filteredText = filteredText.replace(PATTERNS.phoneSpaced, REPLACEMENT)
    if (detectedTypes.indexOf('telefono') === -1) detectedTypes.push('telefono')
  }
  PATTERNS.phoneSpaced.lastIndex = 0

  // 11. Numeri scritti a parole: "tre tre otto uno due..."
  if (PATTERNS.phoneWords.test(filteredText)) {
    PATTERNS.phoneWords.lastIndex = 0
    filteredText = filteredText.replace(PATTERNS.phoneWords, REPLACEMENT)
    if (detectedTypes.indexOf('telefono') === -1) detectedTypes.push('telefono')
  }
  PATTERNS.phoneWords.lastIndex = 0

  var wasFiltered = detectedTypes.length > 0

  return {
    filteredText: filteredText.trim(),
    wasFiltered: wasFiltered,
    blocked: false,
    detectedTypes: Array.from(new Set(detectedTypes)),
    warningMessage: wasFiltered ? FILTER_WARNING : ''
  }
}
