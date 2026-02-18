'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Target,
  TrendingUp,
  Users,
  Star,
  MessageSquare,
  Clock,
  Award,
  Zap,
  Heart,
  MapPin,
  CheckCircle2,
  Info,
  BarChart3
} from 'lucide-react'

export default function ComeAvvieneIlMatchPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-500 to-primary-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Target className="w-14 h-14 mx-auto mb-4 opacity-90" />
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-3">
              Come Funziona il Match Coach-Coachee
            </h1>
            <p className="text-base text-white/80 max-w-2xl mx-auto">
              Trasparenza totale sul nostro algoritmo di matching. 
              Ecco come connettiamo i coach giusti con i coachee giusti.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Intro */}
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
            <h2 className="text-2xl font-bold text-charcoal mb-4 flex items-center gap-2">
              <Info className="text-primary-500" />
              Il Nostro Approccio
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Il sistema di matching di CoachaMi è progettato per creare connessioni significative 
              tra coach e coachee. Non si tratta solo di "chi è online" o "chi ha più recensioni", 
              ma di un algoritmo che considera <strong>compatibilità, qualità e impegno attivo</strong>.
            </p>
          </div>

          {/* Formula */}
          <div className="bg-gradient-to-br from-charcoal to-gray-800 rounded-2xl p-8 shadow-sm mb-8 text-white">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 />
              La Formula del Ranking
            </h2>
            
            <div className="bg-white/10 rounded-xl p-6 mb-6 font-mono text-center text-lg">
              <span className="text-primary-300">Ranking</span> = 
              <span className="text-blue-300"> Match (70%)</span> + 
              <span className="text-green-300"> Engagement (20%)</span> + 
              <span className="text-amber-300"> Rotazione (10%)</span>
            </div>
            
            <p className="text-white/80 text-sm">
              Questo significa che la <strong>compatibilità</strong> con il coachee è sempre il fattore principale, 
              ma l'<strong>impegno attivo</strong> sulla piattaforma viene premiato, e la <strong>rotazione</strong> 
              garantisce che tutti i coach abbiano visibilità.
            </p>
          </div>

          {/* Fattore 1: Match Score */}
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Target className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-charcoal mb-1">Match Score (70%)</h3>
                <p className="text-gray-500">Quanto sei compatibile con le esigenze del coachee</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="font-semibold text-charcoal">Area e Specializzazione (40%)</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• <strong>Area prioritaria</strong> del coachee corrisponde alla tua (15%)</li>
                  <li>• <strong>Aree secondarie</strong> che il coachee vuole migliorare (8%)</li>
                  <li>• <strong>Aree correlate</strong> se non c'è match diretto (5%)</li>
                  <li>• <strong>Focus topics</strong> che corrispondono agli obiettivi (7%)</li>
                  <li>• <strong>Problemi affrontati</strong> che risolvi (5%)</li>
                </ul>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <h4 className="font-semibold text-charcoal">Qualità del Profilo (25%)</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• <strong>Rating medio</strong> delle recensioni (10%)</li>
                  <li>• <strong>Numero di recensioni</strong> ricevute (5%)</li>
                  <li>• <strong>Anni di esperienza</strong> nel coaching (5%)</li>
                  <li>• <strong>Certificazioni</strong> ottenute (5%)</li>
                </ul>
              </div>
              
              <div className="border-l-4 border-pink-500 pl-4 py-2">
                <h4 className="font-semibold text-charcoal">Compatibilità Personale (20%)</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• <strong>Stile di coaching</strong> compatibile con l'archetipo del coachee (8%)</li>
                  <li>• <strong>Missione e valori</strong> allineati (5%)</li>
                  <li>• <strong>Match archetipo</strong> - es. Conquistatore preferisce coach diretti (7%)</li>
                </ul>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h4 className="font-semibold text-charcoal">Praticità (15%)</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• <strong>Location</strong> - stesso luogo per sessioni in presenza (5%)</li>
                  <li>• <strong>Prezzo</strong> nel budget del coachee (5%)</li>
                  <li>• <strong>Modalità sessione</strong> preferita disponibile (3%)</li>
                  <li>• <strong>Chat</strong> disponibile per primo contatto (2%)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Fattore 2: Engagement */}
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-charcoal mb-1">Engagement Mensile (20%)</h3>
                <p className="text-gray-500">Il tuo impegno attivo sulla piattaforma nell'ultimo mese</p>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-800">
                <strong>Perché l'engagement?</strong> Premiamo i coach attivi perché offrono 
                un'esperienza migliore ai coachee. Ma non preoccuparti: il sistema è bilanciato 
                per garantire visibilità a tutti.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-gray-600" />
                  <span className="font-semibold text-charcoal">Sessioni Completate</span>
                </div>
                <p className="text-sm text-gray-600">30% dell'engagement score</p>
                <div className="mt-2 text-xs text-gray-500">
                  ⭐ Eccellente: 10+ | ✓ Buono: 5+ | ○ Base: 2+
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className="text-gray-600" />
                  <span className="font-semibold text-charcoal">Tasso di Risposta</span>
                </div>
                <p className="text-sm text-gray-600">20% dell'engagement score</p>
                <div className="mt-2 text-xs text-gray-500">
                  ⭐ Eccellente: 95%+ | ✓ Buono: 80%+ | ○ Base: 60%+
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={18} className="text-gray-600" />
                  <span className="font-semibold text-charcoal">Recensioni Recenti</span>
                </div>
                <p className="text-sm text-gray-600">20% dell'engagement score</p>
                <div className="mt-2 text-xs text-gray-500">
                  ⭐ Eccellente: 5+ | ✓ Buono: 3+ | ○ Base: 1+
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={18} className="text-gray-600" />
                  <span className="font-semibold text-charcoal">Attività Community</span>
                </div>
                <p className="text-sm text-gray-600">15% dell'engagement score</p>
                <div className="mt-2 text-xs text-gray-500">
                  Post, commenti, like dati
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-gray-600" />
                  <span className="font-semibold text-charcoal">Tasso di Conversione</span>
                </div>
                <p className="text-sm text-gray-600">15% dell'engagement score</p>
                <div className="mt-2 text-xs text-gray-500">
                  % di call gratuite che diventano clienti paganti
                </div>
              </div>
            </div>
          </div>

          {/* Fattore 3: Rotazione */}
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Award className="text-amber-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-charcoal mb-1">Rotazione Equa (10%)</h3>
                <p className="text-gray-500">Garantiamo visibilità a tutti i coach</p>
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Nessuno viene escluso.</strong> Ogni giorno, ogni coach riceve un "boost" 
                casuale che varia. Questo significa che anche i coach nuovi o con meno attività 
                hanno l'opportunità di apparire in alto nei risultati.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-500 mt-0.5" />
                <p className="text-sm text-gray-600">
                  <strong>Boost giornaliero casuale (0-10 punti)</strong> - cambia ogni giorno per ogni coach
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-500 mt-0.5" />
                <p className="text-sm text-gray-600">
                  <strong>Boost inattività (+10-15 punti)</strong> - se non ricevi richieste da 2+ settimane, 
                  il tuo profilo riceve un boost temporaneo
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-500 mt-0.5" />
                <p className="text-sm text-gray-600">
                  <strong>Notifiche proattive</strong> - ti avvisiamo se la tua visibilità sta calando, 
                  con suggerimenti concreti
                </p>
              </div>
            </div>
          </div>

          {/* Come migliorare */}
          <div className="bg-gradient-to-br from-primary-50 to-amber-50 rounded-2xl p-8 shadow-sm mb-6">
            <h2 className="text-2xl font-bold text-charcoal mb-6 flex items-center gap-2">
              <TrendingUp className="text-primary-500" />
              Come Migliorare il Tuo Ranking
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-charcoal mb-2">🎯 Ottimizza il Match</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Completa tutti i campi del profilo</li>
                  <li>• Scrivi una bio dettagliata e autentica</li>
                  <li>• Specifica i problemi che affronti</li>
                  <li>• Indica il tuo stile di coaching</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-charcoal mb-2">⭐ Ottieni Recensioni</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Chiedi feedback dopo ogni sessione</li>
                  <li>• Offri un'esperienza eccellente</li>
                  <li>• Segui i coachee nel loro percorso</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-charcoal mb-2">💬 Sii Attivo in Community</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Pubblica post con insight utili</li>
                  <li>• Commenta e supporta altri coach</li>
                  <li>• Rispondi alle domande dei coachee</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-charcoal mb-2">⚡ Rispondi Velocemente</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Rispondi alle richieste entro 24h</li>
                  <li>• Conferma le sessioni rapidamente</li>
                  <li>• Mantieni il calendario aggiornato</li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-charcoal mb-6">Domande Frequenti</h2>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-charcoal mb-2">
                  Sono un coach nuovo, come posso competere con chi ha più esperienza?
                </h4>
                <p className="text-sm text-gray-600">
                  Il sistema è progettato per darti visibilità! Il boost di rotazione giornaliero 
                  e il boost per inattività garantiscono che tu abbia opportunità di apparire in alto. 
                  Inoltre, un profilo completo e ben scritto può ottenere un match score alto anche senza recensioni.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-charcoal mb-2">
                  Cosa succede se non sono attivo per un periodo?
                </h4>
                <p className="text-sm text-gray-600">
                  Dopo 7 giorni di inattività riceverai un promemoria gentile. Dopo 14 giorni, 
                  ti avvisiamo che la visibilità sta calando ma attiviamo anche un boost compensativo. 
                  Non sparisci mai completamente dai risultati.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-charcoal mb-2">
                  Il prezzo influisce sul ranking?
                </h4>
                <p className="text-sm text-gray-600">
                  Solo marginalmente (5% del match score) e solo quando il coachee ha specificato un budget. 
                  Coach con prezzi più bassi dentro il budget ottengono un piccolo bonus, ma non è un fattore dominante.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-charcoal mb-2">
                  Posso vedere il mio punteggio?
                </h4>
                <p className="text-sm text-gray-600">
                  Sì! Nella tua dashboard coach puoi vedere il tuo engagement score mensile 
                  e suggerimenti per migliorarlo. Il match score varia per ogni coachee, 
                  quindi non è un numero fisso.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-12 mb-8">
            <p className="text-gray-500 mb-4">Hai altre domande?</p>
            <Link 
              href="/coach/settings"
              className="btn btn-primary"
            >
              Vai alle Impostazioni
            </Link>
          </div>

        </div>
      </section>
    </div>
  )
}
