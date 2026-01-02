import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore'
import { 
  CoachPoints, 
  CoachLevel, 
  POINTS_CONFIG, 
  getLevelFromPoints 
} from '@/types/community'

// Inizializza i punti per un nuovo coach
export async function initializeCoachPoints(coachId: string, coachName: string): Promise<void> {
  const pointsRef = doc(db, 'coachPoints', coachId)
  const existing = await getDoc(pointsRef)
  
  if (!existing.exists()) {
    await setDoc(pointsRef, {
      coachId,
      coachName,
      totalPoints: 0,
      currentLevel: 'rookie',
      monthlyPosts: 0,
      lastActivityAt: serverTimestamp(),
      streak: 0,
      pointsFromPosts: 0,
      pointsFromComments: 0,
      pointsFromLikesReceived: 0,
      pointsFromSavesReceived: 0,
      pointsFromSessions: 0,
      pointsFromEvents: 0,
      pointsLostToInactivity: 0,
      badges: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }
}

// Aggiungi punti per un'azione
export async function addPoints(
  coachId: string, 
  action: keyof typeof POINTS_CONFIG,
  customPoints?: number
): Promise<{ newTotal: number; levelUp: boolean; newLevel?: CoachLevel }> {
  const points = customPoints ?? POINTS_CONFIG[action]
  const pointsRef = doc(db, 'coachPoints', coachId)
  
  // Ottieni stato attuale
  const currentDoc = await getDoc(pointsRef)
  const currentData = currentDoc.data() as CoachPoints | undefined
  const currentPoints = currentData?.totalPoints || 0
  const currentLevel = currentData?.currentLevel || 'rookie'
  
  // Calcola nuovo totale
  const newTotal = Math.max(0, currentPoints + points) // Non può andare sotto 0
  const newLevel = getLevelFromPoints(newTotal)
  const levelUp = newLevel !== currentLevel && points > 0
  
  // Determina quale campo aggiornare
  let fieldToUpdate = 'pointsFromPosts'
  if (action === 'COMMENT_CREATED' || action === 'COACHEE_QUESTION_ANSWERED') {
    fieldToUpdate = 'pointsFromComments'
  } else if (action === 'LIKE_RECEIVED') {
    fieldToUpdate = 'pointsFromLikesReceived'
  } else if (action === 'SAVE_RECEIVED') {
    fieldToUpdate = 'pointsFromSavesReceived'
  } else if (action === 'SESSION_COMPLETED_POSITIVE') {
    fieldToUpdate = 'pointsFromSessions'
  } else if (action === 'EVENT_PARTICIPATION') {
    fieldToUpdate = 'pointsFromEvents'
  } else if (points < 0) {
    fieldToUpdate = 'pointsLostToInactivity'
  }
  
  // Aggiorna documento
  if (currentDoc.exists()) {
    await updateDoc(pointsRef, {
      totalPoints: newTotal,
      currentLevel: newLevel,
      [fieldToUpdate]: increment(Math.abs(points)),
      lastActivityAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }
  
  return { newTotal, levelUp, newLevel: levelUp ? newLevel : undefined }
}

// Incrementa contatore post mensili
export async function incrementMonthlyPosts(coachId: string): Promise<void> {
  const pointsRef = doc(db, 'coachPoints', coachId)
  await updateDoc(pointsRef, {
    monthlyPosts: increment(1),
    updatedAt: serverTimestamp()
  })
}

// Reset post mensili (da chiamare ogni mese)
export async function resetMonthlyPosts(coachId: string): Promise<void> {
  const pointsRef = doc(db, 'coachPoints', coachId)
  await updateDoc(pointsRef, {
    monthlyPosts: 0,
    updatedAt: serverTimestamp()
  })
}

// Ottieni punti di un coach
export async function getCoachPoints(coachId: string): Promise<CoachPoints | null> {
  const pointsRef = doc(db, 'coachPoints', coachId)
  const docSnap = await getDoc(pointsRef)
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as CoachPoints
  }
  return null
}

// Ottieni classifica coach (top N)
export async function getCoachLeaderboard(limitCount: number = 10): Promise<CoachPoints[]> {
  const pointsRef = collection(db, 'coachPoints')
  const q = query(
    pointsRef, 
    orderBy('totalPoints', 'desc'),
    limit(limitCount)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoachPoints))
}

// Controlla inattività e applica penalità
export async function checkInactivityPenalty(coachId: string): Promise<void> {
  const pointsRef = doc(db, 'coachPoints', coachId)
  const docSnap = await getDoc(pointsRef)
  
  if (!docSnap.exists()) return
  
  const data = docSnap.data() as CoachPoints
  const lastActivity = (data.lastActivityAt as any)?.toDate?.() || data.lastActivityAt || new Date(0)
  const now = new Date()
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysSinceActivity >= 90) {
    // 3+ mesi: penalità massima
    await addPoints(coachId, 'INACTIVE_3_MONTHS')
  } else if (daysSinceActivity >= 60) {
    // 2 mesi
    await addPoints(coachId, 'INACTIVE_2_MONTHS')
  } else if (daysSinceActivity >= 30) {
    // 1 mese
    await addPoints(coachId, 'INACTIVE_1_MONTH')
  }
}

// Verifica se coach è attivo (non nascosto)
export async function isCoachVisible(coachId: string): Promise<boolean> {
  const pointsRef = doc(db, 'coachPoints', coachId)
  const docSnap = await getDoc(pointsRef)
  
  if (!docSnap.exists()) return true // Nuovo coach, visibile di default
  
  const data = docSnap.data() as CoachPoints
  const lastActivity = (data.lastActivityAt as any)?.toDate?.() || data.lastActivityAt || new Date(0)
  const now = new Date()
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  
  // Nascosto se inattivo per 3+ mesi
  return daysSinceActivity < 90
}

// Aggiungi badge a un coach
export async function addBadge(
  coachId: string, 
  badge: { name: string; description: string; icon: string }
): Promise<void> {
  const pointsRef = doc(db, 'coachPoints', coachId)
  const docSnap = await getDoc(pointsRef)
  
  if (!docSnap.exists()) return
  
  const data = docSnap.data() as CoachPoints
  const newBadge = {
    id: `badge_${Date.now()}`,
    ...badge,
    earnedAt: new Date()
  }
  
  await updateDoc(pointsRef, {
    badges: [...(data.badges || []), newBadge],
    updatedAt: serverTimestamp()
  })
}
