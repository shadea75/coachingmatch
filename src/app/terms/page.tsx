'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Logo from '@/components/Logo'

export default function TermsPage() {
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
              Termini di Servizio
            </h1>
            <p className="text-gray-500 mb-8">Ultimo aggiornamento: Gennaio 2025</p>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">1. Accettazione dei Termini</h2>
              <p className="text-gray-600 mb-4">
                Utilizzando la piattaforma CoachaMi, accetti di essere vincolato dai presenti Termini di Servizio. 
                Se non accetti questi termini, ti preghiamo di non utilizzare il servizio.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">2. Descrizione del Servizio</h2>
              <p className="text-gray-600 mb-4">
                CoachaMi è una piattaforma che mette in contatto persone (Coachee) con coach professionisti certificati. 
                Il servizio include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Questionario di autovalutazione basato sulla "Ruota della Vita"</li>
                <li>Algoritmo di matching per trovare il coach più adatto</li>
                <li>Prenotazione di sessioni di coaching</li>
                <li>Sistema di pagamento sicuro</li>
              </ul>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">3. Registrazione e Account</h2>
              <p className="text-gray-600 mb-4">Per utilizzare CoachaMi devi:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Avere almeno 18 anni</li>
                <li>Fornire informazioni accurate e veritiere</li>
                <li>Mantenere la riservatezza delle tue credenziali di accesso</li>
                <li>Notificarci immediatamente in caso di accesso non autorizzato</li>
              </ul>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">4. Ruolo di CoachaMi</h2>
              <p className="text-gray-600 mb-4">
                CoachaMi agisce esclusivamente come intermediario tra Coachee e Coach. Non siamo responsabili per:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>La qualità delle sessioni di coaching</li>
                <li>I risultati ottenuti dal percorso di coaching</li>
                <li>Controversie tra Coachee e Coach</li>
                <li>Consigli o indicazioni forniti dai Coach</li>
              </ul>
              <p className="text-gray-600 mb-4">
                Il coaching non è terapia psicologica né consulenza medica. Per problematiche di salute mentale, 
                ti invitiamo a rivolgerti a professionisti sanitari qualificati.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">5. Obblighi dei Coachee</h2>
              <p className="text-gray-600 mb-4">Come Coachee ti impegni a:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Partecipare alle sessioni prenotate o cancellare con almeno 24 ore di anticipo</li>
                <li>Comportarti in modo rispettoso con i Coach</li>
                <li>Non richiedere servizi che esulano dal coaching</li>
                <li>Effettuare i pagamenti dovuti puntualmente</li>
              </ul>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">6. Obblighi dei Coach</h2>
              <p className="text-gray-600 mb-4">I Coach presenti sulla piattaforma si impegnano a:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Possedere certificazioni valide e verificabili</li>
                <li>Mantenere standard professionali elevati</li>
                <li>Rispettare il codice etico del coaching</li>
                <li>Onorare gli appuntamenti confermati</li>
                <li>Mantenere la riservatezza delle informazioni condivise dai Coachee</li>
              </ul>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">7. Pagamenti e Commissioni</h2>
              <p className="text-gray-600 mb-4">
                I pagamenti per le sessioni di coaching vengono elaborati in modo sicuro attraverso la piattaforma. 
                CoachaMi trattiene una commissione del 30% su ogni sessione prenotata. 
                I prezzi delle sessioni sono stabiliti dai singoli Coach.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">8. Cancellazioni e Rimborsi</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>Cancellazione oltre 24h prima:</strong> rimborso completo</li>
                <li><strong>Cancellazione entro 24h:</strong> nessun rimborso</li>
                <li><strong>No-show:</strong> nessun rimborso</li>
                <li><strong>Cancellazione da parte del Coach:</strong> rimborso completo o riprogrammazione gratuita</li>
              </ul>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">9. Proprietà Intellettuale</h2>
              <p className="text-gray-600 mb-4">
                Tutti i contenuti della piattaforma CoachaMi (logo, testi, grafica, software) sono di nostra proprietà 
                o dei rispettivi licenzianti e sono protetti dalle leggi sul diritto d'autore.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">10. Limitazione di Responsabilità</h2>
              <p className="text-gray-600 mb-4">
                CoachaMi non sarà responsabile per danni indiretti, incidentali, speciali o consequenziali 
                derivanti dall'uso o dall'impossibilità di utilizzare il servizio. La nostra responsabilità 
                massima è limitata all'importo pagato per il servizio negli ultimi 12 mesi.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">11. Sospensione e Terminazione</h2>
              <p className="text-gray-600 mb-4">
                Ci riserviamo il diritto di sospendere o terminare il tuo account in caso di:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Violazione dei presenti Termini</li>
                <li>Comportamento fraudolento o abusivo</li>
                <li>Mancato pagamento</li>
                <li>Richiesta dell'utente</li>
              </ul>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">12. Modifiche ai Termini</h2>
              <p className="text-gray-600 mb-4">
                Possiamo modificare questi Termini in qualsiasi momento. Le modifiche saranno comunicate 
                via email o tramite avviso sulla piattaforma. L'uso continuato del servizio dopo le modifiche 
                costituisce accettazione dei nuovi Termini.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">13. Legge Applicabile</h2>
              <p className="text-gray-600 mb-4">
                I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia sarà 
                competente il Foro di Milano.
              </p>

              <h2 className="text-xl font-semibold text-charcoal mt-8 mb-4">14. Contatti</h2>
              <p className="text-gray-600 mb-4">
                Per domande relative ai presenti Termini di Servizio, contattaci a:
              </p>
              <p className="text-gray-600">
                <strong>Email:</strong> <a href="mailto:legal@coachami.it" className="text-primary-500 hover:underline">legal@coachami.it</a>
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
