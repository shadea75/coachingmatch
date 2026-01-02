import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { OnboardingProvider } from '@/contexts/OnboardingContext'

export const metadata: Metadata = {
  title: 'CoachMatch | Trova il coach giusto per te',
  description: 'Piattaforma di matching tra coachee e coach certificati. Valuta le aree della tua vita, definisci i tuoi obiettivi e incontra 3 coach selezionati per te.',
  keywords: 'coaching, life coaching, business coaching, crescita personale, sviluppo professionale',
  authors: [{ name: 'CoachMatch' }],
  openGraph: {
    title: 'CoachMatch | Trova il coach giusto per te',
    description: 'Piattaforma di matching tra coachee e coach certificati.',
    type: 'website',
    locale: 'it_IT',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className="antialiased">
        <AuthProvider>
          <OnboardingProvider>
            {children}
          </OnboardingProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
