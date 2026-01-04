# Istruzioni per aggiungere IBAN alla Dashboard Admin Payments

## File: src/app/admin/payments/page.tsx

### 1. Aggiungere l'interfaccia billing nel tipo PendingPayout (circa riga 74)

Aggiungere dopo `coachEmail: string`:

```typescript
interface PendingPayout {
  // ... campi esistenti ...
  coachEmail: string
  coachBilling?: {
    businessName?: string
    iban?: string
    bankName?: string
    accountHolder?: string
    fiscalCode?: string
    vatNumber?: string
  }
  // ... altri campi ...
}
```

### 2. Caricare i dati billing quando si caricano i payout (nella funzione loadPayouts)

Dopo aver caricato il payout, aggiungere il caricamento dei dati billing del coach:

```typescript
// Nella funzione loadPayouts, quando mappa i payout:
const loadedPayouts: PendingPayout[] = await Promise.all(
  payoutsSnapshot.docs.map(async (payoutDoc) => {
    const data = payoutDoc.data()
    
    // Carica dati billing del coach
    let coachBilling = null
    try {
      const coachDoc = await getDoc(doc(db, 'users', data.coachId))
      if (coachDoc.exists()) {
        coachBilling = coachDoc.data().billing || null
      }
    } catch (e) {
      console.error('Errore caricamento billing coach:', e)
    }
    
    return {
      id: payoutDoc.id,
      // ... altri campi ...
      coachBilling,
    }
  })
)
```

### 3. Mostrare IBAN nel modal di verifica fattura (circa riga 1232)

Aggiungere dopo il box info payout esistente:

```tsx
{/* Info bancarie coach */}
{verifyModal.coachBilling?.iban && (
  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
      <Landmark size={18} />
      Dati per il bonifico
    </h4>
    <div className="space-y-2">
      <div>
        <p className="text-xs text-green-600">IBAN</p>
        <p className="font-mono text-green-900 select-all">{verifyModal.coachBilling.iban}</p>
      </div>
      {verifyModal.coachBilling.bankName && (
        <div>
          <p className="text-xs text-green-600">Banca</p>
          <p className="text-green-900">{verifyModal.coachBilling.bankName}</p>
        </div>
      )}
      {verifyModal.coachBilling.accountHolder && (
        <div>
          <p className="text-xs text-green-600">Intestatario</p>
          <p className="text-green-900">{verifyModal.coachBilling.accountHolder}</p>
        </div>
      )}
    </div>
  </div>
)}

{/* Alert se manca IBAN */}
{!verifyModal.coachBilling?.iban && (
  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
    <p className="text-amber-800 text-sm flex items-center gap-2">
      <AlertCircle size={18} />
      <span><strong>Attenzione:</strong> Il coach non ha inserito l'IBAN. Contattalo per ottenerlo.</span>
    </p>
  </div>
)}
```

### 4. Aggiungere import di Landmark (in cima al file)

```typescript
import { 
  // ... imports esistenti ...
  Landmark
} from 'lucide-react'
```

### 5. Mostrare IBAN anche nella tabella payout "Pronti"

Nella tabella dei payout, aggiungere una colonna o un tooltip con l'IBAN per i payout pronti.

---

## Note

- I dati billing vengono salvati in `users/{userId}/billing` quando il coach compila le impostazioni
- L'IBAN è in `billing.iban`
- Il nome banca è in `billing.bankName`
- L'intestatario è in `billing.accountHolder`
