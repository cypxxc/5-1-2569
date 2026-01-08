import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  QueryConstraint 
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"

export type AdminActionType = 
  | 'user_warning'
  | 'user_suspend' 
  | 'user_ban'
  | 'user_activate'
  | 'report_status_change'
  | 'report_resolve'
  | 'item_delete'
  | 'item_status_change'
  | 'ticket_reply'
  | 'ticket_status_change'
  | 'other'

export interface AdminLog {
  id: string
  actionType: AdminActionType
  adminId: string
  adminEmail: string
  targetType: 'user' | 'item' | 'report' | 'ticket' | 'exchange'
  targetId: string
  targetInfo?: string
  description: string
  metadata?: Record<string, any>
  createdAt: any
}

/**
 * Create an admin activity log entry
 */
export const createAdminLog = async (
  logData: Omit<AdminLog, 'id' | 'createdAt'>
): Promise<string> => {
  const db = getFirebaseDb()
  
  const docRef = await addDoc(collection(db, "adminLogs"), {
    ...logData,
    createdAt: serverTimestamp(),
  })
  
  return docRef.id
}

/**
 * Get admin activity logs with optional filters
 */
export const getAdminLogs = async (
  options?: {
    adminId?: string
    actionType?: AdminActionType
    targetType?: 'user' | 'item' | 'report' | 'ticket' | 'exchange'
    limitCount?: number
  }
): Promise<AdminLog[]> => {
  const db = getFirebaseDb()
  
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")]
  
  if (options?.adminId) {
    constraints.push(where("adminId", "==", options.adminId))
  }
  
  if (options?.actionType) {
    constraints.push(where("actionType", "==", options.actionType))
  }
  
  if (options?.targetType) {
    constraints.push(where("targetType", "==", options.targetType))
  }
  
  constraints.push(limit(options?.limitCount || 100))
  
  const q = query(collection(db, "adminLogs"), ...constraints)
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AdminLog)
}

/**
 * Get admin logs for a specific target
 */
export const getAdminLogsByTarget = async (
  targetType: 'user' | 'item' | 'report' | 'ticket' | 'exchange',
  targetId: string
): Promise<AdminLog[]> => {
  const db = getFirebaseDb()
  
  const q = query(
    collection(db, "adminLogs"),
    where("targetType", "==", targetType),
    where("targetId", "==", targetId),
    orderBy("createdAt", "desc")
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AdminLog)
}
