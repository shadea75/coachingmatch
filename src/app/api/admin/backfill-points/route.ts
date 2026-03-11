import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const POINTS_CONFIG = {
  POST_CREATED: 10,
  LIKE_RECEIVED: 2,
  SAVE_RECEIVED: 5,
  COMMENT_CREATED: 5,
}

const LEVELS = [
  { key: 'rookie',  min: 0,    max: 99   },
  { key: 'rising',  min: 100,  max: 299  },
  { key: 'active',  min: 300,  max: 599  },
  { key: 'expert',  min: 600,  max: 999  },
  { key: 'elite',   min: 1000, max: Infinity },
]

function getLevelFromPoints(pts: number) {
  return LEVELS.find(l => pts >= l.min && pts <= l.max)?.key || 'rookie'
}

export async function POST(request: NextRequest) {
  try {
    const postsSnap = await adminDb.collection('communityPosts').get()
    const commentsSnap = await adminDb.collectionGroup('comments').get().catch(() => null)

    // Accumula punti per coach: { coachId -> { name, posts, likesReceived, savesReceived, comments } }
    const coachAccumulator: Record<string, {
      name: string,
      posts: number,
      likesReceived: number,
      savesReceived: number,
      comments: number,
    }> = {}

    const ensure = (id: string, name: string) => {
      if (!coachAccumulator[id]) {
        coachAccumulator[id] = { name, posts: 0, likesReceived: 0, savesReceived: 0, comments: 0 }
      }
    }

    // Scansiona tutti i post
    postsSnap.docs.forEach(d => {
      const data = d.data()
      const authorId = data.authorId
      const authorName = data.authorName || data.authorRole || ''
      if (!authorId || data.authorRole === 'admin') return

      ensure(authorId, authorName)
      coachAccumulator[authorId].posts += 1
      coachAccumulator[authorId].likesReceived += data.likeCount || 0
      coachAccumulator[authorId].savesReceived += data.saveCount || 0
    })

    // Scansiona commenti se disponibili
    if (commentsSnap) {
      commentsSnap.docs.forEach(d => {
        const data = d.data()
        const authorId = data.authorId
        const authorName = data.authorName || ''
        if (!authorId || data.authorRole === 'admin') return
        ensure(authorId, authorName)
        coachAccumulator[authorId].comments += 1
      })
    }

    // Scrivi i punti calcolati su coachPoints usando un batch
    const results: Record<string, any> = {}
    const BATCH_SIZE = 400
    let batch = adminDb.batch()
    let opCount = 0

    for (const [coachId, data] of Object.entries(coachAccumulator)) {
      const totalPoints =
        data.posts * POINTS_CONFIG.POST_CREATED +
        data.likesReceived * POINTS_CONFIG.LIKE_RECEIVED +
        data.savesReceived * POINTS_CONFIG.SAVE_RECEIVED +
        data.comments * POINTS_CONFIG.COMMENT_CREATED

      const level = getLevelFromPoints(totalPoints)
      const ref = adminDb.collection('coachPoints').doc(coachId)

      batch.set(ref, {
        coachId,
        coachName: data.name,
        totalPoints,
        currentLevel: level,
        pointsFromPosts: data.posts * POINTS_CONFIG.POST_CREATED,
        pointsFromLikesReceived: data.likesReceived * POINTS_CONFIG.LIKE_RECEIVED,
        pointsFromSavesReceived: data.savesReceived * POINTS_CONFIG.SAVE_RECEIVED,
        pointsFromComments: data.comments * POINTS_CONFIG.COMMENT_CREATED,
        pointsFromSessions: 0,
        pointsFromEvents: 0,
        pointsLostToInactivity: 0,
        monthlyPosts: data.posts,
        streak: 0,
        badges: [],
        lastActivityAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: false }) // riscrive completamente

      results[coachId] = { name: data.name, totalPoints, level }
      opCount++

      if (opCount >= BATCH_SIZE) {
        await batch.commit()
        batch = adminDb.batch()
        opCount = 0
      }
    }

    if (opCount > 0) await batch.commit()

    console.log(`✅ Backfill completato: ${Object.keys(results).length} coach aggiornati`)
    return NextResponse.json({ success: true, updated: Object.keys(results).length, results })

  } catch (err: any) {
    console.error('Errore backfill punti:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
