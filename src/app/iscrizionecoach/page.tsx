'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Check, ArrowRight, ChevronDown, Star, Users, TrendingUp,
  Calendar, FileText, CreditCard, Globe, Megaphone, Shield,
  Award, Zap, BookOpen, BarChart3, HeartHandshake, Sparkles
} from 'lucide-react'

const benefits = [
  {
    icon: Megaphone,
    color: '#F97316',
    bg: '#FFF7ED',
    title: 'Marketing a spese di CoachaMi',
    desc: 'Google Ads, Meta Ads, SEO e campagne social: li gestiamo noi. Tu ricevi clienti già interessati, senza investire un euro in pubblicità.',
  },
  {
    icon: Users,
    color: '#10B981',
    bg: '#F0FDF4',
    title: 'Ufficio Virtuale completo',
    desc: 'Agenda integrata, gestione clienti, contratti digitali, offerte personalizzate e pagamenti automatici — tutto in un unico posto.',
  },
  {
    icon: TrendingUp,
    color: '#6366F1',
    bg: '#EEF2FF',
    title: 'Lead qualificati ogni mese',
    desc: "Il nostro algoritmo abbina i tuoi coachee ideali in base alla tua specializzazione. Niente contatti freddi: solo persone già motivate.",
  },
  {
    icon: CreditCard,
    color: '#14B8A6',
    bg: '#F0FDFA',
    title: 'Pagamenti automatici e sicuri',
    desc: 'Stripe Connect accredita i tuoi guadagni in automatico dopo ogni sessione. Niente fatture manuali, niente inseguire i pagamenti.',
  },
  {
    icon: HeartHandshake,
    color: '#EC4899',
    bg: '#FDF2F8',
    title: 'Community esclusiva Coach',
    desc: 'Forum aperto a coach e coachee, discussioni pubbliche indicizzate su Google. Costruisci la tua reputazione professionale.',
  },
  {
    icon: Globe,
    color: '#F59E0B',
    bg: '#FFFBEB',
    title: 'Visibilità e reputazione',
    desc: 'Profilo indicizzato, recensioni verificate e badge certificazione. CoachaMi lavora per renderti riconoscibile nel mercato italiano.',
  },
]

const transformations = [
  { before: 'Cerchi clienti sui social ogni giorno', after: 'I clienti arrivano da te grazie al nostro marketing' },
  { before: 'Gestisci agenda, email e pagamenti su 5 tool diversi', after: 'Tutto in un unico ufficio virtuale intelligente' },
  { before: 'Fatturi manualmente e perdi tempo in burocrazia', after: 'Fatturazione automatica (anche elettronica SDI)' },
  { before: 'Lavori in isolamento, senza confronto professionale', after: 'Sei parte di una community di coach selezionati' },
  { before: 'Non sai quanto guadagnerai il mese prossimo', after: 'Flusso di clienti prevedibile e ricavi programmabili' },
]

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
      'Contrattualistica automatica',
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
      'Vendita prodotti digitali',
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
      'Account manager dedicato',
      'Early access nuove funzionalità',
    ],
  },
]

const faqs = [
  {
    q: 'Come vengono selezionati i coach?',
    a: "Ogni candidatura viene valutata manualmente dal team CoachaMi. Valutiamo certificazioni, esperienza, specializzazione e orientamento al cliente. Non è una directory aperta: ogni coach presente è stato approvato.",
  },
  {
    q: 'Posso cambiare piano in qualsiasi momento?',
    a: 'Certo! Puoi fare upgrade o downgrade quando vuoi. Se fai upgrade, paghi solo la differenza. Se fai downgrade, il cambio avviene alla fine del periodo corrente.',
  },
  {
    q: "C'è un periodo di prova gratuito?",
    a: 'Sì! Tutti i piani includono 14 giorni di prova gratuita. Nessun addebito fino alla fine del trial, e puoi cancellare in qualsiasi momento senza penali.',
  },
  {
    q: 'Come funziona la commissione sulle sessioni?',
    a: 'Per ogni sessione prenotata tramite la piattaforma, tratteniamo il 30% (o 20% con piano Elite). I clienti nel tuo Ufficio Virtuale che non passano dalla piattaforma non hanno commissioni.',
  },
  {
    q: 'Posso usare CoachaMi anche per clienti che trovo fuori dalla piattaforma?',
    a: "Sì! Dal piano Professional in su, l'Ufficio Virtuale ti permette di gestire anche clienti esterni — agenda, note, sessioni, pagamenti. Nessuna commissione su questi clienti.",
  },
  {
    q: 'Come funziona la fatturazione elettronica?',
    a: 'Col piano Business ed Elite, puoi generare fatture elettroniche conformi al Sistema di Interscambio (SDI) direttamente dalla piattaforma. Tutto automatico dopo ogni pagamento ricevuto.',
  },
]

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#FDFAF6]">

      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#D4A574] rounded-xl flex items-center justify-center">
            <Sparkles className="text-white" size={18} />
          </div>
          <span className="text-xl font-bold text-[#1a1a1a]">CoachaMi</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Accedi
          </Link>
          <Link href="/coach/apply" className="bg-[#D4A574] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#C4956A] transition-colors">
            Candidati →
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pt-16 pb-24 px-6">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-orange-100/60 blur-3xl pointer-events-none" />
        <div className="absolute top-20 -left-20 w-[300px] h-[300px] rounded-full bg-amber-50 blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-white border border-orange-200 px-5 py-2 rounded-full text-xs font-semibold text-[#D4A574] uppercase tracking-wider mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 bg-[#D4A574] rounded-full" />
            Per coach professionisti italiani
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-[68px] font-bold leading-[1.1] text-[#1a1a1a] mb-7 tracking-tight">
            Smetti di cercare clienti.<br />
            <span className="text-[#D4A574]">Lascia che vengano da te.</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
            CoachaMi gestisce il marketing, porta i lead qualificati e ti dà tutti gli strumenti per lavorare. Tu pensi solo al coaching.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/coach/apply"
              className="inline-flex items-center gap-2 bg-[#D4A574] text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-[#C4956A] transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(212,165,116,0.35)]"
            >
              Iscriviti come Coach
              <ArrowRight size={20} />
            </Link>
            <p className="text-sm text-gray-400">14 giorni gratis · Nessuna carta richiesta</p>
          </div>

          <div className="flex items-center justify-center gap-6 mt-12 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}</div>
              <span className="font-medium text-gray-700">Coach soddisfatti</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="text-sm text-gray-500"><span className="font-bold text-gray-700">100% italiano</span> · supporto in italiano</div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="text-sm text-gray-500"><span className="font-bold text-gray-700">Approvazione manuale</span> · qualità garantita</div>
          </div>
        </div>
      </section>

      {/* TRASFORMAZIONE */}
      <section className="bg-[#1a1a1a] text-white py-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse,rgba(212,165,116,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-14">
            <p className="text-[#D4A574] text-sm font-bold uppercase tracking-widest mb-3">La tua trasformazione</p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Da coach che si vende<br />
              <span className="text-[#D4A574]">a coach che viene cercato</span>
            </h2>
          </div>
          <div className="space-y-3">
            {transformations.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr,auto,1fr] items-center gap-4 bg-white/[0.04] rounded-2xl px-6 py-4 border border-white/[0.06]">
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-lg mt-0.5 flex-shrink-0">✗</span>
                  <p className="text-white/50 text-sm leading-snug">{t.before}</p>
                </div>
                <ArrowRight size={16} className="text-[#D4A574] flex-shrink-0" />
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg mt-0.5 flex-shrink-0">✓</span>
                  <p className="text-white text-sm font-medium leading-snug">{t.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VANTAGGI */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#D4A574] text-sm font-bold uppercase tracking-widest mb-3">Perché scegliere CoachaMi</p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1a1a1a] leading-tight">
              Tutto quello che ti serve<br />per far crescere il tuo business
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="bg-white rounded-3xl p-7 border border-black/[0.05] hover:shadow-[0_16px_48px_rgba(0,0,0,0.07)] transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: b.bg }}>
                  <b.icon size={22} style={{ color: b.color }} />
                </div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKETING BANNER */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-[#D4A574] to-[#C4956A] rounded-3xl p-10 md:p-14 text-white relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full" />
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-5">
                  <Megaphone size={12} /> Esclusivo per i nostri coach
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                  Il marketing lo facciamo noi,<br />le sessioni le fai tu.
                </h3>
                <p className="text-white/80 leading-relaxed">
                  Ogni mese investiamo in Google Ads, Meta Ads e SEO per portare nuovi coachee sulla piattaforma. Tu non spendi nulla in pubblicità: ricevi le assegnazioni direttamente nella dashboard.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { icon: '📢', label: 'Google Ads', desc: 'Campagne attive ogni giorno' },
                  { icon: '📱', label: 'Meta & Instagram', desc: 'Contenuti e sponsorizzazioni' },
                  { icon: '🔍', label: 'SEO e Blog', desc: 'Traffico organico qualificato' },
                  { icon: '⚡', label: 'Assegnazione automatica', desc: 'Lead mandati direttamente a te' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/15 rounded-2xl px-5 py-3.5">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-bold text-sm">{item.label}</p>
                      <p className="text-white/70 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UFFICIO VIRTUALE */}
      <section className="bg-[#F8F4EF] py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#D4A574] text-sm font-bold uppercase tracking-widest mb-3">Ufficio Virtuale</p>
            <h2 className="text-4xl font-bold text-[#1a1a1a]">Il tuo studio coaching, sempre con te</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Gestisci l&apos;intero ciclo di vita dei tuoi clienti da un&apos;unica dashboard professionale.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Calendar, label: 'Agenda', desc: 'Calendario e disponibilità integrati' },
              { icon: Users, label: 'Clienti', desc: 'CRM con storico sessioni e note' },
              { icon: FileText, label: 'Offerte', desc: 'Percorsi personalizzati e contratti' },
              { icon: CreditCard, label: 'Pagamenti', desc: 'Incassi automatici via Stripe' },
              { icon: BarChart3, label: 'Analytics', desc: 'Report guadagni e statistiche' },
              { icon: BookOpen, label: 'Prodotti', desc: 'Vendi guide, corsi e lead magnet' },
              { icon: Shield, label: 'Contratti', desc: 'Firma digitale automatica' },
              { icon: Award, label: 'Fatture', desc: 'Fatturazione elettronica SDI' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-black/[0.04] text-center hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <item.icon size={18} className="text-[#D4A574]" />
                </div>
                <p className="font-bold text-sm text-[#1a1a1a] mb-1">{item.label}</p>
                <p className="text-xs text-gray-400 leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[#D4A574] text-sm font-bold uppercase tracking-widest mb-4">Community</p>
              <h2 className="text-4xl font-bold text-[#1a1a1a] mb-5 leading-tight">Non sei solo.<br />Sei in ottima compagnia.</h2>
              <p className="text-gray-500 leading-relaxed mb-7">
                La community di CoachaMi è aperta a coach e coachee. Un forum dove confrontarsi, condividere esperienze e costruire la tua reputazione professionale.
              </p>
              <div className="space-y-3">
                {[
                  'Forum aperto a coach e coachee',
                  'Discussioni pubbliche indicizzate su Google',
                  'Risorse, template e guide pratiche',
                  'Leaderboard e gamification per crescere',
                  'Network con coach di tutta Italia',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-emerald-600" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-3xl p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#D4A574]/20 rounded-xl flex items-center justify-center">
                  <Zap size={18} className="text-[#D4A574]" />
                </div>
                <div>
                  <p className="font-bold">Sistema a punti</p>
                  <p className="text-white/50 text-xs">Più sei attivo, più sali in classifica</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { level: '🌱 Rookie', pts: '0 pt', color: '#10B981' },
                  { level: '⭐ Rising', pts: '100 pt', color: '#F59E0B' },
                  { level: '🔥 Pro', pts: '300 pt', color: '#F97316' },
                  { level: '💎 Elite', pts: '600 pt', color: '#6366F1' },
                  { level: '👑 Legend', pts: '1000 pt', color: '#D4A574' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/[0.06] rounded-xl px-4 py-2.5">
                    <span className="text-sm font-medium">{l.level}</span>
                    <span className="text-xs font-bold" style={{ color: l.color }}>{l.pts}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-xs mt-5 text-center">I coach con più punti ricevono più visibilità e più lead</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-[#F8F4EF] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#D4A574] text-sm font-bold uppercase tracking-widest mb-3">Piani e prezzi</p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1a1a1a] mb-4">Scegli il piano giusto per te</h2>
            <p className="text-gray-500 text-lg">Inizia gratis per 14 giorni. Cancella quando vuoi.</p>
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>Mensile</span>
              <button onClick={() => setIsAnnual(!isAnnual)} className={`w-14 h-[30px] rounded-full relative transition-colors ${isAnnual ? 'bg-[#D4A574]' : 'bg-[#D4A574]/40'}`}>
                <div className={`w-6 h-6 bg-white rounded-full absolute top-[3px] shadow-md transition-transform duration-300 ${isAnnual ? 'translate-x-[29px]' : 'translate-x-[3px]'}`} />
              </button>
              <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>Annuale</span>
              {isAnnual && <span className="text-xs font-bold text-white bg-emerald-500 px-3 py-1 rounded-full">Risparmi 2 mesi!</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`rounded-3xl p-8 relative border-[1.5px] transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular ? 'border-[#D4A574] bg-white scale-[1.03] shadow-[0_16px_48px_rgba(212,165,116,0.15)]'
                    : plan.elite ? 'border-transparent bg-[#1a1a1a] text-white'
                    : 'border-black/[0.06] bg-white hover:shadow-lg'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#D4A574] text-white px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">⭐ Più scelto</div>
                )}
                <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] mb-5 ${plan.elite ? 'bg-white/10' : 'bg-orange-50'}`}>{plan.icon}</div>
                <div className={`text-[13px] font-bold uppercase tracking-[1.5px] mb-1 ${plan.elite ? 'text-white/50' : 'text-gray-400'}`}>{plan.name}</div>
                <h3 className="font-bold text-[22px] mb-2">{plan.title}</h3>
                <p className={`text-sm leading-relaxed mb-6 ${plan.elite ? 'text-white/50' : 'text-gray-400'}`}>{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-base font-semibold mt-2">€</span>
                  <span className="text-5xl font-bold leading-none">{isAnnual ? plan.annualPrice : plan.monthlyPrice}</span>
                  <span className={`text-sm ${plan.elite ? 'text-white/40' : 'text-gray-400'}`}>/mese</span>
                </div>
                <div className={`text-[13px] mb-6 h-5 ${plan.elite ? 'text-white/35' : 'text-gray-400'}`}>
                  {isAnnual ? `€${plan.annualTotal}/anno` : '\u00A0'}
                </div>
                <Link
                  href={`/coach/apply?plan=${plan.id}`}
                  className={`block w-full py-3.5 rounded-[14px] text-center text-[15px] font-bold transition-all duration-200 mb-7 ${
                    plan.ctaStyle === 'primary' ? 'bg-[#D4A574] text-white shadow-[0_4px_16px_rgba(212,165,116,0.35)] hover:bg-[#C4956A]'
                      : plan.ctaStyle === 'elite' ? 'bg-white text-[#1a1a1a] hover:bg-amber-50'
                      : 'border-[1.5px] border-black/10 text-[#1a1a1a] hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  Inizia ora
                </Link>
                <div className={`h-px mb-6 ${plan.elite ? 'bg-white/10' : 'bg-black/[0.06]'}`} />
                <div className={`text-xs font-bold uppercase tracking-[1px] mb-4 ${plan.elite ? 'text-white/40' : 'text-gray-400'}`}>{plan.featuresLabel}</div>
                <div className="space-y-3">
                  {plan.features.map((feature, fi) => {
                    const text = typeof feature === 'string' ? feature : feature.text
                    const isNew = typeof feature === 'object' && feature.isNew
                    return (
                      <div key={fi} className="flex items-start gap-2.5 text-sm leading-[1.45]">
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] mt-0.5 ${plan.elite ? 'bg-amber-500/15 text-amber-400' : 'bg-orange-50 text-[#D4A574]'}`}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span>
                          {text}
                          {isNew && <span className={`inline-block ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold align-middle ${plan.elite ? 'bg-amber-500/20 text-amber-400' : 'bg-orange-100 text-[#D4A574]'}`}>NEW</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMISSIONI */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl p-10 border border-black/[0.05] text-center shadow-sm">
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-3">Come funzionano i tuoi guadagni</h2>
            <p className="text-gray-400 leading-relaxed mb-8">Per ogni sessione prenotata tramite CoachaMi, tratteniamo solo una commissione. Il resto è direttamente tuo.</p>
            <div className="flex items-center justify-center gap-10 flex-wrap mb-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-emerald-500">70%</div>
                <div className="text-sm text-gray-400 mt-1">A te, coach</div>
              </div>
              <div className="text-3xl text-gray-200">→</div>
              <div className="text-center">
                <div className="text-6xl font-bold text-[#D4A574]/50">30%</div>
                <div className="text-sm text-gray-400 mt-1">Piattaforma</div>
              </div>
            </div>
            <div className="bg-amber-50 rounded-2xl px-6 py-4 inline-block">
              <p className="text-sm text-amber-800">Con il piano <strong>Elite</strong> la commissione scende al <strong className="text-emerald-600">20%</strong> — tieni l&apos;<strong className="text-emerald-600">80%</strong> dei tuoi guadagni.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F8F4EF] py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-[#1a1a1a] mb-12">Domande frequenti</h2>
          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-black/[0.08] cursor-pointer" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="flex justify-between items-center py-5">
                  <span className="font-semibold text-base pr-4 text-[#1a1a1a]">{faq.q}</span>
                  <ChevronDown size={20} className={`text-[#D4A574] flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </div>
                <div className={`overflow-hidden transition-all duration-300 text-sm text-gray-500 leading-relaxed ${openFaq === i ? 'max-h-[300px] pb-5' : 'max-h-0'}`}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="bg-[#1a1a1a] text-white text-center px-6 py-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse,rgba(212,165,116,0.12)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative">
          <p className="text-[#D4A574] text-sm font-bold uppercase tracking-widest mb-4">Pronto a iniziare?</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Il tuo prossimo cliente<br />ti sta cercando ora.
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-md mx-auto">
            Iscriviti, completa il profilo e inizia a ricevere lead qualificati. 14 giorni gratis, senza carta di credito.
          </p>
          <Link href="/coach/apply" className="inline-flex items-center gap-3 bg-[#D4A574] text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-[#C4956A] transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(212,165,116,0.3)]">
            Iscriviti come Coach
            <ArrowRight size={20} />
          </Link>
          <p className="text-white/30 text-sm mt-5">14 giorni gratis · Nessuna carta richiesta · Cancella quando vuoi</p>
        </div>
      </section>

    </div>
  )
}
