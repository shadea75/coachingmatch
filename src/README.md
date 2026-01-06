# 🔗 CoachaMi - Migrazione a Stripe Connect

Questa guida spiega come integrare i nuovi file per passare dal Modello A (CoachaMi incassa tutto) al Modello B (Stripe Connect con split automatico).

## 📁 File da integrare

```
src/
├── app/
│   └── api/
│       ├── checkout/
│       │   └── route.ts              ← SOSTITUIRE (split automatico 70/30)
│       ├── webhooks/
│       │   └── stripe/
│       │       └── route.ts          ← SOSTITUIRE (semplificato)
│       └── stripe/
│           └── connect/
│               ├── onboard/
│               │   └── route.ts      ← NUOVO (avvia onboarding coach)
│               ├── status/
│               │   └── route.ts      ← NUOVO (verifica stato account)
│               ├── refresh/
│               │   └── route.ts      ← NUOVO (rigenera link scaduto)
│               └── dashboard/
│                   └── route.ts      ← NUOVO (link a Stripe Express)
└── components/
    └── coach/
        └── StripeConnectSetup.tsx    ← NUOVO (UI per coach settings)
```

## 🚀 Passaggi di integrazione

### 1. Copia i file API

```bash
# Crea le nuove cartelle
mkdir -p src/app/api/stripe/connect/onboard
mkdir -p src/app/api/stripe/connect/status
mkdir -p src/app/api/stripe/connect/refresh
mkdir -p src/app/api/stripe/connect/dashboard

# Copia i file (o sostituisci manualmente)
```

### 2. Sostituisci checkout e webhook

⚠️ **IMPORTANTE**: Fai backup dei file esistenti prima di sostituirli!

```bash
# Backup
cp src/app/api/checkout/route.ts src/app/api/checkout/route.ts.backup
cp src/app/api/webhooks/stripe/route.ts src/app/api/webhooks/stripe/route.ts.backup
```

### 3. Aggiungi il componente UI

Copia `StripeConnectSetup.tsx` in `src/components/coach/`

Poi usalo nella pagina settings del coach:

```tsx
// src/app/coach/settings/page.tsx

import StripeConnectSetup from '@/components/coach/StripeConnectSetup'

export default function CoachSettingsPage() {
  return (
    <div className="space-y-6">
      {/* ... altre impostazioni ... */}
      
      <StripeConnectSetup />
      
      {/* ... altre impostazioni ... */}
    </div>
  )
}
```

### 4. Aggiorna Firebase Security Rules

Aggiungi regole per `coachStripeAccounts`:

```javascript
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... altre regole ...
    
    // Coach Stripe Accounts - solo il coach può leggere il suo
    match /coachStripeAccounts/{coachId} {
      allow read: if request.auth != null && request.auth.uid == coachId;
      allow write: if false; // Solo da server/webhook
    }
    
    // Transactions - solo lettura per admin
    match /transactions/{transactionId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if false; // Solo da webhook
    }
  }
}
```

## ⚙️ Configurazione Stripe

### Dashboard Stripe

1. Vai su https://dashboard.stripe.com/settings/connect
2. Abilita "Express accounts" per l'Italia
3. Configura il branding (logo, colori, nome)
4. Imposta le fee (opzionale - puoi anche farlo via API)

### Webhook

Aggiungi questi eventi al webhook esistente:

```
account.updated
```

URL webhook rimane: `https://www.coachami.it/api/webhooks/stripe`

## 🧪 Test in ambiente di sviluppo

### 1. Usa Stripe Test Mode

Assicurati di usare le chiavi test (`sk_test_...`, `pk_test_...`)

### 2. Crea un account coach test

```bash
# Stripe CLI per testare webhook in locale
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 3. Testa il flusso completo

1. Coach va su `/coach/settings`
2. Clicca "Configura con Stripe"
3. Completa l'onboarding (usa dati test di Stripe)
4. Torna su CoachaMi
5. Coachee acquista una sessione
6. Verifica che lo split avvenga automaticamente

### Dati test Stripe

- **Carta**: 4242 4242 4242 4242
- **Scadenza**: qualsiasi data futura
- **CVC**: qualsiasi 3 cifre
- **CAP**: qualsiasi 5 cifre

## 📊 Differenze rispetto al Modello A

| Aspetto | Modello A (prima) | Modello B (Stripe Connect) |
|---------|-------------------|---------------------------|
| Chi incassa | CoachaMi | Coach (direttamente) |
| Split 70/30 | Manuale (bonifico) | Automatico (Stripe) |
| Payout coach | Ogni lunedì (manuale) | Automatico da Stripe |
| Fatturazione | Complessa | Coach fattura diretto |
| Collection Firebase | `pendingPayouts` | `transactions` (solo log) |
| Complessità admin | Alta | Bassa |

## 🔄 Migrazione coach esistenti

I coach esistenti dovranno:

1. Ricevere email che spiega il nuovo sistema
2. Andare su `/coach/settings`
3. Completare l'onboarding Stripe (5-10 min)
4. Iniziare a ricevere pagamenti automatici

Finché un coach non completa l'onboarding, i suoi coachee vedranno un messaggio di errore al checkout.

## ❓ FAQ

**Q: Cosa succede ai `pendingPayouts` esistenti?**
A: Vanno gestiti manualmente con il vecchio sistema. I nuovi pagamenti useranno Stripe Connect.

**Q: Il coach deve avere P.IVA?**
A: Dipende dal regime fiscale del coach. Stripe accetta anche privati, ma per attività continuativa serve P.IVA.

**Q: Quanto tempo serve per la verifica Stripe?**
A: Di solito 1-2 giorni lavorativi. A volte è istantaneo.

**Q: Posso cambiare la percentuale (70/30)?**
A: Sì, modifica `PLATFORM_FEE_PERCENT` in `/api/checkout/route.ts`

---

## 📞 Supporto

Per problemi con l'integrazione, contatta: debora.carofiglio@gmail.com
