import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { AppNotification } from "@/types"

// Notifications
export const createNotification = async (notificationData: Omit<AppNotification, "id" | "createdAt" | "isRead">) => {
  const db = getFirebaseDb()
  const docRef = await addDoc(collection(db, "notifications"), {
    ...notificationData,
    isRead: false,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export const getNotifications = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AppNotification)
}

export const markNotificationAsRead = async (notificationId: string) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "notifications", notificationId)
  await updateDoc(docRef, { isRead: true })
}

export const markAllNotificationsAsRead = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("isRead", "==", false)
  )
  const snapshot = await getDocs(q)
  const promises = snapshot.docs.map((doc) => updateDoc(doc.ref, { isRead: true }))
  await Promise.all(promises)
}

export const deleteNotification = async (notificationId: string) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "notifications", notificationId)
  await deleteDoc(docRef)
}
