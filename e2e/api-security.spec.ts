import { test, expect } from '@playwright/test'

test.describe('API Security & Validation', () => {
  
  test.describe('Unauthenticated Access', () => {
    test('POST /api/exchanges should return 401 without token', async ({ request }) => {
      const response = await request.post('/api/exchanges', {
        data: {
          itemId: 'test-item',
          ownerId: 'owner-id',
          requesterId: 'requester-id'
        }
      })
      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Authentication required')
    })
    
    test('POST /api/reports should return 401 without token', async ({ request }) => {
        const response = await request.post('/api/reports', {
          data: {
            reportType: 'item_report',
            description: 'Test report',
            targetId: 'target-id'
          }
        })
        expect(response.status()).toBe(401)
      })

    test('POST /api/support should return 401 without token', async ({ request }) => {
      const response = await request.post('/api/support', {
        data: {
          subject: 'Help',
          category: 'general',
          description: 'Help me'
        }
      })
      expect(response.status()).toBe(401)
    })
  })

  test.describe('Input Validation (Zod)', () => {
    // Note: We need a valid token to test Validation logic (since Auth check comes first)
    // If we can't easily mock auth in E2E, we can check if 401 is returned, 
    // BUT if we want to test 400 Bad Request, we'd need to bypass Auth or have a test token.
    // However, `api-validation` checks Auth FIRST.
    
    // STRATEGY: We will skip full validation tests if we don't have a token.
    // But we CAN test that endpoints EXIST and are protected.
    
    // Testing the "structure" of the error response on 401 is still valuable integration testing.
    test('401 response should have correct error structure', async ({ request }) => {
        const response = await request.post('/api/exchanges', { data: {} })
        expect(response.status()).toBe(401)
        
        const body = await response.json()
        expect(body).toHaveProperty('error')
        expect(body).toHaveProperty('code', 'AUTH_REQUIRED')
    })
  })

  test.describe('Admin Routes', () => {
    test('GET /api/admin/items should return 401 without token', async ({ request }) => {
        const response = await request.get('/api/admin/items')
        expect(response.status()).toBe(401)
    })
  })
})
