/**
 * Admin User Detail API
 * GET /api/admin/users/[id]
 * PATCH /api/admin/users/[id]
 */

import { NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from '@/lib/admin-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin access
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { id } = await params
    const db = getAdminDb()
    
    // Get user
    const userSnap = await db.collection('users').doc(id).get()
    
    if (!userSnap.exists) {
      return errorResponse(
        AdminErrorCode.NOT_FOUND,
        'User not found',
        404
      )
    }

    const userData = { id: userSnap.id, ...userSnap.data() }

    // Get user's items
    const itemsSnap = await db.collection('items').where('postedBy', '==', id).get()
    const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Get user's exchanges
    const exchangesSnap = await db.collection('exchanges').where('ownerId', '==', id).get()
    const exchanges = exchangesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; status?: string }))

    // Get reports about this user
    const reportsSnap = await db.collection('reports').where('reportedUserId', '==', id).get()
    const reports = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    return successResponse({
      user: userData,
      stats: {
        itemsPosted: items.length,
        exchangesCompleted: exchanges.filter(e => e.status === 'completed').length,
        reportsReceived: reports.length,
      },
      items,
      exchanges,
      reports,
    })
  } catch (error) {
    console.error('[Admin API] Error fetching user:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to fetch user details',
      500
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin access
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { id } = await params
    const body = await request.json()
    const db = getAdminDb()
    
    await db.collection('users').doc(id).update(body)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[Admin API] Error updating user:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to update user',
      500
    )
  }
}
