// Fixture-based order UI checks. No live orders are modified.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1365, height: 1000 },
  })
  page.setDefaultTimeout(10000)
  let order = {
    id: 'o1',
    status: 'processing',
    totalAmountKobo: 1500000,
    subtotalKobo: 1000000,
    shippingFeeKobo: 500000,
    currency: 'NGN',
    deliveryZone: 'outside_lagos',
    shippingAddress: '12 Test Street\nAbuja',
    trackingNumber: null,
    createdAt: '2026-09-09',
    updatedAt: '2026-09-09',
    user: { id: 'u1', name: 'Jamie Doe', email: 'jamie@example.com' },
    payment: {
      id: 'p1',
      status: 'success',
      amountKobo: 1500000,
      currency: 'NGN',
      provider: 'bach',
      providerRef: 'ref-123',
      paidAt: '2026-09-09',
      failedAt: null,
    },
    items: [
      {
        id: 'i1',
        quantity: 2,
        unitPriceKobo: 500000,
        productName: 'Original custom card',
        productSlug: 'original-card',
        productType: 'custom',
        variantColorName: null,
        imageUrls: [],
        customUsername: 'jamie',
        preferredColor: 'Blue',
        instructions: 'Print the logo on the back',
        artworkUrl: 'https://example.com/art.png',
        product: {
          name: 'Changed catalog name',
          slug: 'changed-slug',
          type: 'standard',
        },
        variant: { colorName: 'New red', imageUrls: [] },
      },
    ],
  }
  const writes = []
  const reads = []
  let conflict = false
  let empty = false
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const ok = (data) =>
      route.fulfill({
        status: 200,
        json: { success: true, data, message: 'OK', statusCode: 200 },
      })
    if (path.endsWith('/admin/me'))
      return ok({
        id: 'staff',
        name: 'Alex',
        email: 'alex@example.com',
        roles: ['moderator'],
      })
    if (path.endsWith('/orders')) {
      reads.push(
        Object.fromEntries(new URL(route.request().url()).searchParams),
      )
      return ok({
        orders: empty ? [] : [order],
        pagination: {
          page: Number(
            new URL(route.request().url()).searchParams.get('page') || 1,
          ),
          limit: 10,
          total: empty ? 0 : 11,
          totalPages: empty ? 0 : 2,
        },
      })
    }
    if (path.endsWith('/orders/o1')) {
      if (route.request().method() === 'GET') return ok(order)
      const body = route.request().postDataJSON()
      writes.push(body)
      if (conflict) {
        order = {
          ...order,
          status: 'cancelled',
          payment: { ...order.payment, status: 'failed' },
        }
        return route.fulfill({
          status: 409,
          json: { message: 'Order changed. Refresh and try again.' },
        })
      }
      order = { ...order, ...body }
      return ok(order)
    }
    return route.fulfill({ status: 404, json: { message: 'Not found' } })
  })
  await page.goto('http://127.0.0.1:3001/orders')
  await page.getByRole('link', { name: 'View order' }).waitFor()
  assert.equal(await page.getByRole('link', {name:'Overview', exact:true}).count(), 1)
  assert.equal(await page.getByRole('link', {name:'Orders', exact:true}).count(), 1)
  assert.equal(await page.locator('nav .active').count(), 1)
  await page.getByRole('link', { name: 'View order' }).waitFor()
  await page
    .getByLabel('Order status', { exact: true })
    .selectOption('processing')
  await page
    .getByLabel('Payment status', { exact: true })
    .selectOption('success')
  await page.getByLabel('Search orders').fill('Jamie')
  await page.waitForResponse(r => new URL(r.url()).searchParams.get('q') === 'Jamie')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByText('Page 2 of 2', { exact: false }).waitFor()
  assert(
    reads.some(
      (r) =>
        r.q === 'Jamie' &&
        r.status === 'processing' &&
        r.paymentStatus === 'success' &&
        r.page === '2',
    ),
  )
  await page.getByRole('link', { name: 'View order' }).click()
  await page.getByRole('heading', { name: 'Original custom card' }).waitFor()
  assert.equal(
    await page.getByText('Changed catalog name', { exact: true }).count(),
    0,
  )
  await page.getByText('Print the logo on the back').waitFor()
  await page.getByText('₦15,000.00', { exact: true }).first().waitFor()
  assert.equal(
    await page
      .getByRole('button', { name: 'Cancel order', exact: true })
      .count(),
    0,
  )
  assert.equal(
    await page
      .getByRole('button', { name: 'Mark as shipped', exact: true })
      .count(),
    0,
  )
  await page.getByLabel('Tracking number').fill('TRACK-100')
  await page.getByRole('button', { name: 'Save tracking', exact: true }).click()
  await page.getByText('Tracking saved.', { exact: true }).waitFor()
  await page
    .getByRole('button', { name: 'Save tracking', exact: true })
    .waitFor()
  assert.deepEqual(writes.at(-1), { trackingNumber: 'TRACK-100' })
  await page.getByLabel('Tracking number').fill('')
  await page.getByRole('button', { name: 'Save tracking', exact: true }).click()
  await page
    .getByRole('button', { name: 'Save tracking', exact: true })
    .waitFor()
  await page.waitForFunction(
    () => document.querySelector('input')?.value === '',
  )
  assert.deepEqual(writes.at(-1), { trackingNumber: null })
  for (const status of ['ready', 'shipped', 'received']) {
    await page
      .getByRole('button', { name: `Mark as ${status}`, exact: true })
      .click()
    await page.getByRole('button', { name: 'Confirm status change' }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(order.status, status)
  }
  assert.equal(await page.getByRole('button', { name: /Mark as/ }).count(), 0)
  order = {
    ...order,
    status: 'processing',
    payment: { ...order.payment, status: 'pending' },
  }
  await page.reload()
  await page
    .getByRole('button', { name: 'Cancel order', exact: true })
    .waitFor()
  assert.equal(await page.getByRole('button', { name: /Mark as/ }).count(), 0)
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm cancellation' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(order.status, 'cancelled')
  order = {
    ...order,
    status: 'processing',
    payment: { ...order.payment, status: 'reversed' },
  }
  await page.reload()
  await page
    .getByRole('heading', { name: 'Fulfillment', exact: true })
    .waitFor()
  assert.equal(
    await page
      .getByRole('button', { name: 'Cancel order', exact: true })
      .count(),
    0,
  )
  order = {
    ...order,
    status: 'processing',
    payment: { ...order.payment, status: 'success' },
  }
  await page.reload()
  await page.getByRole('button', { name: 'Mark as ready' }).click()
  conflict = true
  await page.getByRole('button', { name: 'Confirm status change' }).click()
  await page.getByText('This order has changed.', { exact: false }).waitFor()
  assert.equal(
    await page
      .getByRole('button', { name: 'Confirm status change' })
      .isDisabled(),
    true,
  )
  await page.getByRole('button', { name: 'Go back' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.SCREENSHOT_DIR + '/order-mobile-fixture.png',
      fullPage: true,
    })
  empty = true
  await page.getByRole('link', { name: 'All orders', exact: true }).click()
  await page.getByText('No orders found.').waitFor()
  assert.deepEqual(errors, [])
  await browser.close()
  console.log(
    'PASS: order filters/pagination, snapshots/custom details/totals, tracking set/clear, paid progression, unpaid cancellation, reversed restrictions, terminal states, conflict refresh, mobile layout, empty list.',
  )
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
