import { LifeAreaId } from '@/types'

// Descrizioni specifiche per ogni area della vita - Ruota della Vita nel Coaching
export const AREA_SCORE_DESCRIPTIONS: Record<LifeAreaId, {
  subtitle: string
  scores: Record<number, string>
}> = {
  carriera: {
    subtitle: 'Lavoro, progetti, crescita professionale, impatto, visione di carriera',
    scores: {
      1: 'Stagnante, insoddisfacente, disallineato con i valori, nessuna crescita, elevata insoddisfazione',
      2: 'Stagnante, insoddisfacente, disallineato con i valori, nessuna crescita, elevata insoddisfazione',
      3: 'Qualche sforzo ma progressi minimi, soddisfazione moderata, stress occasionale',
      4: 'Qualche sforzo ma progressi minimi, soddisfazione moderata, stress occasionale',
      5: 'Progresso stabile, soddisfazione moderata, crescita e impatto presenti',
      6: 'Progresso stabile, soddisfazione moderata, crescita e impatto presenti',
      7: 'Prospero, determinato, buoni progressi, impatto significativo, programma equilibrato',
      8: 'Prospero, determinato, buoni progressi, impatto significativo, programma equilibrato',
      9: 'Carriera pienamente allineata con valori e scopo, crescita eccezionale, impatto, soddisfazione e armonia tra lavoro e vita privata',
      10: 'Carriera pienamente allineata con valori e scopo, crescita eccezionale, impatto, soddisfazione e armonia tra lavoro e vita privata',
    }
  },
  benessere: {
    subtitle: 'Energia, forma fisica, alimentazione, sonno, cura fisica, movimento quotidiano, recupero',
    scores: {
      1: 'Energia estremamente bassa, raramente esercizio fisico, cattiva alimentazione, problemi cronici del sonno, nessuna cura di sé',
      2: 'Energia estremamente bassa, raramente esercizio fisico, cattiva alimentazione, problemi cronici del sonno, nessuna cura di sé',
      3: 'Energia bassa-moderata, esercizio fisico incostante, problemi di alimentazione e sonno, raramente cura di sé',
      4: 'Energia bassa-moderata, esercizio fisico incostante, problemi di alimentazione e sonno, raramente cura di sé',
      5: 'Energia moderata, esercizio fisico occasionale, dieta abbastanza sana, sonno abbastanza regolare, una certa cura di sé',
      6: 'Energia moderata, esercizio fisico occasionale, dieta abbastanza sana, sonno abbastanza regolare, una certa cura di sé',
      7: 'Energia prevalentemente alta, esercizio fisico 3-4 volte a settimana, buona alimentazione, sonno generalmente adeguato, cura di sé costante',
      8: 'Energia prevalentemente alta, esercizio fisico 3-4 volte a settimana, buona alimentazione, sonno generalmente adeguato, cura di sé costante',
      9: 'Energia vibrante, esercizio fisico regolare, alimentazione eccellente, sonno ristoratore ogni notte, routine di cura di sé disciplinata',
      10: 'Energia vibrante, esercizio fisico regolare, alimentazione eccellente, sonno ristoratore ogni notte, routine di cura di sé disciplinata',
    }
  },
  famiglia: {
    subtitle: 'Sistema di supporto, connessione, appartenenza sociale, esperienze condivise',
    scores: {
      1: 'Isolamento, nessuna relazione di supporto, disconnesso dalla rete sociale',
      2: 'Isolamento, nessuna relazione di supporto, disconnesso dalla rete sociale',
      3: 'Contatti rari, scarso supporto, relazioni tese o superficiali',
      4: 'Contatti rari, scarso supporto, relazioni tese o superficiali',
      5: 'Connessione e supporto moderati, tensione occasionale, alcune interazioni significative',
      6: 'Connessione e supporto moderati, tensione occasionale, alcune interazioni significative',
      7: 'Contatti frequenti, relazioni per lo più di supporto, buone relazioni sociali',
      8: 'Contatti frequenti, relazioni per lo più di supporto, buone relazioni sociali',
      9: 'Rete sociale e familiare solida, affidabile e stimolante, profondo senso di appartenenza',
      10: 'Rete sociale e familiare solida, affidabile e stimolante, profondo senso di appartenenza',
    }
  },
  denaro: {
    subtitle: 'Gestione del denaro, risparmi, investimenti, libertà finanziaria, sicurezza',
    scores: {
      1: 'Reddito instabile, debiti, nessun risparmio o pianificazione',
      2: 'Reddito instabile, debiti, nessun risparmio o pianificazione',
      3: 'Budget incoerente, pochi risparmi, occasionale stress finanziario',
      4: 'Budget incoerente, pochi risparmi, occasionale stress finanziario',
      5: 'Moderato controllo finanziario, qualche risparmio e investimento, lieve stress',
      6: 'Moderato controllo finanziario, qualche risparmio e investimento, lieve stress',
      7: 'Finanze per lo più stabili, solide abitudini di risparmio e investimento, occasionale lieve stress',
      8: 'Finanze per lo più stabili, solide abitudini di risparmio e investimento, occasionale lieve stress',
      9: 'Completa stabilità finanziaria, budget chiaro, molteplici risparmi e investimenti, libertà di fare scelte senza stress',
      10: 'Completa stabilità finanziaria, budget chiaro, molteplici risparmi e investimenti, libertà di fare scelte senza stress',
    }
  },
  amore: {
    subtitle: 'Relazione romantica, vicinanza, intimità emotiva e fisica, fiducia',
    scores: {
      1: 'Nessuna connessione romantica o intimità, scarsa comunicazione, disconnessioni',
      2: 'Nessuna connessione romantica o intimità, scarsa comunicazione, disconnessioni',
      3: 'Minima vicinanza o intimità, frequenti incomprensioni, difficoltà relazionali',
      4: 'Minima vicinanza o intimità, frequenti incomprensioni, difficoltà relazionali',
      5: 'Moderata connessione emotiva e fisica, occasionali conflitti o bisogni insoddisfatti',
      6: 'Moderata connessione emotiva e fisica, occasionali conflitti o bisogni insoddisfatti',
      7: 'Forte intimità, comunicazione per lo più buona, lievi problemi relazionali',
      8: 'Forte intimità, comunicazione per lo più buona, lievi problemi relazionali',
      9: 'Profonda vicinanza emotiva e fisica, comunicazione eccellente, relazione pienamente appagante e nutriente',
      10: 'Profonda vicinanza emotiva e fisica, comunicazione eccellente, relazione pienamente appagante e nutriente',
    }
  },
  fiducia: {
    subtitle: 'Umore, resilienza, stress, consapevolezza di sé, regolazione emotiva',
    scores: {
      1: 'Spesso sopraffatto, stress elevato, scarsa consapevolezza di sé, nessun supporto emotivo',
      2: 'Spesso sopraffatto, stress elevato, scarsa consapevolezza di sé, nessun supporto emotivo',
      3: 'Spesso stressato, sbalzi d\'umore, scarsa resilienza, scarsa autoriflessione o cura mentale',
      4: 'Spesso stressato, sbalzi d\'umore, scarsa resilienza, scarsa autoriflessione o cura mentale',
      5: 'Stress moderato, una certa stabilità emotiva, autoriflessione occasionale, terapia o journaling a volte',
      6: 'Stress moderato, una certa stabilità emotiva, autoriflessione occasionale, terapia o journaling a volte',
      7: 'Per lo più calmo e resiliente, gestisce bene lo stress, riflessione regolare, piccole sfide emotive',
      8: 'Per lo più calmo e resiliente, gestisce bene lo stress, riflessione regolare, piccole sfide emotive',
      9: 'Emotivamente equilibrato, altamente resiliente, cura proattiva della salute mentale, costantemente consapevole di sé e riflessivo',
      10: 'Emotivamente equilibrato, altamente resiliente, cura proattiva della salute mentale, costantemente consapevole di sé e riflessivo',
    }
  },
  scopo: {
    subtitle: 'Significato, valori, scopo, contributo alla comunità, pace interiore',
    scores: {
      1: 'Nessun senso dello scopo, nessun contributo, nessun allineamento con i valori',
      2: 'Nessun senso dello scopo, nessun contributo, nessun allineamento con i valori',
      3: 'Rara riflessione o contributo, scarso allineamento con lo scopo e i valori',
      4: 'Rara riflessione o contributo, scarso allineamento con lo scopo e i valori',
      5: 'Moderato allineamento con i valori, contributo o riflessione occasionali',
      6: 'Moderato allineamento con i valori, contributo o riflessione occasionali',
      7: 'Per lo più in linea con i valori, contributo e coinvolgimento nella comunità regolare, qualche riflessione',
      8: 'Per lo più in linea con i valori, contributo e coinvolgimento nella comunità regolare, qualche riflessione',
      9: 'Forte senso dello scopo, pienamente in linea con i valori, contributo e coinvolgimento nella comunità costanti, riflessione regolare',
      10: 'Forte senso dello scopo, pienamente in linea con i valori, contributo e coinvolgimento nella comunità costanti, riflessione regolare',
    }
  },
  focus: {
    subtitle: 'Competenze, creatività, curiosità, sviluppo personale, ampliamento delle conoscenze',
    scores: {
      1: 'Nessuno sviluppo personale, nessun apprendimento, stagnazione',
      2: 'Nessuno sviluppo personale, nessun apprendimento, stagnazione',
      3: 'Apprendimento minimo o attività creative, scarsa crescita delle competenze',
      4: 'Apprendimento minimo o attività creative, scarsa crescita delle competenze',
      5: 'Apprendimento occasionale, sviluppo moderato delle competenze e creatività',
      6: 'Apprendimento occasionale, sviluppo moderato delle competenze e creatività',
      7: 'Apprendimento regolare, sviluppo delle competenze, esplorazione creativa, mentalità di crescita',
      8: 'Apprendimento regolare, sviluppo delle competenze, esplorazione creativa, mentalità di crescita',
      9: 'Apprendimento attivo quotidiano/settimanale, sviluppo di molteplici competenze, creatività costante, forte curiosità e orientamento alla crescita',
      10: 'Apprendimento attivo quotidiano/settimanale, sviluppo di molteplici competenze, creatività costante, forte curiosità e orientamento alla crescita',
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
