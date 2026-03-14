import Link from 'next/link'
import Logo from '@/components/Logo'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy — CoachaMi',
  description: 'Informativa sull\'utilizzo dei cookie su CoachaMi.',
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/"><Logo size="sm" /></Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-charcoal transition-colors">← Torna alla home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 space-y-8">

          <div className="border-b border-gray-100 pb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-3">Cookie Policy</h1>
            <p className="text-gray-500 text-sm">Ultimo aggiornamento: marzo 2026 — CoachaMi, P.IVA IT02411430685</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-charcoal">Cosa sono i cookie</h2>
            <p className="text-gray-600 leading-relaxed">
              I cookie sono piccoli file di testo che i siti web salvano nel browser dell'utente durante la navigazione. Servono a far funzionare il sito correttamente, a ricordare le preferenze dell'utente e, con il consenso, a raccogliere dati statistici e di marketing.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-charcoal">Cookie utilizzati da CoachaMi</h2>

            <div className="space-y-3">
              {[
                {
                  category: 'Cookie tecnici e necessari',
                  badge: 'Sempre attivi',
                  badgeColor: 'bg-green-100 text-green-700',
                  desc: 'Indispensabili per il funzionamento del sito. Gestiscono l\'autenticazione, la sessione utente e le preferenze di base. Non richiedono consenso.',
                  examples: 'Firebase Auth session, preferenze lingua, token di sessione',
                },
                {
                  category: 'Cookie analitici',
                  badge: 'Richiedono consenso',
                  badgeColor: 'bg-amber-100 text-amber-700',
                  desc: 'Raccolgono dati anonimi sul comportamento degli utenti per migliorare il sito. Utilizziamo Google Analytics (GA4).',
                  examples: 'Google Analytics (_ga, _gid, _gat)',
                },
                {
                  category: 'Cookie di marketing',
                  badge: 'Richiedono consenso',
                  badgeColor: 'bg-amber-100 text-amber-700',
                  desc: 'Utilizzati per mostrare annunci pertinenti agli utenti. Utilizziamo Google Ads.',
                  examples: 'Google Ads (AW-17946914930), _gcl_au',
                },
              ].map((c, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-charcoal">{c.category}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badgeColor}`}>{c.badge}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.desc}</p>
                  <p className="text-xs text-gray-400">Esempi: {c.examples}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-charcoal">Come gestire i cookie</h2>
            <p className="text-gray-600 leading-relaxed">
              Puoi gestire le tue preferenze sui cookie in qualsiasi momento cliccando sul banner che compare al primo accesso al sito. Puoi anche modificare le impostazioni del tuo browser per bloccare o eliminare i cookie. Tieni presente che disabilitare i cookie tecnici potrebbe compromettere il funzionamento del sito.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Per maggiori informazioni su come Google utilizza i dati, consulta:{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                policies.google.com/privacy
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-charcoal">Contatti</h2>
            <p className="text-gray-600 leading-relaxed">
              Per qualsiasi domanda relativa alla presente Cookie Policy, scrivi a{' '}
              <a href="mailto:coachami@coachami.it" className="text-primary-500 hover:underline">coachami@coachami.it</a>.
            </p>
          </section>

        </div>
      </main>

      <footer className="py-8 px-4 border-t border-gray-100 bg-white mt-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <p>CoachaMi — un'idea di Debora Carofiglio — P.IVA IT02411430685</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-charcoal transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-charcoal transition-colors">Termini di Servizio</Link>
            <Link href="/codice-etico" className="hover:text-charcoal transition-colors">Codice Etico</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
