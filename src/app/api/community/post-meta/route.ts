// API route per leggere i metadata di un post community (usata da generateMetadata)
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
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  try {
    const db = getAdminDb()
    const postDoc = await db.collection('communityPosts').doc(id).get()

    if (!postDoc.exists) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    const data = postDoc.data()!
    const title = data.title || 'Post della Community'
    const content = (data.content || '').replace(/[#*_`>\-]/g, '').trim()
    const description = content.length > 160
      ? content.substring(0, 157) + '...'
      : content || `Leggi il post di ${data.authorName} nella community di CoachaMi.`

    return NextResponse.json({
      title,
      description,
      authorName: data.authorName || 'CoachaMi',
      slug: data.slug || id,
    })
  } catch (err) {
    console.error('Errore lettura post meta:', err)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
