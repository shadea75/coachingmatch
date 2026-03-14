import Link from 'next/link'
import Logo from '@/components/Logo'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Codice Etico del Coaching — CoachaMi',
  description: 'Il Codice Etico di CoachaMi stabilisce gli standard di comportamento professionale per tutti i coach iscritti alla piattaforma.',
}

export default function CodiceEticoPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/"><Logo size="sm" /></Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-charcoal transition-colors">← Torna alla home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 space-y-10">

          {/* Titolo */}
          <div className="border-b border-gray-100 pb-8">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              🤝 Documento ufficiale
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-3">
              Codice Etico del Coaching
            </h1>
            <p className="text-gray-500 text-sm">
              CoachaMi — versione in vigore dal 1° gennaio 2025 — adottato da tutti i coach iscritti alla piattaforma
            </p>
          </div>

          {/* Premessa */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-charcoal">Premessa</h2>
            <p className="text-gray-600 leading-relaxed">
              CoachaMi è una piattaforma che connette coach professionisti con persone in cerca di supporto per la propria crescita personale e professionale. 
              La fiducia è il fondamento di ogni relazione di coaching: per questo motivo ogni coach iscritto a CoachaMi si impegna a rispettare il presente Codice Etico, 
              ispirato ai principi del Codice Deontologico ICF (International Coaching Federation) e allineato alla normativa europea GDPR.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Il rispetto di questo codice è condizione necessaria per essere presenti sulla piattaforma e per mantenere il rapporto di fiducia con i coachee, con CoachaMi e con la comunità professionale del coaching italiano.
            </p>
          </section>

          {/* Art. 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-charcoal">Art. 1 — Integrità e onestà professionale</h2>
            <ul className="space-y-3 text-gray-600">
              {[
                'Il coach si presenta in modo veritiero, descrivendo la propria formazione, certificazioni ed esperienza senza esagerazioni o informazioni fuorvianti.',
                'Il coach non esercita attività per le quali non è qualificato. In caso di necessità, indirizza il coachee verso altri professionisti (psicologo, medico, consulente legale).',
                'Il coach non promette risultati specifici garantiti: il coaching supporta il coachee nel raggiungere i propri obiettivi, ma i risultati dipendono dall\'impegno e dalle circostanze individuali.',
                'Il coach non usa il proprio ruolo per influenzare il coachee a favore di terze parti, prodotti o servizi senza una dichiarazione esplicita di conflitto di interessi.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Art. 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-charcoal">Art. 2 — Riservatezza e privacy</h2>
            <ul className="space-y-3 text-gray-600">
              {[
                'Il coach mantiene la massima riservatezza su tutte le informazioni condivise dal coachee nel corso delle sessioni, salvo obbligo di legge o rischio imminente per la sicurezza della persona.',
                'Il coach non condivide, pubblica o utilizza a fini personali o commerciali informazioni riguardanti i coachee senza esplicito consenso scritto.',
                'Il coach gestisce i dati personali dei coachee nel rispetto del Regolamento UE 2016/679 (GDPR) e della normativa italiana sulla privacy.',
                'Le conversazioni e i contenuti scambiati attraverso la piattaforma CoachaMi sono riservati e non possono essere estratti o diffusi al di fuori del contesto della relazione di coaching.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Art. 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-charcoal">Art. 3 — Rispetto del coachee</h2>
            <ul className="space-y-3 text-gray-600">
              {[
                'Il coach riconosce e rispetta l\'autonomia del coachee: ogni decisione appartiene al coachee. Il coach non impone soluzioni, non dirige le scelte e non giudica.',
                'Il coach non discrimina per motivi di genere, età, orientamento sessuale, religione, etnia, nazionalità, disabilità o condizione socioeconomica.',
                'Il coach crea uno spazio sicuro e privo di giudizio in cui il coachee possa esprimersi liberamente.',
                'Il coach riconosce i propri limiti e, quando necessario, suggerisce al coachee di consultare altri professionisti della salute mentale o del benessere.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Art. 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-charcoal">Art. 4 — Professionalità e aggiornamento continuo</h2>
            <ul className="space-y-3 text-gray-600">
              {[
                'Il coach si impegna a mantenere e migliorare costantemente le proprie competenze attraverso formazione continua, supervisione e mentoring.',
                'Il coach è consapevole dei propri bias e lavora attivamente per non lasciarli influenzare la relazione di coaching.',
                'Il coach partecipa attivamente alla comunità professionale di CoachaMi con contributi autentici e di valore.',
                'Il coach si sottopone periodicamente a supervisione professionale come strumento di crescita e garanzia di qualità.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Art. 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-charcoal">Art. 5 — Rapporto con CoachaMi e con la community</h2>
            <ul className="space-y-3 text-gray-600">
              {[
                'Il coach non tenta di portare i coachee incontrati tramite CoachaMi fuori dalla piattaforma per aggirare il sistema di pagamento, salvo accordi espliciti con CoachaMi.',
                'Il coach non usa la piattaforma per diffondere contenuti fuorvianti, spam, materiale pubblicitario non pertinente o informazioni false.',
                'Il coach mantiene un comportamento rispettoso e costruttivo nelle interazioni con altri coach, con i coachee e con lo staff di CoachaMi.',
                'Il coach segnala a CoachaMi qualsiasi comportamento non etico di cui venga a conoscenza all\'interno della piattaforma.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Art. 6 */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-charcoal">Art. 6 — Gestione dei conflitti e delle segnalazioni</h2>
            <p className="text-gray-600 leading-relaxed">
              In caso di violazione del presente Codice Etico, CoachaMi si riserva il diritto di:
            </p>
            <ul className="space-y-2 text-gray-600 ml-4">
              {[
                'richiedere chiarimenti al coach interessato;',
                'sospendere temporaneamente il profilo del coach in attesa di verifiche;',
                'rimuovere definitivamente il coach dalla piattaforma in caso di violazioni gravi o reiterate.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary-500 font-bold">—</span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed">
              I coachee e i coach possono segnalare comportamenti non etici scrivendo a{' '}
              <a href="mailto:coachami@coachami.it" className="text-primary-500 hover:underline font-medium">
                coachami@coachami.it
              </a>.
              Ogni segnalazione sarà gestita con riservatezza.
            </p>
          </section>

          {/* Accettazione */}
          <section className="bg-primary-50 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-serif font-bold text-charcoal">Accettazione del Codice Etico</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Completando la registrazione su CoachaMi, ogni coach dichiara di aver letto, compreso e accettato integralmente il presente Codice Etico. 
              L'accettazione è condizione indispensabile per operare sulla piattaforma.
            </p>
            <p className="text-gray-500 text-xs">
              Ultimo aggiornamento: gennaio 2025. CoachaMi si riserva il diritto di aggiornare periodicamente il presente documento. 
              I coach iscritti saranno notificati via email di eventuali modifiche sostanziali.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100 bg-white mt-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <p>CoachaMi — un'idea di Debora Carofiglio — P.IVA IT02411430685</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-charcoal transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-charcoal transition-colors">Termini di Servizio</Link>
            <Link href="/cookie-policy" className="hover:text-charcoal transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
