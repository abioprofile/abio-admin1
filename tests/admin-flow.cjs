// Browser integration checks with deterministic API fixtures. No backend writes.
// Run: PLAYWRIGHT_MODULE=/path/to/playwright node tests/admin-flow.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const user = {
  id: 'staff-1',
  name: 'Alex Morgan',
  email: 'alex@example.com',
  active: true,
}
const metrics = {
  orders: {
    total: 124,
    byStatus: {
      processing: 32,
      ready: 18,
      shipped: 42,
      received: 28,
      cancelled: 4,
    },
  },
  payments: {
    revenueKobo: 285000000,
    currency: 'NGN',
    byStatus: { pending: 20, success: 98, failed: 4, reversed: 2 },
  },
  catalog: { productsTotal: 16, productsActive: 12 },
  users: { total: 450, active: 420 },
  recentOrders: [
    {
      id: 'cc829fa4-1234-1234-1234-123456789012',
      status: 'processing',
      totalAmountKobo: 3500000,
      currency: 'NGN',
      createdAt: '2026-09-09T09:00:00Z',
      trackingNumber: null,
      user,
      payment: {
        id: 'p1',
        status: 'success',
        amountKobo: 3500000,
        paidAt: null,
      },
    },
  ],
}
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  })
  if (process.env.SCREENSHOT_DIR) {
    await page.goto('http://127.0.0.1:3001/auth/sign-in')
    await page.getByRole('heading', { name: 'Welcome back.' }).waitFor()
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/admin-login.png`,
      fullPage: true,
    })
  }
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  let mode = 'normal',
    refreshCount = 0,
    logoutBody
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const ok = (data) =>
      route.fulfill({
        status: 200,
        json: { success: true, data, message: 'OK', statusCode: 200 },
      })
    const fail = (status, message) =>
      route.fulfill({
        status,
        json: { success: false, data: null, message, statusCode: status },
      })
    if (path.endsWith('/auth/login'))
      return mode === 'bad-login'
        ? fail(401, 'Incorrect email or password')
        : ok({ user, accessToken: 'access-test', refreshToken: 'refresh-test' })
    if (path.endsWith('/auth/refresh')) {
      refreshCount++
      return mode === 'expired'
        ? fail(401, 'Session expired')
        : ok({ accessToken: 'new-access', refreshToken: 'new-refresh' })
    }
    if (path.endsWith('/auth/logout')) {
      logoutBody = route.request().postDataJSON()
      return ok(null)
    }
    if (path.endsWith('/admin/me'))
      return mode === 'forbidden'
        ? fail(403, 'Not authorized')
        : mode === 'offline'
          ? fail(503, 'Temporarily unavailable')
          : ok({
              ...user,
              roles: [mode === 'moderator' ? 'moderator' : 'admin'],
            })
    if (path.endsWith('/metrics')) {
      if (mode === 'expired') return fail(401, 'Expired')
      if (
        mode === 'refresh' &&
        route.request().headers().authorization !== 'Bearer new-access'
      )
        return fail(401, 'Expired')
      if (mode === 'metrics-error') return fail(500, 'Metrics unavailable')
      if (mode === 'empty')
        return ok({
          orders: {
            total: 0,
            byStatus: {
              processing: 0,
              ready: 0,
              shipped: 0,
              received: 0,
              cancelled: 0,
            },
          },
          payments: {
            revenueKobo: 0,
            currency: 'NGN',
            byStatus: { pending: 0, success: 0, failed: 0, reversed: 0 },
          },
          catalog: { productsTotal: 0, productsActive: 0 },
          users: { total: 0, active: 0 },
          recentOrders: [],
        })
      return ok(metrics)
    }
    return fail(404, 'Not found')
  })
  const login = async () => {
    await page.goto('http://127.0.0.1:3001/auth/sign-in')
    await page.getByLabel('Email address').fill('alex@example.com')
    await page.getByLabel('Password', { exact: true }).fill('test-password')
    await page.getByRole('button', { name: 'Sign in →' }).click()
  }
  mode = 'bad-login'
  await login()
  await page
    .getByRole('alert')
    .filter({ hasText: 'Incorrect email or password' })
    .waitFor()
  mode = 'normal'
  await login()
  await page.getByText('₦2,850,000.00', { exact: true }).waitFor()
  assert.equal(
    await page.getByRole('heading', { name: 'Store overview' }).count(),
    1,
  )
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/dashboard-fixture-desktop.png`,
      fullPage: true,
    })
  await page.setViewportSize({ width: 390, height: 844 })
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/dashboard-fixture-mobile.png`,
      fullPage: true,
    })
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    'No mobile page overflow',
  )
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL('**/auth/sign-in')
  assert.equal(logoutBody.refreshToken, 'refresh-test')
  assert.equal(
    await page.evaluate(() => localStorage.getItem('auth_user')),
    null,
  )
  mode = 'forbidden'
  await login()
  await page
    .getByRole('heading', { name: 'This space is for staff.' })
    .waitFor()
  assert.match(page.url(), /access-denied/)
  await page.getByRole('button', { name: 'Use another account' }).click()
  mode = 'offline'
  await login()
  await page.getByRole('button', { name: 'Retry connection' }).waitFor()
  mode = 'moderator'
  await page.getByRole('button', { name: 'Retry connection' }).click()
  await page.getByRole('heading', { name: 'Store overview' }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Invitations', exact: true }).count(), 0)
  mode = 'empty'
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByText('Your first order starts the story.').waitFor()
  mode = 'metrics-error'
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page
    .getByRole('alert')
    .filter({ hasText: 'Showing the last loaded data' })
    .waitFor()
  mode = 'refresh'
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByText('₦2,850,000.00', { exact: true }).waitFor()
  assert.equal(refreshCount, 1)
  mode = 'expired'
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.waitForURL('**/auth/sign-in')
  assert.equal(
    await page.evaluate(() => localStorage.getItem('auth_user')),
    null,
  )
  assert.equal(
    await page.evaluate(() => localStorage.getItem('auth_staff')),
    null,
  )
  assert.equal(
    await page.evaluate(() => localStorage.getItem('auth_access_token')),
    null,
  )
  assert.deepEqual(errors, [])
  await browser.close()
  console.log(
    'PASS: login errors, staff dashboard, mobile layout/menu, logout token revocation, forbidden access, connection retry, moderator navigation, empty metrics, stale-data errors, refresh retry, session cleanup.',
  )
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
