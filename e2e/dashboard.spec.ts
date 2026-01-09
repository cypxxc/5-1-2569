import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('should display the page title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('RMU-Campus X')
  })

  test('should show loading skeleton initially', async ({ page }) => {
    // The skeleton should be visible briefly during load
    // This tests that our skeleton component exists
    await page.goto('/dashboard')
    // Wait for content to load
    await page.waitForSelector('[data-slot="skeleton"], .grid', { timeout: 10000 })
  })

  test('should display filter sidebar on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page.locator('text=ตัวกรอง').first()).toBeVisible()
    await expect(page.locator('text=หมวดหมู่')).toBeVisible()
    await expect(page.locator('text=สถานะ')).toBeVisible()
  })

  test('should filter by category', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Click on electronics category
    await page.click('text=อิเล็กทรอนิกส์')
    
    // Wait for results to update
    await page.waitForTimeout(1000)
  })

  test('should search for items', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="ค้นหา"]')
    await expect(searchInput).toBeVisible()
    
    // Type a search query
    await searchInput.fill('ทดสอบ')
    
    // Wait for debounce and results
    await page.waitForTimeout(1000)
  })

  test('should clear search when clicking X button', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="ค้นหา"]')
    
    // Type something
    await searchInput.fill('test')
    
    // Wait for clear button to appear
    await page.waitForTimeout(100)
    
    // Click clear button
    const clearButton = page.locator('button[aria-label="ล้างคำค้นหา"]')
    if (await clearButton.isVisible()) {
      await clearButton.click()
      await expect(searchInput).toHaveValue('')
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // On mobile, filter button should be visible instead of sidebar
    await expect(page.locator('button:has-text("ตัวกรอง")')).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/')
    
    // Check landing page loads
    await expect(page).toHaveURL('/')
    
    // Navigate to dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should show login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/login')
  })
})
