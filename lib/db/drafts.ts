import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { Draft, DraftType } from "@/types"

// ============ Draft Auto-save ============

export const saveDraft = async (
  userId: string,
  type: DraftType,
  data: any
) => {
  const db = getFirebaseDb()
  const draftsRef = collection(db, 'drafts')
  
  // Check if draft exists for this user and type
  const q = query(draftsRef, where('userId', '==', userId), where('type', '==', type))
  const existing = await getDocs(q)
  
  if (!existing.empty && existing.docs[0]) {
    // Update existing draft
    await updateDoc(existing.docs[0].ref, {
      data,
      updatedAt: serverTimestamp(),
    })
    return existing.docs[0].id
  } else {
    // Create new draft
    const docRef = await addDoc(draftsRef, {
      userId,
      type,
      data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  }
}

export const getDraft = async (userId: string, type: DraftType) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, 'drafts'),
    where('userId', '==', userId),
    where('type', '==', type)
  )
  const snapshot = await getDocs(q)
  
  if (snapshot.empty || !snapshot.docs[0]) return null
  
  const draft = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Draft
  
  // Check if draft is older than 1 day
  const createdAt = (draft.createdAt as any)?.toDate?.() || new Date()
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  
  if (createdAt < oneDayAgo) {
    // Delete expired draft
    await deleteDoc(snapshot.docs[0].ref)
    return null
  }
  
  return draft
}

export const deleteDraft = async (draftId: string) => {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, 'drafts', draftId))
}

// Clean up old drafts (can be run periodically)
export const cleanupOldDrafts = async () => {
  const db = getFirebaseDb()
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  
  const q = query(collection(db, 'drafts'))
  const snapshot = await getDocs(q)
  
  const deletePromises = snapshot.docs
    .filter((doc) => {
      const createdAt = (doc.data().createdAt as any)?.toDate?.() || new Date()
      return createdAt < oneDayAgo
    })
    .map((doc) => deleteDoc(doc.ref))
  
  await Promise.all(deletePromises)
}
