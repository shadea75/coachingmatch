import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  return getFirestore()
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const slug = request.nextUrl.searchParams.get('slug')

  if (!id && !slug) return NextResponse.json({ error: 'missing id or slug' }, { status: 400 })

  try {
    const db = getAdminDb()
    let data: FirebaseFirestore.DocumentData | undefined
    let docId = ''

    if (slug) {
      // Cerca per slug
      const snap = await db.collection('communityPosts').where('slug', '==', slug).limit(1).get()
      if (!snap.empty) {
        docId = snap.docs[0].id
        data = snap.docs[0].data()
      }
      // Fallback: prova come ID diretto
      if (!data) {
        const direct = await db.collection('communityPosts').doc(slug).get()
        if (direct.exists) { docId = direct.id; data = direct.data() }
      }
    } else if (id) {
      const postDoc = await db.collection('communityPosts').doc(id).get()
      if (postDoc.exists) { docId = postDoc.id; data = postDoc.data() }
    }

    if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const title = data.title || 'Post della Community'
    const content = (data.content || '').replace(/[#*_`>\-]/g, '').trim()
    const description = content.length > 160
      ? content.substring(0, 157) + '...'
      : content || `Leggi il post di ${data.authorName} nella community di CoachaMi.`

    return NextResponse.json({
      title,
      description,
      authorName: data.authorName || 'CoachaMi',
      slug: data.slug || docId,
      section: data.section || '',
    })
  } catch (err) {
    console.error('Errore lettura post meta:', err)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
