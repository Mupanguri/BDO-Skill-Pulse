import { test, Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = 'docs/screenshots'

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

async function snap(page: Page, name: string) {
  const filePath = path.join(BASE, `${name}.png`)
  ensureDir(path.dirname(filePath))
  await page.screenshot({ path: filePath, fullPage: true })
  console.log(`  📸 ${name}.png`)
}

async function waitForApp(page: Page) {
  // Wait for React to hydrate — no spinner visible
  await page.waitForLoadState('networkidle')
}

async function loginAs(
  page: Page,
  email: string,
  password: string,
  portal: 'user' | 'admin' | 'superadmin' = 'user'
) {
  await page.goto('/login')
  await waitForApp(page)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  if (portal === 'user') {
    // Regular users go directly to /app/dashboard (no portal-select)
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    // Set portalMode in sessionStorage so child routes render correctly
    await page.evaluate(() => sessionStorage.setItem('portalMode', 'user'))
  } else if (portal === 'admin') {
    // Admin/HR: login → dashboard → ProtectedRoute SPA-redirects to portal-select
    await page.waitForURL('**/portal-select', { timeout: 15_000 }).catch(() => {})
    await waitForApp(page)
    await page.locator('button', { hasText: /Admin Portal|HR Portal/ }).first().click()
    const overlay = page.locator('text=Verify Identity')
    await overlay.waitFor({ timeout: 8_000 })
    await page.fill('input[type="password"]', password)
    await page.locator('button', { hasText: 'Enter Portal' }).click()
    await page.waitForURL('**/admin', { timeout: 10_000 })
  } else if (portal === 'superadmin') {
    await page.waitForURL('**/portal-select', { timeout: 15_000 }).catch(() => {})
    await waitForApp(page)
    const superBtn = page.locator('button', { hasText: 'Super Admin' })
    const hasSuperAdmin = await superBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!hasSuperAdmin) {
      console.log('  ⚠️  Super Admin button not visible — run: UPDATE "User" SET "isSuperAdmin"=true WHERE email=\'admin@bdo.co.zw\';')
      return
    }
    await superBtn.click()
    const overlay = page.locator('text=Verify Identity')
    await overlay.waitFor({ timeout: 8_000 })
    await page.fill('input[type="password"]', password)
    await page.locator('button', { hasText: 'Enter Portal' }).click()
    await page.waitForURL('**/superadmin', { timeout: 10_000 })
  }

  await waitForApp(page)
}

// ---------------------------------------------------------------------------
// Section 1 — Public pages
// ---------------------------------------------------------------------------

test('public pages', async ({ page }) => {
  console.log('\n── Public pages ──')

  await page.goto('/')
  await waitForApp(page)
  await snap(page, 'public/home')

  await page.goto('/login')
  await waitForApp(page)
  await snap(page, 'public/login')
})

// ---------------------------------------------------------------------------
// Section 2 — Regular user
// ---------------------------------------------------------------------------

test('user portal', async ({ page }) => {
  console.log('\n── User portal ──')

  await loginAs(page, 'tkuyeri@bdo.co.zw', 'M@z1garo', 'user')

  // Regular users go directly to dashboard — set portalMode so child routes work
  await page.evaluate(() => sessionStorage.setItem('portalMode', 'user'))

  await snap(page, 'user/dashboard')

  // Quiz — click Start Quiz on first available card if present
  const startBtn = page.locator('button', { hasText: 'Start Quiz' }).first()
  const hasQuiz = await startBtn.isVisible().catch(() => false)
  if (hasQuiz) {
    await startBtn.click()
    await waitForApp(page)
    await snap(page, 'user/quiz')
    await page.goto('/app/dashboard')
    await waitForApp(page)
  }

  // History
  await page.goto('/app/history')
  await waitForApp(page)
  await snap(page, 'user/history')

  // Profile
  await page.goto('/app/profile')
  await waitForApp(page)
  await snap(page, 'user/profile')
})

// ---------------------------------------------------------------------------
// Section 3 — Admin
// ---------------------------------------------------------------------------

test('admin portal', async ({ page }) => {
  console.log('\n── Admin portal ──')

  // Portal select before choosing
  await page.goto('/login')
  await waitForApp(page)
  await page.fill('input[type="email"]', 'admin@bdo.co.zw')
  await page.fill('input[type="password"]', 'Admin2024!99')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/portal-select', { timeout: 15_000 }).catch(() => { })
  await waitForApp(page)
  await snap(page, 'admin/portal-select')

  // Now enter admin portal
  await page.locator('button', { hasText: /Admin Portal|HR Portal/ }).first().click()
  const overlay = page.locator('text=Verify Identity')
  await overlay.waitFor({ timeout: 5_000 })
  await page.fill('input[type="password"]', 'Admin2024!99')
  await page.locator('button', { hasText: 'Enter Portal' }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })
  await waitForApp(page)

  await snap(page, 'admin/dashboard')

  await page.goto('/app/admin/participants')
  await waitForApp(page)
  await snap(page, 'admin/participants')

  await page.goto('/app/admin/results')
  await waitForApp(page)
  await snap(page, 'admin/results')

  await page.goto('/app/admin/create')
  await waitForApp(page)
  await snap(page, 'admin/create-session')

  await page.goto('/app/admin/analytics')
  await waitForApp(page)
  // Give charts time to render
  await page.waitForTimeout(2000)
  await snap(page, 'admin/analytics')

  await page.goto('/app/admin/audit-logs')
  await waitForApp(page)
  await snap(page, 'admin/audit-logs')
})

// ---------------------------------------------------------------------------
// Section 4 — HR Portal
// ---------------------------------------------------------------------------

test('hr portal', async ({ page }) => {
  console.log('\n── HR portal ──')

  await loginAs(page, 'hr@bdo.co.zw', 'JohnnyMuf@mb!99', 'admin')

  await snap(page, 'hr/dashboard')

  await page.goto('/app/admin/participants')
  await waitForApp(page)
  await snap(page, 'hr/participants')

  await page.goto('/app/admin/results')
  await waitForApp(page)
  await snap(page, 'hr/results')

  await page.goto('/app/admin/analytics')
  await waitForApp(page)
  await page.waitForTimeout(2000)
  await snap(page, 'hr/analytics')

  await page.goto('/app/admin/audit-logs')
  await waitForApp(page)
  await snap(page, 'hr/audit-logs')
})

// ---------------------------------------------------------------------------
// Section 5 — Super Admin
// ---------------------------------------------------------------------------

test('super admin portal', async ({ page }) => {
  console.log('\n── Super Admin portal ──')

  await loginAs(page, 'admin@bdo.co.zw', 'Admin2024!99', 'superadmin')
  await snap(page, 'superadmin/user-management')
})
