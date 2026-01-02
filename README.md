# CoachMatch - Piattaforma di Matching Coach-Coachee

Una web app in italiano per il matching tra coachee e coach certificati.

## 🚀 Features

- **Onboarding guidato**: Valutazione delle 8 aree della vita con grafico radar
- **Selezione obiettivi**: Per ogni area con punteggio basso
- **Matching intelligente**: Algoritmo AI (Google Gemini) per trovare i 3 coach più adatti
- **Prenotazione call**: Sistema di calendario custom per prenotare call gratuite
- **Dashboard utente**: Panoramica completa con aree della vita e prossime call
- **Registrazione coach**: Form multi-step con specializzazioni e disponibilità
- **Community**: Sezione membership con canali per area della vita 

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Auth**: Firebase Authentication
- **Database**: Firebase Firestore
- **AI**: Google Generative AI (Gemini)
- **Payments**: Stripe
- **Hosting**: Vercel

## 📦 Installazione Locale

```bash
# Clona il repository
git clone https://github.com/tuo-username/coaching-platform.git
cd coaching-platform

# Installa le dipendenze
npm install

# Copia il file di environment
cp .env.example .env.local

# Modifica .env.local con le tue chiavi API

# Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

## 🚀 Deploy su Vercel

### Opzione 1: Deploy rapido (consigliato)

1. Vai su [vercel.com](https://vercel.com) e accedi con GitHub
2. Clicca "Add New Project"
3. Importa il repository
4. Aggiungi le variabili d'ambiente (vedi sotto)
5. Clicca "Deploy"

### Opzione 2: Deploy via CLI

```bash
# Installa Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### Variabili d'Ambiente su Vercel

Vai in Project Settings > Environment Variables e aggiungi:

| Variabile | Descrizione |
|-----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `GOOGLE_AI_API_KEY` | Google AI Studio API Key |
| `STRIPE_SECRET_KEY` | Stripe Secret Key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Publishable Key |

## 🔧 Configurazione Servizi

### Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Crea un nuovo progetto
3. Abilita Authentication (Email/Password + Google)
4. Crea un database Firestore
5. Copia le credenziali in `.env.local`

### Google AI Studio

1. Vai su [Google AI Studio](https://aistudio.google.com)
2. Crea una API Key
3. Copia la chiave in `GOOGLE_AI_API_KEY`

### Stripe

1. Vai su [Stripe Dashboard](https://dashboard.stripe.com)
2. Copia le chiavi API (test mode per sviluppo)
3. Configura un webhook per gli eventi di pagamento

## 📁 Struttura Progetto

```
src/
├── app/                    # App Router pages
│   ├── page.tsx           # Landing page
│   ├── onboarding/        # Flusso onboarding
│   ├── matching/          # Pagina match coach
│   ├── booking/           # Prenotazione call
│   ├── dashboard/         # Dashboard utente
│   ├── login/             # Login
│   └── coach/             # Area coach
├── components/            # Componenti React
├── contexts/              # React Context (Auth, Onboarding)
├── lib/                   # Utilities (Firebase, Gemini)
├── types/                 # TypeScript types
└── hooks/                 # Custom hooks
```

## 🎨 Aree della Vita

| Area | Colore | Icona |
|------|--------|-------|
| Carriera | Indigo | Briefcase |
| Benessere | Emerald | Heart |
| Famiglia | Amber | Users |
| Denaro | Teal | Wallet |
| Amore | Pink | HeartHandshake |
| Fiducia | Violet | Shield |
| Scopo | Orange | Target |
| Focus | Blue | Zap |

## 📝 TODO per MVP

- [ ] Implementare pagamenti Stripe per membership
- [ ] Aggiungere notifiche email (SendGrid/Resend)
- [ ] Completare dashboard coach
- [ ] Aggiungere sistema di review
- [ ] Implementare chat real-time nella community
- [ ] Admin dashboard

## 📄 License

MIT
