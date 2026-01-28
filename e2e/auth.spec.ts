import { test, expect } from '@playwright/test'

test.describe('Authentication UI Flow', () => {
  

  test.describe('Register Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register')
    })

    test('should show validation error for invalid RMU email', async ({ page }) => {
      // Input invalid email
      await page.fill('input#email', 'invalid@gmail.com')
      await page.fill('input#password', 'password123')
      await page.fill('input#confirmPassword', 'password123')
      
      // Submit
      await page.click('button[type="submit"]')

      // Check for error message
      // Note: Adjust selector based on actual UI implementation
      // Assuming HTML5 validation or UI error message
      const emailInput = page.locator('input#email')
      
      // Check if input is invalid using constraint validation API or UI text
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity())
      expect(isInvalid).toBe(true)
    })

    test('should show error when passwords do not match', async ({ page }) => {
      await page.fill('input#email', '630123456789@rmu.ac.th')
      await page.fill('input#password', 'password123')
      await page.fill('input#confirmPassword', 'password456') // Mismatch
      
      await page.click('button[type="submit"]')
      
      // Expect error message
      await expect(page.getByText(/ไม่ตรงกัน|match/i).first()).toBeVisible()
    })
  })

  test.describe('Login Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
    })

    test('should require email and password', async ({ page }) => {
      await page.click('button[type="submit"]')
      
      // Check HTML5 validation
      const emailInput = page.locator('input#email')
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity())
      expect(isInvalid).toBe(true)
    })
  })
})
