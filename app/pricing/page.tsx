'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, Sparkles, ChevronDown } from 'lucide-react'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    icon: '🌱',
    title: 'Muovi i primi passi',
    description: 'Perfetto per chi vuole esplorare la piattaforma e farsi conoscere',
    monthlyPrice: 9,
    annualPrice: 7,
    annualTotal: 84,
    annualSavings: 108,
    ctaStyle: 'outline' as const,
    featuresLabel: 'Cosa include',
    features: [
      'Profilo coach sulla piattaforma',
      'Matching con coachee (max 5/mese)',
      'Calendario e gestione disponibilità',
      'Pagamenti integrati (Stripe)',
      'Accesso Community Coach Corner',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: '🚀',
    title: 'Cresci con costanza',
    description: 'Per chi vuole acquisire clienti e gestire il business in modo strutturato',
    monthlyPrice: 29,
    annualPrice: 24,
    annualTotal: 288,
    annualSavings: 348,
    popular: true,
    ctaStyle: 'primary' as const,
    featuresLabel: 'Tutto di Starter, più',
    features: [
      'Matching illimitato con coachee',
      { text: 'Ufficio Virtuale completo', isNew: true },
      'Gestione clienti esterni (CRM)',
      'Offerte e percorsi personalizzati',
      'Google Calendar sync',
      'Report guadagni mensili',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: '💼',
    title: 'Scala il tuo business',
    description: 'Per coach affermati che vogliono strumenti avanzati e più visibilità',
    monthlyPrice: 49,
    annualPrice: 41,
    annualTotal: 492,
    annualSavings: 588,
    ctaStyle: 'outline' as const,
    featuresLabel: 'Tutto di Professional, più',
    features: [
      'Badge "Coach Verificato" ✦',
      { text: 'Fatturazione elettronica (SDI)', isNew: true },
      'Vendita prodotti digitali (commissione configurabile)',
      'Contrattualistica automatica',
      'Statistiche avanzate e analytics',
      'Supporto prioritario',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    icon: '👑',
    title: 'Il massimo, sempre',
    description: 'Per i top coach che vogliono ogni vantaggio e la massima esclusività',
    monthlyPrice: 79,
    annualPrice: 66,
    annualTotal: 792,
    annualSavings: 948,
    elite: true,
    ctaStyle: 'elite' as const,
    featuresLabel: 'Tutto di Business, più',
    features: [
      'Commissione ridotta: 20% (invece di 30%)',
      'Boost visibilità da engagement Community',
      'Pagina profilo personalizzata premium',
      'Pubblicazione articoli sul blog',
      'Webinar e masterclass sulla piattaforma',
      'Account manager dedicato',
      'Early access nuove funzionalità',
    ],
  },
]

const faqs = [
  {
    q: 'Posso cambiare piano in qualsiasi momento?',
    a: 'Certo! Puoi fare upgrade o downgrade quando vuoi. Se fai upgrade, paghi solo la differenza. Se fai downgrade, il cambio avviene alla fine del periodo di fatturazione corrente.',
  },
  {
    q: 'C\'è un periodo di prova gratuito?',
    a: 'Sì! Tutti i piani includono 14 giorni di prova gratuita. Nessun addebito fino alla fine del trial, e puoi cancellare in qualsiasi momento.',
  },
  {
    q: 'Come funziona la commissione sulle sessioni?',
    a: 'Per ogni sessione a pagamento che un coachee prenota con te tramite la piattaforma, tratteniamo il 30% (o 20% con piano Elite). I clienti che gestisci nel tuo Ufficio Virtuale ma che non passano dalla piattaforma non hanno commissioni.',
  },
  {
    q: 'Cosa succede ai miei clienti se cancello l\'abbonamento?',
    a: 'I tuoi dati restano al sicuro per 30 giorni dopo la cancellazione. I percorsi attivi con i coachee vengono completati normalmente. Puoi esportare i tuoi dati in qualsiasi momento.',
  },
  {
    q: 'Posso usare CoachaMi anche per clienti che trovo fuori dalla piattaforma?',
    a: 'Assolutamente sì! Dal piano Professional in su, l\'Ufficio Virtuale ti permette di gestire anche clienti esterni — agenda, note, sessioni, pagamenti. È il tuo strumento di lavoro completo, senza commissioni sui clienti esterni.',
  },
  {
    q: 'Come funziona la fatturazione elettronica?',
    a: 'Col piano Business ed Elite, puoi generare fatture elettroniche conformi al Sistema di Interscambio (SDI) direttamente dalla piattaforma. Basta inserire i tuoi dati fiscali e la fattura viene inviata automaticamente dopo ogni pagamento.',
  },
]

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <Sparkles className="text-white" size={18} />
          </div>
          <span className="font-display text-xl font-bold text-charcoal">CoachaMi</span>
        </Link>
        <Link
          href="/coach/apply"
        >
          Candidati come Coach →
        </Link>
      </header>

      {/* Hero */}
      <section className="text-center px-6 pt-16 pb-8 relative overflow-hidden">
        <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(236,119,17,0.06)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 bg-white border border-primary-200/40 px-5 py-2 rounded-full text-xs font-semibold text-primary-600 uppercase tracking-wider mb-7 animate-fade-in">
          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse-soft" />
          Piani per Coach Professionisti
        </div>
        
        <h1 className="font-display text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.15] mb-5 animate-slide-up text-charcoal">
          Il tuo business di coaching,<br />
          <em className="text-primary-500 italic">senza limiti</em>
        </h1>
        
        <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed animate-slide-up">
          Scegli il piano giusto per te. Trova clienti, gestisci l&apos;agenda, incassa e cresci — tutto da un&apos;unica piattaforma.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mt-10 mb-12 animate-slide-up">
          <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-charcoal' : 'text-gray-400'}`}>
            Mensile
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`w-14 h-[30px] rounded-full relative transition-colors ${isAnnual ? 'bg-primary-500' : 'bg-primary-300'}`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full absolute top-[3px] shadow-md transition-transform duration-300 ${
                isAnnual ? 'translate-x-[29px]' : 'translate-x-[3px]'
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)' }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-charcoal' : 'text-gray-400'}`}>
            Annuale
          </span>
          <span
            className={`text-xs font-bold text-white bg-emerald-500 px-3 py-1 rounded-full transition-all duration-300 ${
              isAnnual ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            Risparmi 2 mesi!
          </span>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="max-w-[1280px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`
                rounded-3xl p-8 relative border-[1.5px] transition-all duration-500 hover:-translate-y-1
                ${plan.popular
                  ? 'border-primary-500 bg-gradient-to-b from-orange-50/60 to-white scale-[1.03] shadow-[0_16px_48px_rgba(236,119,17,0.12)] hover:shadow-[0_24px_64px_rgba(236,119,17,0.18)]'
                  : plan.elite
                    ? 'border-transparent bg-charcoal text-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.2)]'
                    : 'border-black/[0.06] bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]'
                }
              `}
              style={{ animationDelay: `${0.15 + index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                  ⭐ Più scelto
                </div>
              )}

              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] mb-5 ${
                  plan.elite
                    ? 'bg-white/10'
                    : index === 0
                      ? 'bg-emerald-50'
                      : index === 1
                        ? 'bg-orange-50'
                        : 'bg-blue-50'
                }`}
              >
                {plan.icon}
              </div>

              {/* Name & Title */}
              <div className={`text-[13px] font-bold uppercase tracking-[1.5px] mb-1 ${plan.elite ? 'text-white/50' : 'text-gray-400'}`}>
                {plan.name}
              </div>
              <h3 className="font-display text-[22px] font-semibold mb-2">{plan.title}</h3>
              <p className={`text-sm leading-relaxed mb-6 ${plan.elite ? 'text-white/50' : 'text-gray-400'}`}>
                {plan.description}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-base font-semibold mt-2">€</span>
                <span className="font-display text-5xl font-bold leading-none">
                  {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                <span className={`text-sm ${plan.elite ? 'text-white/40' : 'text-gray-400'}`}>/mese</span>
              </div>
              <div className={`text-[13px] mb-6 h-5 ${plan.elite ? 'text-white/35' : 'text-gray-400'}`}>
                {isAnnual ? `€${plan.annualTotal}/anno (invece di €${plan.annualSavings})` : '\u00A0'}
              </div>

              {/* CTA */}
              <Link
                href={`/coach/apply?plan=${plan.id}`}
                className={`
                  block w-full py-3.5 rounded-[14px] text-center text-[15px] font-semibold transition-all duration-300 mb-7
                  ${plan.ctaStyle === 'primary'
                    ? 'bg-primary-500 text-white shadow-[0_4px_16px_rgba(236,119,17,0.3)] hover:bg-primary-600 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(236,119,17,0.4)]'
                    : plan.ctaStyle === 'elite'
                      ? 'bg-white text-charcoal hover:bg-amber-50'
                      : 'border-[1.5px] border-black/10 text-charcoal hover:border-charcoal hover:bg-charcoal hover:text-white'
                  }
                `}
              >
                Inizia ora
              </Link>

              {/* Features */}
              <div className={`h-px mb-6 ${plan.elite ? 'bg-white/10' : 'bg-black/[0.06]'}`} />
              <div className={`text-xs font-bold uppercase tracking-[1px] mb-4 ${plan.elite ? 'text-white/40' : 'text-gray-400'}`}>
                {plan.featuresLabel}
              </div>
              <div className="space-y-3">
                {plan.features.map((feature, fi) => {
                  const text = typeof feature === 'string' ? feature : feature.text
                  const isNew = typeof feature === 'object' && feature.isNew
                  return (
                    <div key={fi} className="flex items-start gap-2.5 text-sm leading-[1.45]">
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] mt-0.5 ${
                          plan.elite
                            ? 'bg-amber-500/15 text-amber-400'
                            : index === 0
                              ? 'bg-emerald-50 text-emerald-500'
                              : index === 1
                                ? 'bg-orange-50 text-primary-500'
                                : 'bg-blue-50 text-blue-500'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>
                        {text}
                        {isNew && (
                          <span className={`inline-block ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold align-middle ${
                            plan.elite ? 'bg-amber-500/20 text-amber-400' : 'bg-primary-200 text-primary-700'
                          }`}>
                            NEW
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Commission Section */}
      <section className="max-w-3xl mx-auto px-6 mb-20">
        <div className="bg-white rounded-[20px] p-10 border-[1.5px] border-black/[0.06] text-center">
          <h2 className="font-display text-2xl font-semibold mb-3">Come funzionano i guadagni</h2>
          <p className="text-gray-400 text-[15px] leading-relaxed mb-7">
            Per ogni sessione a pagamento prenotata tramite CoachaMi, tratteniamo solo una piccola commissione. Il resto è tutto tuo.
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="font-display text-[42px] font-bold text-emerald-500">70%</div>
              <div className="text-[13px] text-gray-400 mt-1">A te, coach</div>
            </div>
            <div className="text-2xl text-gray-200">→</div>
            <div className="text-center">
              <div className="font-display text-[42px] font-bold text-primary-300">30%</div>
              <div className="text-[13px] text-gray-400 mt-1">Piattaforma</div>
            </div>
          </div>
          <p className="mt-5 text-[13px] text-gray-400">
            Con il piano <strong className="text-amber-500">Elite</strong> la commissione scende al{' '}
            <strong className="text-emerald-500">20%</strong> — tieni l&apos;
            <strong className="text-emerald-500">80%</strong> dei tuoi guadagni.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 mb-24">
        <h2 className="font-display text-[32px] text-center mb-10 text-charcoal">Domande frequenti</h2>
        <div className="space-y-0">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border-b border-black/[0.08] cursor-pointer"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="flex justify-between items-center py-5">
                <span className="font-semibold text-base pr-4">{faq.q}</span>
                <ChevronDown
                  size={20}
                  className={`text-primary-500 flex-shrink-0 transition-transform duration-300 ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </div>
              <div
                className={`overflow-hidden transition-all duration-400 text-sm text-gray-400 leading-relaxed ${
                  openFaq === i ? 'max-h-[300px] pb-5' : 'max-h-0'
                }`}
              >
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-charcoal text-white text-center px-6 py-16 relative overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(236,119,17,0.12)_0%,transparent_70%)]" />
        <h2 className="font-display text-3xl md:text-[40px] mb-4 relative">
          Pronto a far crescere il tuo business?
        </h2>
        <p className="text-white/60 text-base mb-8 relative">
          Inizia con 14 giorni gratuiti. Nessuna carta di credito richiesta.
        </p>
        <Link
          href="/coach/apply"
        >
          Candidati come Coach
          <ArrowRight size={20} />
        </Link>
      </section>
    </div>
  )
}
