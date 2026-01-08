/**
 * Admin Report Detail API
 * GET /api/admin/reports/[id]
 * PATCH /api/admin/reports/[id]
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
    
    const reportSnap = await db.collection('reports').doc(id).get()
    
    if (!reportSnap.exists) {
      return errorResponse(
        AdminErrorCode.NOT_FOUND,
        'Report not found',
        404
      )
    }

    return successResponse({
      report: { id: reportSnap.id, ...reportSnap.data() },
    })
  } catch (error) {
    console.error('[Admin API] Error fetching report:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to fetch report',
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
    
    await db.collection('reports').doc(id).update(body)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[Admin API] Error updating report:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to update report',
      500
    )
  }
}
