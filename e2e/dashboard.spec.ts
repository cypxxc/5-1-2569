import { test, expect } from '@playwright/test'

// Increase timeout for all tests
test.setTimeout(30000)

test.describe('Dashboard Page', () => {
  test('should load dashboard and show title', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
    
    // Check page title exists
    const title = page.locator('h1')
    await expect(title).toContainText('RMU-Campus X')
  })

  test('should show search input', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
    
    // Search input should be visible
    const searchInput = page.getByPlaceholder('ค้นหาสิ่งของ...')
    await expect(searchInput).toBeVisible()
  })

  test('should allow typing in search', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
    
    const searchInput = page.getByPlaceholder('ค้นหาสิ่งของ...')
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
  })
})

test.describe('Basic Navigation', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
  })

  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/login')
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page).toHaveURL('/register')
  })
})
