/**
 * scripts/migrate-community-slugs.ts
 *
 * Aggiunge il campo `slug` a tutti i post community che non ce l'hanno.
 *
 * Esecuzione:
 *   1. Assicurati di avere le variabili d'ambiente nel file .env.local
 *   2. npx ts-node --project tsconfig.json scripts/migrate-community-slugs.ts
 *
 * Oppure con tsx (più semplice):
 *   npx tsx scripts/migrate-community-slugs.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// ── Init Firebase Admin ──────────────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}
const db = getFirestore()

// ── Funzione slug (identica a quella usata in new/page.tsx) ──────────────────
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
}

// ── Migrazione ───────────────────────────────────────────────────────────────
async function migrate() {
  console.log('🚀 Avvio migrazione slug post community...\n')

  const snap = await db.collection('communityPosts').get()
  console.log(`📦 Trovati ${snap.size} post totali\n`)

  const withoutSlug = snap.docs.filter(d => !d.data().slug)
  console.log(`🔧 Post senza slug: ${withoutSlug.length}\n`)

  if (withoutSlug.length === 0) {
    console.log('✅ Tutti i post hanno già lo slug. Niente da fare.')
    return
  }

  // Raggruppa in batch da 500 (limite Firestore)
  const BATCH_SIZE = 400
  let updated = 0
  let skipped = 0
  const slugsUsed = new Set<string>()

  // Prima passata: raccogli slug già esistenti per evitare duplicati
  snap.docs.forEach(d => {
    const s = d.data().slug
    if (s) slugsUsed.add(s)
  })

  for (let i = 0; i < withoutSlug.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const chunk = withoutSlug.slice(i, i + BATCH_SIZE)

    for (const docSnap of chunk) {
      const data = docSnap.data()
      const title = data.title?.trim()

      if (!title) {
        console.log(`  ⚠️  Post ${docSnap.id}: titolo vuoto, saltato`)
        skipped++
        continue
      }

      let slug = generateSlug(title)

      // Gestisci duplicati aggiungendo suffisso numerico
      if (slugsUsed.has(slug)) {
        let counter = 2
        while (slugsUsed.has(`${slug}-${counter}`)) counter++
        slug = `${slug}-${counter}`
      }

      slugsUsed.add(slug)
      batch.update(docSnap.ref, { slug })
      console.log(`  ✅ "${title.substring(0, 50)}" → /${slug}`)
      updated++
    }

    await batch.commit()
    console.log(`\n  📝 Batch ${Math.floor(i / BATCH_SIZE) + 1} completato\n`)
  }

  console.log(`\n✅ Migrazione completata!`)
  console.log(`   Aggiornati: ${updated}`)
  console.log(`   Saltati:    ${skipped}`)
  console.log(`\nOra tutti i nuovi link useranno URL leggibili.`)
}

migrate().catch(err => {
  console.error('❌ Errore migrazione:', err)
  process.exit(1)
})
