import { LifeAreaId } from '@/types'

// Descrizioni specifiche per ogni area della vita - Ruota della Vita nel Coaching
export const AREA_SCORE_DESCRIPTIONS: Record<LifeAreaId, {
  subtitle: string
  scores: Record<number, string>
}> = {
  salute: {
    subtitle: 'Energia, forma fisica, alimentazione, sonno, vitalità quotidiana',
    scores: {
      1: 'Energia estremamente bassa, nessun esercizio, cattiva alimentazione, problemi cronici del sonno',
      2: 'Energia molto bassa, raramente esercizio, alimentazione povera, sonno irregolare',
      3: 'Energia bassa, esercizio sporadico, alimentazione incostante, sonno insufficiente',
      4: 'Energia sotto la media, poco movimento, alimentazione da migliorare, sonno variabile',
      5: 'Energia moderata, esercizio occasionale, dieta abbastanza sana, sonno discreto',
      6: 'Energia discreta, movimento regolare, alimentazione equilibrata, sonno sufficiente',
      7: 'Buona energia, esercizio 3-4 volte a settimana, buona alimentazione, sonno adeguato',
      8: 'Energia alta, attività fisica costante, alimentazione sana, sonno ristoratore',
      9: 'Energia vibrante, esercizio regolare, alimentazione eccellente, sonno ottimale',
      10: 'Vitalità al massimo, fitness eccellente, nutrizione ottimale, sonno perfetto',
    }
  },
  finanze: {
    subtitle: 'Gestione del denaro, risparmi, investimenti, sicurezza finanziaria',
    scores: {
      1: 'Debiti significativi, nessun risparmio, stress finanziario costante',
      2: 'Situazione finanziaria precaria, pochissimi risparmi, frequente stress',
      3: 'Difficoltà a fine mese, risparmi minimi, stress finanziario ricorrente',
      4: 'Budget instabile, pochi risparmi, occasionale preoccupazione',
      5: 'Finanze gestite, qualche risparmio, moderato controllo',
      6: 'Budget sotto controllo, risparmi in crescita, lieve stress occasionale',
      7: 'Buona gestione finanziaria, risparmi solidi, tranquillità economica',
      8: 'Finanze stabili, investimenti attivi, sicurezza finanziaria',
      9: 'Ottima situazione finanziaria, diversificazione investimenti, libertà economica',
      10: 'Totale libertà finanziaria, patrimonio solido, nessuno stress economico',
    }
  },
  carriera: {
    subtitle: 'Lavoro, crescita professionale, soddisfazione, impatto, equilibrio',
    scores: {
      1: 'Completamente insoddisfatto, nessuna crescita, forte stress lavorativo',
      2: 'Molto insoddisfatto, stagnazione, frequente stress',
      3: 'Insoddisfatto, poca crescita, stress ricorrente',
      4: 'Sotto le aspettative, crescita lenta, stress occasionale',
      5: 'Moderatamente soddisfatto, qualche progresso, equilibrio discreto',
      6: 'Abbastanza soddisfatto, crescita costante, buon equilibrio',
      7: 'Soddisfatto, buoni progressi, impatto positivo',
      8: 'Molto soddisfatto, crescita significativa, ottimo equilibrio',
      9: 'Realizzato professionalmente, forte crescita, grande impatto',
      10: 'Carriera ideale, piena realizzazione, perfetto equilibrio vita-lavoro',
    }
  },
  relazioni: {
    subtitle: 'Amicizie, famiglia, connessioni sociali, supporto reciproco',
    scores: {
      1: 'Isolamento sociale, nessuna relazione significativa, solitudine',
      2: 'Poche connessioni, relazioni superficiali, scarso supporto',
      3: 'Relazioni limitate, connessioni deboli, poco supporto',
      4: 'Alcune relazioni ma distanti, supporto occasionale',
      5: 'Relazioni discrete, qualche amicizia significativa, supporto moderato',
      6: 'Buone relazioni, amicizie stabili, supporto presente',
      7: 'Relazioni solide, amicizie profonde, buon sistema di supporto',
      8: 'Relazioni ricche, connessioni profonde, forte supporto reciproco',
      9: 'Relazioni eccellenti, amicizie durature, comunità di supporto',
      10: 'Rete sociale ideale, relazioni profondamente appaganti, supporto totale',
    }
  },
  amore: {
    subtitle: 'Relazione romantica, intimità, comunicazione, connessione emotiva',
    scores: {
      1: 'Nessuna relazione o relazione molto problematica, solitudine affettiva',
      2: 'Relazione in crisi o assente, scarsa intimità, disconnessione',
      3: 'Difficoltà relazionali significative, comunicazione carente',
      4: 'Relazione instabile, intimità ridotta, conflitti frequenti',
      5: 'Relazione discreta, comunicazione da migliorare, intimità moderata',
      6: 'Relazione stabile, buona comunicazione, intimità presente',
      7: 'Relazione soddisfacente, comunicazione aperta, buona intimità',
      8: 'Relazione forte, comunicazione eccellente, intimità profonda',
      9: 'Relazione appagante, connessione profonda, grande intimità',
      10: 'Relazione ideale, amore profondo, intimità e comunicazione perfette',
    }
  },
  crescita: {
    subtitle: 'Sviluppo personale, apprendimento, autostima, espansione comfort zone',
    scores: {
      1: 'Nessuno sviluppo, autostima molto bassa, paura del cambiamento',
      2: 'Minimo sviluppo, autostima bassa, resistenza al cambiamento',
      3: 'Poco sviluppo, autostima fragile, zona comfort ristretta',
      4: 'Sviluppo lento, autostima da costruire, piccoli passi',
      5: 'Sviluppo moderato, autostima discreta, qualche sfida affrontata',
      6: 'Sviluppo costante, buona autostima, comfort zone in espansione',
      7: 'Buona crescita, autostima solida, apertura al nuovo',
      8: 'Crescita significativa, forte autostima, sfide abbracciate',
      9: 'Sviluppo eccellente, autostima elevata, continua evoluzione',
      10: 'Crescita massima, autostima incrollabile, trasformazione continua',
    }
  },
  spiritualita: {
    subtitle: 'Scopo di vita, valori, contributo agli altri, pace interiore',
    scores: {
      1: 'Nessun senso dello scopo, disconnesso dai valori, vuoto interiore',
      2: 'Scarso senso dello scopo, valori confusi, poca pace',
      3: 'Ricerca dello scopo, valori poco chiari, pace occasionale',
      4: 'Qualche intuizione sullo scopo, valori emergenti, momenti di pace',
      5: 'Scopo in definizione, valori identificati, pace discreta',
      6: 'Buon senso dello scopo, valori chiari, contributo presente',
      7: 'Scopo chiaro, valori vissuti, contributo regolare, buona pace',
      8: 'Forte senso dello scopo, valori integrati, contributo significativo',
      9: 'Scopo di vita chiaro, pieno allineamento ai valori, grande contributo',
      10: 'Missione di vita realizzata, valori pienamente vissuti, pace profonda',
    }
  },
  divertimento: {
    subtitle: 'Tempo libero, hobby, gioia, avventura, leggerezza',
    scores: {
      1: 'Nessun tempo per sé, niente hobby, vita monotona e pesante',
      2: 'Pochissimo tempo libero, rari momenti di svago, pesantezza',
      3: 'Tempo libero scarso, pochi hobby, poca gioia quotidiana',
      4: 'Tempo libero limitato, qualche interesse, gioia occasionale',
      5: 'Discreto tempo libero, hobby saltuari, momenti di leggerezza',
      6: 'Buon tempo per sé, hobby coltivati, gioia presente',
      7: 'Tempo libero soddisfacente, passioni coltivate, buona leggerezza',
      8: 'Ottimo equilibrio, hobby appaganti, frequente gioia',
      9: 'Eccellente tempo per sé, passioni vissute, gioia costante',
      10: 'Vita ricca di divertimento, avventure, gioia e leggerezza quotidiana',
    }
  },
}

// Funzione helper per ottenere la descrizione
export function getScoreDescription(areaId: LifeAreaId, score: number): string {
  return AREA_SCORE_DESCRIPTIONS[areaId]?.scores[score] || ''
}

// Funzione helper per ottenere il sottotitolo dell'area
export function getAreaSubtitle(areaId: LifeAreaId): string {
  return AREA_SCORE_DESCRIPTIONS[areaId]?.subtitle || ''
}

// Labels brevi per i punteggi (comuni a tutte le aree)
export function getScoreLabel(score: number): string {
  if (score <= 2) return 'Critico'
  if (score <= 4) return 'Da migliorare'
  if (score <= 6) return 'Sufficiente'
  if (score <= 8) return 'Buono'
  return 'Eccellente'
}
