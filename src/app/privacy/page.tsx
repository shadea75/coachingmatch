'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Logo from '@/components/Logo'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-charcoal transition-colors">
            <ArrowLeft size={18} />
            Torna alla home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
            <h1 className="text-3xl font-display font-bold text-charcoal mb-2">
              Privacy Policy
            </h1>
            <p className="text-gray-500 mb-8">Ultimo aggiornamento: Gennaio 2025</p>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">1. Titolare del Trattamento</h2>
              <p className="text-gray-600 mb-4">
                Il titolare del trattamento dei dati personali è CoachaMi, con sede in Italia. 
                Per qualsiasi informazione relativa al trattamento dei tuoi dati personali, puoi contattarci all'indirizzo email: <a href="mailto:privacy@coachami.it" className="text-primary-500 hover:underline">privacy@coachami.it</a>
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">2. Dati Raccolti</h2>
              <p className="text-gray-600 mb-4">Raccogliamo i seguenti tipi di dati personali:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>Dati di registrazione:</strong> nome, cognome, indirizzo email, password</li>
                <li><strong>Dati del profilo:</strong> età, sesso, foto profilo (opzionali)</li>
                <li><strong>Dati di utilizzo:</strong> risposte al questionario sulla ruota della vita, obiettivi selezionati</li>
                <li><strong>Dati dei coach:</strong> certificazioni, esperienza professionale, disponibilità</li>
                <li><strong>Dati tecnici:</strong> indirizzo IP, tipo di browser, dispositivo utilizzato</li>
              </ul>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">3. Finalità del Trattamento</h2>
              <p className="text-gray-600 mb-4">I tuoi dati personali sono trattati per le seguenti finalità:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Creazione e gestione del tuo account</li>
                <li>Erogazione del servizio di matching con i coach</li>
                <li>Comunicazioni relative al servizio</li>
                <li>Miglioramento della piattaforma e dei servizi offerti</li>
                <li>Adempimento di obblighi legali</li>
              </ul>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">4. Base Giuridica</h2>
              <p className="text-gray-600 mb-4">
                Il trattamento dei tuoi dati si basa sul consenso che ci fornisci al momento della registrazione, 
                sull'esecuzione del contratto di servizio e sui nostri legittimi interessi nel migliorare la piattaforma.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">5. Conservazione dei Dati</h2>
              <p className="text-gray-600 mb-4">
                I tuoi dati personali saranno conservati per il tempo necessario a fornire i servizi richiesti 
                e comunque non oltre 5 anni dalla cessazione del rapporto contrattuale, salvo obblighi di legge.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">6. Condivisione dei Dati</h2>
              <p className="text-gray-600 mb-4">I tuoi dati possono essere condivisi con:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>Coach:</strong> le informazioni necessarie per il matching e le sessioni</li>
                <li><strong>Fornitori di servizi:</strong> hosting (Vercel), database (Firebase), email (Resend)</li>
                <li><strong>Autorità competenti:</strong> quando richiesto dalla legge</li>
              </ul>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">7. I Tuoi Diritti</h2>
              <p className="text-gray-600 mb-4">Hai il diritto di:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Accedere ai tuoi dati personali</li>
                <li>Rettificare dati inesatti</li>
                <li>Cancellare i tuoi dati ("diritto all'oblio")</li>
                <li>Limitare il trattamento</li>
                <li>Portabilità dei dati</li>
                <li>Opporti al trattamento</li>
                <li>Revocare il consenso in qualsiasi momento</li>
              </ul>
              <p className="text-gray-600 mb-4">
                Per esercitare i tuoi diritti, contattaci a: <a href="mailto:privacy@coachami.it" className="text-primary-500 hover:underline">privacy@coachami.it</a>
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">8. Cookie</h2>
              <p className="text-gray-600 mb-4">
                Utilizziamo cookie tecnici necessari per il funzionamento della piattaforma e cookie analitici 
                per comprendere come gli utenti utilizzano il servizio. Puoi gestire le preferenze sui cookie 
                attraverso le impostazioni del tuo browser.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">9. Sicurezza</h2>
              <p className="text-gray-600 mb-4">
                Adottiamo misure di sicurezza tecniche e organizzative appropriate per proteggere i tuoi dati 
                personali da accessi non autorizzati, perdita o distruzione. I dati sono trasmessi tramite 
                connessioni crittografate (HTTPS).
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">10. Modifiche alla Privacy Policy</h2>
              <p className="text-gray-600 mb-4">
                Ci riserviamo il diritto di modificare questa Privacy Policy in qualsiasi momento. 
                Le modifiche saranno pubblicate su questa pagina con indicazione della data di ultimo aggiornamento.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">11. Contatti</h2>
              <p className="text-gray-600 mb-4">
                Per qualsiasi domanda relativa a questa Privacy Policy o al trattamento dei tuoi dati personali, contattaci a:
              </p>
              <p className="text-gray-600">
                <strong>Email:</strong> <a href="mailto:privacy@coachami.it" className="text-primary-500 hover:underline">privacy@coachami.it</a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-400">
          © 2025 CoachaMi. Tutti i diritti riservati.
        </div>
      </footer>
    </div>
  )
}
