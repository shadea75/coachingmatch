import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { OnboardingProvider } from '@/contexts/OnboardingContext'

export const metadata: Metadata = {
  title: 'CoachaMi | Trova il coach giusto per te',
  description: 'Piattaforma di matching tra coachee e coach certificati. Valuta le aree della tua vita, definisci i tuoi obiettivi e incontra 3 coach selezionati per te.',
  keywords: 'coaching, life coaching, business coaching, crescita personale, sviluppo professionale, coachami',
  authors: [{ name: 'CoachaMi' }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'CoachaMi | Trova il coach giusto per te',
    description: 'Piattaforma di matching tra coachee e coach certificati.',
    type: 'website',
    locale: 'it_IT',
  },
}
import Script from 'next/script'

// ... nel return del layout, subito dopo <html> o dentro <head>:

<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-581C4X09C7"
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-581C4X09C7');
  `}
</Script>
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
