// Browser contract tests; all API calls use fixtures, never live mutations.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1365, height: 1000 },
  })
  page.setDefaultTimeout(10000)
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const staff = {
    id: 'staff',
    name: 'Alex',
    email: 'alex@example.com',
    roles: ['admin'],
  }
  let product = {
    id: 'p1',
    name: 'AP Card',
    slug: 'ap-card',
    type: 'standard',
    description: 'NFC card',
    currency: 'NGN',
    basePriceKobo: 3500000,
    active: true,
    variants: [],
  }
  let user = {
    id: 'u1',
    name: 'Jamie Doe',
    email: 'jamie@example.com',
    active: true,
    isEmailVerified: true,
    createdAt: '2026-09-01',
    roles: [],
    hasBadge: false,
    profile: { username: 'jamie', bio: 'Designer', location: 'Lagos' },
    badges: [],
  }
  let requests = [
    {
      id: 'r1',
      userId: 'u1',
      user: { id: 'u1', name: 'Jamie Doe', email: 'jamie@example.com' },
      status: 'pending',
      reason: 'Please verify my design business.',
      idDocumentUrl: 'https://example.com/document.pdf',
      reviewedAt: null,
      reviewNote: null,
      createdAt: '2026-09-09',
    },
  ]
  const writes = []
  const reads = []
  let rejectSave = false
  const list = (items, page = 1) => ({
    pagination: { page, limit: 10, total: items.length, totalPages: 1 },
  })
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    const body = method === 'GET' ? null : route.request().postDataJSON()
    const params = new URL(route.request().url()).searchParams
    const ok = (data) =>
      route.fulfill({
        status: 200,
        json: { success: true, message: 'OK', statusCode: 200, data },
      })
    if (method !== 'GET') writes.push({ path, body })
    else reads.push({ path, params: Object.fromEntries(params) })
    if (path.endsWith('/admin/me')) return ok(staff)
    if (path === '/api/v1/admin/astore/products' && method === 'GET') {
      const found = params.get('q') === 'missing' ? [] : [product]
      return ok({ ...list(found), products: found })
    }
    if (path === '/api/v1/admin/astore/products' && method === 'POST') {
      product = { ...product, ...body }
      return ok(product)
    }
    if (path === '/api/v1/admin/astore/products/p1' && method === 'GET')
      return ok(product)
    if (path === '/api/v1/admin/astore/products/p1' && method === 'PATCH') {
      if (rejectSave)
        return route.fulfill({
          status: 409,
          json: { message: 'Product changed. Try again.' },
        })
      product = { ...product, ...body }
      return ok(product)
    }
    if (path.includes('/variants')) {
      if (method === 'POST')
        product.variants.push({
          ...body,
          id: 'v1',
          colorHex: body.colorHex ?? null,
        })
      else product.variants[0] = { ...product.variants[0], ...body }
      return ok(product.variants[0])
    }
    if (path === '/api/v1/admin/users')
      return ok({ ...list([user]), users: [user] })
    if (path === '/api/v1/admin/users/u1' && method === 'GET') return ok(user)
    if (path === '/api/v1/admin/users/u1' && method === 'PATCH') {
      user.active = body.active
      return ok(user)
    }
    if (path.endsWith('/badges')) {
      user.hasBadge = true
      user.badges = [
        {
          id: 'b1',
          badgeType: 'verified',
          assignedAt: '2026-09-09',
          revokedAt: null,
          revokeReason: null,
        },
      ]
      requests[0].status = 'approved'
      return ok(user.badges[0])
    }
    if (path.endsWith('/revoke')) {
      user.hasBadge = false
      user.badges[0].revokedAt = '2026-09-09'
      user.badges[0].revokeReason = body.reason
      return ok(user.badges[0])
    }
    if (path === '/api/v1/admin/badge-requests') {
      const found = requests.filter(
        (r) => !params.get('status') || r.status === params.get('status'),
      )
      return ok({ ...list(found), requests: found })
    }
    if (path.endsWith('/approve') || path.endsWith('/reject')) {
      requests[0].status = path.endsWith('/approve') ? 'approved' : 'rejected'
      requests[0].reviewNote = body.reason ?? null
      requests[0].reviewedAt = '2026-09-09'
      return ok(requests[0])
    }
    return route.fulfill({
      status: 404,
      json: { message: 'Unexpected fixture path ' + path },
    })
  })
  await page.goto('http://127.0.0.1:3001/products')
  await page.getByRole('heading', { name: 'Products', exact: true }).waitFor()
  assert.equal(await page.locator('nav a[aria-current="page"] svg').count(), 1)
  await page.getByLabel('Search products').fill('missing')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByText('No products found.').waitFor()
  await page.getByLabel('Search products').fill('')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('link', { name: 'Manage', exact: true }).waitFor()
  await page.getByRole('link', { name: 'Add product' }).click()
  await page.getByLabel('Product name').fill('Custom NFC Card')
  await page.getByLabel('Base price').fill('1250.55')
  await page.getByRole('button', { name: 'Create product' }).click()
  await page.waitForURL('**/products/p1')
  assert.equal(product.basePriceKobo, 125055)
  await page.getByRole('button', { name: 'Add variant' }).click()
  await page.getByLabel('Color name').fill('Onyx')
  await page.getByLabel('Stock quantity').fill('12')
  await page.getByRole('button', { name: 'Save variant' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(product.variants[0].priceKobo, null)
  await page.getByRole('button', { name: 'Edit Onyx' }).click()
  await page.getByLabel('Price override').fill('0')
  await page.getByRole('button', { name: 'Save variant' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(product.variants[0].priceKobo, 0)
  await page.getByRole('button', { name: 'Edit Onyx' }).click()
  await page.getByLabel('Price override').fill('')
  await page.getByLabel('Image URLs').fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Save variant' }).click()
  await page.getByRole('alert').filter({ hasText: 'valid http' }).waitFor()
  await page.getByLabel('Image URLs').fill('')
  await page.getByRole('button', { name: 'Save variant' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(product.variants[0].priceKobo, null)
  rejectSave = true
  await page.getByLabel('Product name').fill('Unsaved name')
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Product changed' }).waitFor()
  assert.equal(
    await page.getByLabel('Product name').inputValue(),
    'Unsaved name',
  )
  rejectSave = false
  await page.getByLabel('Active — visible').uncheck()
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await page.getByText('Product saved.').waitFor()
  assert.equal(product.active, false)
  assert.equal(writes.at(-1).body.slug, undefined)
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.SCREENSHOT_DIR + '/product-editor-fixture.png',
      fullPage: true,
    })
  await page.getByRole('link', { name: 'Users', exact: true }).click()
  await page.getByRole('link', { name: 'View user' }).click()
  await page
    .getByRole('button', { name: 'Deactivate account', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Deactivate account', exact: true })
    .click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(user.active, false)
  await page
    .getByRole('button', { name: 'Reactivate account', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Reactivate account', exact: true })
    .click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(user.active, true)
  await page
    .getByRole('button', { name: 'Grant verified badge', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Grant verified badge', exact: true })
    .click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(user.hasBadge, true)
  await page
    .getByRole('button', { name: 'Revoke verified badge', exact: true })
    .click()
  await page.getByLabel('Reason (optional)').fill('Details need updating')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Revoke verified badge', exact: true })
    .click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(user.hasBadge, false)
  assert.equal(user.badges[0].revokeReason, 'Details need updating')
  requests[0].status = 'pending'
  await page.getByRole('link', { name: 'Verification', exact: true }).click()
  await page.getByRole('button', { name: 'Review request' }).click()
  assert.equal(
    await page
      .getByRole('link', { name: 'Open ID document' })
      .getAttribute('rel'),
    'noopener noreferrer',
  )
  await page.getByRole('button', { name: 'Reject', exact: true }).click()
  await page.getByLabel('Reason (optional)').fill('Document is unclear')
  await page.getByRole('button', { name: 'Confirm rejection' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.getByText('You’re all caught up.').waitFor()
  assert.equal(requests[0].status, 'rejected')
  requests[0].status = 'pending'
  await page.reload()
  await page.getByRole('button', { name: 'Review request' }).click()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm approval' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(requests[0].status, 'approved')
  await page.getByLabel('Request status').selectOption('approved')
  await page.getByRole('button', { name: 'View request' }).click()
  assert.equal(
    await page.getByRole('button', { name: 'Approve', exact: true }).count(),
    0,
  )
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('link', { name: 'Products', exact: true }).click()
  await page.getByRole('link', { name: 'Manage' }).click()
  await page.getByRole('button', { name: 'Add variant' }).click()
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.SCREENSHOT_DIR + '/variant-mobile-fixture.png',
      fullPage: true,
    })
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.deepEqual(errors, [])
  assert(reads.some((r) => r.params.q === 'missing'))
  console.log(
    'PASS: product search/create/edit/hide, kobo conversion, variant create/edit/null-vs-zero/URL validation, mutation errors preserve edits, user activation/grant/revoke, verification reject/approve/history, sidebar icons, mobile dialogs.',
  )
  await browser.close()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
