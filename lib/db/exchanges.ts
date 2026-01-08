import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { Exchange, ExchangeStatus } from "@/types"
import { apiCall, TIMEOUT_CONFIG, type ApiResponse } from "@/lib/api-wrapper"
import { createNotification } from "./notifications"

// Exchanges
export const createExchange = async (exchangeData: Omit<Exchange, "id" | "createdAt" | "updatedAt">) => {
  const db = getFirebaseDb()
  const docRef = await addDoc(collection(db, "exchanges"), {
    ...exchangeData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  
  // Notify owner of new request
  await createNotification({
    userId: exchangeData.ownerId,
    title: "มีคำขอใหม่",
    message: `มีผู้ขอแลกเปลี่ยน "${exchangeData.itemTitle}" ของคุณ`,
    type: "exchange",
    relatedId: docRef.id
  })

  return docRef.id
}

export const getExchangesByUser = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(collection(db, "exchanges"), where("requesterId", "==", userId), orderBy("createdAt", "desc"))

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Exchange)
}

export const getExchangeById = async (id: string): Promise<ApiResponse<Exchange | null>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const docRef = doc(db, "exchanges", id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        return null
      }
      
      return { id: docSnap.id, ...docSnap.data() } as Exchange
    },
    'getExchangeById',
    TIMEOUT_CONFIG.QUICK
  )
}

export const updateExchange = async (id: string, data: Partial<Exchange>) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "exchanges", id)
  
  // Get current data to check status change
  const currentDoc = await getDoc(docRef)
  const currentData = currentDoc.data() as Exchange
  
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })

// Notify on status change
  if (data.status && data.status !== currentData.status) {
    let title = ""
    let message = ""
    let targetUserId = currentData.requesterId

    if (data.status === 'accepted') {
      title = "รับคำขอแล้ว"
      message = `เจ้าของสิ่งของ "ตกลง" แลกเปลี่ยน "${currentData.itemTitle}" กับคุณแล้ว`
    } else if (data.status === 'rejected') {
      title = "คำขอถูกปฏิเสธ"
      message = `เสียใจด้วย เจ้าของสิ่งของ "ปฏิเสธ" คำขอแลกเปลี่ยน "${currentData.itemTitle}"`
    }

    if (title && message) {
      await createNotification({
        userId: targetUserId,
        title,
        message,
        type: "exchange",
        relatedId: id
      })
    }
  }
}

/**
 * Atomically confirm an exchange and check for completion
 */
export const confirmExchange = async (exchangeId: string, role: 'owner' | 'requester'): Promise<ApiResponse<{ status: ExchangeStatus }>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const exchangeRef = doc(db, "exchanges", exchangeId)

      const result = await runTransaction(db, async (transaction) => {
        // 1. Read exchange
        const exchangeDoc = await transaction.get(exchangeRef)
        if (!exchangeDoc.exists()) throw new Error("Exchange not found")
        
        const exchange = exchangeDoc.data() as Exchange
        
        // 2. Update confirmation status
        const updates: Partial<Exchange> = {
          updatedAt: serverTimestamp() as any
        }
        
        let ownerConfirmed = exchange.ownerConfirmed
        let requesterConfirmed = exchange.requesterConfirmed

        if (role === 'owner') {
          updates.ownerConfirmed = true
          ownerConfirmed = true
        } else {
          updates.requesterConfirmed = true
          requesterConfirmed = true
        }

        // 3. Check if both confirmed
        let newStatus = exchange.status
        if (ownerConfirmed && requesterConfirmed) {
          updates.status = 'completed'
          newStatus = 'completed'
          
          // Update ITEM status to completed
          const itemRef = doc(db, "items", exchange.itemId)
          transaction.update(itemRef, { 
            status: 'completed',
            updatedAt: serverTimestamp()
          })
        }

        transaction.update(exchangeRef, updates)
        return { status: newStatus, exchange }
      })

      // 4. Send notifications (outside transaction to avoid complex logic inside)
      if (result.status === 'completed') {
        // Notify Owner
        await createNotification({
          userId: result.exchange.ownerId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId
        })
        
        // Notify Requester
        await createNotification({
          userId: result.exchange.requesterId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId
        })
      }

      return { status: result.status }
    },
    'confirmExchange',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const cancelExchange = async (
  exchangeId: string,
  itemId: string,
  userId: string,
  reason?: string,
) => {
  const db = getFirebaseDb()

  console.log("[cancelExchange] Starting cancellation:", { exchangeId, itemId, userId, reason })

  try {
    // First, get the exchange data and check other active exchanges
    // These queries must be done OUTSIDE the transaction
    const exchangeDoc = await getDoc(doc(db, "exchanges", exchangeId))
    if (!exchangeDoc.exists()) {
      throw new Error("Exchange not found")
    }
    const exchangeData = exchangeDoc.data() as Exchange

    // Query all active exchanges for this item
    const q = query(
      collection(db, "exchanges"),
      where("itemId", "==", itemId),
      where("status", "in", ["pending", "accepted", "in_progress"]),
    )
    const snapshot = await getDocs(q)

    console.log("[cancelExchange] Found active exchanges:", snapshot.docs.length)
    console.log(
      "[cancelExchange] Exchange IDs:",
      snapshot.docs.map((doc) => ({ id: doc.id, status: doc.data().status })),
    )

    // Count active exchanges excluding the current one
    const otherActiveExchanges = snapshot.docs.filter((doc) => doc.id !== exchangeId)

    console.log("[cancelExchange] Other active exchanges (excluding current):", otherActiveExchanges.length)

    // Use a transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      const exchangeRef = doc(db, "exchanges", exchangeId)
      const itemRef = doc(db, "items", itemId)

      // Update exchange status to cancelled
      console.log("[cancelExchange] Updating exchange to cancelled...")
      transaction.update(exchangeRef, {
        status: "cancelled",
        cancelReason: reason || "ไม่ระบุเหตุผล",
        cancelledBy: userId,
        cancelledAt: serverTimestamp(),
      })

      // If no other active exchanges, set item back to available
      if (otherActiveExchanges.length === 0) {
        console.log("[cancelExchange] No other active exchanges, setting item to available...")
        transaction.update(itemRef, { 
          status: "available",
          updatedAt: serverTimestamp(),
        })
      } else {
        console.log("[cancelExchange] Other active exchanges exist, keeping item as pending")
      }
    })

    console.log("[cancelExchange] Transaction completed successfully")

    // Notify the other party (outside transaction)
    const targetUserId = exchangeData.requesterId === userId ? exchangeData.ownerId : exchangeData.requesterId
    await createNotification({
      userId: targetUserId,
      title: "รายการถูกยกเลิก",
      message: `การแลกเปลี่ยน "${exchangeData.itemTitle}" ถูกยกเลิกโดยอีกฝ่าย`,
      type: "exchange",
      relatedId: exchangeId
    })

    console.log("[cancelExchange] Cancellation completed successfully")
  } catch (error) {
    console.error("[cancelExchange] Error during cancellation:", error)
    throw error
  }
}

export const deleteExchange = async (exchangeId: string) => {
  const db = getFirebaseDb()

  console.log("[deleteExchange] Starting deletion:", exchangeId)

  // Delete all chat messages for this exchange
  console.log("[deleteExchange] Deleting chat messages...")
  const messagesQuery = query(collection(db, "chatMessages"), where("exchangeId", "==", exchangeId))
  const messagesSnapshot = await getDocs(messagesQuery)

  console.log("[deleteExchange] Found chat messages:", messagesSnapshot.docs.length)

  // Delete messages in batch
  const deletePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
  await Promise.all(deletePromises)

  console.log("[deleteExchange] Chat messages deleted")

  // Delete the exchange
  console.log("[deleteExchange] Deleting exchange...")
  await deleteDoc(doc(db, "exchanges", exchangeId))

  console.log("[deleteExchange] Exchange deleted successfully")
}
