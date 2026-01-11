import { NextRequest, NextResponse } from 'next/server'

// =====================
// TIPI
// =====================

interface InvoiceData {
  // Dati fattura
  numero: string
  data: string // YYYY-MM-DD
  
  // Cedente (Coach)
  cedente: {
    denominazione: string
    partitaIva: string
    codiceFiscale: string
    indirizzo: string
    cap: string
    comune: string
    provincia: string // 2 lettere
    regimeFiscale: string // RF01, RF19, ecc
    email?: string
    pec?: string
  }
  
  // Cessionario (Cliente)
  cessionario: {
    denominazione: string
    codiceFiscale: string
    partitaIva?: string
    indirizzo: string
    cap: string
    comune: string
    provincia: string
    codiceDestinatario?: string // 7 caratteri o 0000000
    pec?: string
  }
  
  // Linee fattura
  linee: Array<{
    descrizione: string
    quantita: number
    prezzoUnitario: number
    aliquotaIva: number // 22, 10, 4, 0
    natura?: string // N2.2, N4, ecc per esenzioni
  }>
  
  // Pagamento
  pagamento: {
    modalita: string // MP05 = bonifico, MP08 = carta
    iban?: string
    istituto?: string
  }
}

// =====================
// GENERATORE XML
// =====================

function generateProgressivoInvio(): string {
  // Genera un ID univoco per la trasmissione
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateFatturaPA(data: InvoiceData): string {
  const progressivoInvio = generateProgressivoInvio()
  
  // Calcola totali
  let totaleImponibile = 0
  let totaleIva = 0
  const riepilogoIva: Record<string, { imponibile: number, imposta: number, natura?: string }> = {}
  
  data.linee.forEach(linea => {
    const imponibile = linea.quantita * linea.prezzoUnitario
    const imposta = linea.natura ? 0 : (imponibile * linea.aliquotaIva / 100)
    
    totaleImponibile += imponibile
    totaleIva += imposta
    
    const key = linea.natura || `${linea.aliquotaIva}`
    if (!riepilogoIva[key]) {
      riepilogoIva[key] = { imponibile: 0, imposta: 0, natura: linea.natura }
    }
    riepilogoIva[key].imponibile += imponibile
    riepilogoIva[key].imposta += imposta
  })
  
  const totaleDocumento = totaleImponibile + totaleIva
  
  // Determina codice destinatario
  const codiceDestinatario = data.cessionario.codiceDestinatario || '0000000'
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${escapeXml(data.cedente.codiceFiscale)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${progressivoInvio}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${escapeXml(codiceDestinatario)}</CodiceDestinatario>
      ${data.cessionario.pec && codiceDestinatario === '0000000' ? `<PECDestinatario>${escapeXml(data.cessionario.pec)}</PECDestinatario>` : ''}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${escapeXml(data.cedente.partitaIva)}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${escapeXml(data.cedente.codiceFiscale)}</CodiceFiscale>
        <Anagrafica>
          <Denominazione>${escapeXml(data.cedente.denominazione)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>${escapeXml(data.cedente.regimeFiscale)}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(data.cedente.indirizzo)}</Indirizzo>
        <CAP>${escapeXml(data.cedente.cap)}</CAP>
        <Comune>${escapeXml(data.cedente.comune)}</Comune>
        <Provincia>${escapeXml(data.cedente.provincia)}</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${data.cessionario.partitaIva ? `<IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${escapeXml(data.cessionario.partitaIva)}</IdCodice>
        </IdFiscaleIVA>` : ''}
        <CodiceFiscale>${escapeXml(data.cessionario.codiceFiscale)}</CodiceFiscale>
        <Anagrafica>
          <Denominazione>${escapeXml(data.cessionario.denominazione)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(data.cessionario.indirizzo)}</Indirizzo>
        <CAP>${escapeXml(data.cessionario.cap)}</CAP>
        <Comune>${escapeXml(data.cessionario.comune)}</Comune>
        <Provincia>${escapeXml(data.cessionario.provincia)}</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${escapeXml(data.data)}</Data>
        <Numero>${escapeXml(data.numero)}</Numero>
        <ImportoTotaleDocumento>${formatAmount(totaleDocumento)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      ${data.linee.map((linea, index) => `<DettaglioLinee>
        <NumeroLinea>${index + 1}</NumeroLinea>
        <Descrizione>${escapeXml(linea.descrizione)}</Descrizione>
        <Quantita>${formatAmount(linea.quantita)}</Quantita>
        <PrezzoUnitario>${formatAmount(linea.prezzoUnitario)}</PrezzoUnitario>
        <PrezzoTotale>${formatAmount(linea.quantita * linea.prezzoUnitario)}</PrezzoTotale>
        <AliquotaIVA>${formatAmount(linea.natura ? 0 : linea.aliquotaIva)}</AliquotaIVA>
        ${linea.natura ? `<Natura>${escapeXml(linea.natura)}</Natura>` : ''}
      </DettaglioLinee>`).join('\n      ')}
      ${Object.entries(riepilogoIva).map(([key, val]) => `<DatiRiepilogo>
        <AliquotaIVA>${formatAmount(val.natura ? 0 : parseFloat(key))}</AliquotaIVA>
        ${val.natura ? `<Natura>${escapeXml(val.natura)}</Natura>` : ''}
        <ImponibileImporto>${formatAmount(val.imponibile)}</ImponibileImporto>
        <Imposta>${formatAmount(val.imposta)}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
        ${val.natura ? `<RiferimentoNormativo>Operazione senza applicazione dell'IVA ai sensi dell'art. 1, commi 54-89, L. 190/2014 - Regime forfettario</RiferimentoNormativo>` : ''}
      </DatiRiepilogo>`).join('\n      ')}
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>${escapeXml(data.pagamento.modalita)}</ModalitaPagamento>
        <ImportoPagamento>${formatAmount(totaleDocumento)}</ImportoPagamento>
        ${data.pagamento.iban ? `<IBAN>${escapeXml(data.pagamento.iban)}</IBAN>` : ''}
        ${data.pagamento.istituto ? `<IstitutoFinanziario>${escapeXml(data.pagamento.istituto)}</IstitutoFinanziario>` : ''}
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`

  return xml
}

// =====================
// API HANDLER
// =====================

export async function POST(request: NextRequest) {
  try {
    const data: InvoiceData = await request.json()
    
    // Validazione base
    if (!data.cedente?.partitaIva || !data.cessionario?.codiceFiscale) {
      return NextResponse.json(
        { error: 'Dati fiscali mancanti' },
        { status: 400 }
      )
    }
    
    if (!data.linee?.length) {
      return NextResponse.json(
        { error: 'Nessuna linea fattura' },
        { status: 400 }
      )
    }
    
    // Genera XML
    const xml = generateFatturaPA(data)
    
    // Genera nome file secondo standard SDI
    // IT + P.IVA cedente + _ + progressivo
    const nomeFile = `IT${data.cedente.partitaIva}_${data.numero.replace(/[^a-zA-Z0-9]/g, '')}.xml`
    
    return NextResponse.json({
      success: true,
      xml,
      filename: nomeFile
    })
    
  } catch (error: any) {
    console.error('Errore generazione fattura:', error)
    return NextResponse.json(
      { error: error.message || 'Errore generazione fattura' },
      { status: 500 }
    )
  }
}
