// Shared catalog fixtures; no real products, uploads, or purchases are created.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  let product = {
    id: 'p1',
    slug: 'card',
    name: 'Catalog Card',
    type: 'standard',
    basePriceKobo: 3500000,
    currency: 'NGN',
    active: true,
    imageUrls: [
      'https://images.test/front.png',
      'https://images.test/back.png',
    ],
    metadata: {
      tagline: 'From the admin',
      badge: 'Featured',
      features: ['One tap'],
      preview: { enabled: true, defaultColor: '#000000' },
    },
    variants: [
      {
        id: 'v1',
        colorName: 'Black',
        colorHex: '#000000',
        imageUrls: [],
        stockQty: 4,
        priceKobo: 4000000,
        active: true,
      },
      {
        id: 'v2',
        colorName: 'White',
        colorHex: '#ffffff',
        imageUrls: [],
        stockQty: 0,
        priceKobo: 0,
        active: true,
      },
    ],
  }
  await page.route('**/api/v1/**', (r) => {
    const p = new URL(r.request().url()).pathname
    const ok = (data) => r.fulfill({ json: { success: true, data } })
    if (p.endsWith('/cart/artwork')) return ok({url:'https://images.test/art.png'})
    if (p.endsWith('/admin/me'))
      return ok({ id: 'a1', name: 'Admin', roles: ['admin'] })
    if (p.endsWith('/admin/astore/products/p1')) {
      if (r.request().method() === 'PATCH')
        product = { ...product, ...r.request().postDataJSON() }
      return ok(product)
    }
    if (p.endsWith('/astore/products'))
      return ok({ products: [product], pagination: { totalPages: 1 } })
    return ok([])
  })
  await page.route('https://images.test/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="400" height="250" fill="black"/></svg>',
    }),
  )
  await page.goto('http://127.0.0.1:3001/products/p1')
  await page
    .getByLabel('Tagline', { exact: true })
    .fill('Admin updated tagline')
  await page.locator('textarea[name=features]').fill('Durable\nReady to share')
  await page.locator('input[name=slug]').fill('updated-card')
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await page.getByText('Product saved.', { exact: true }).waitFor()
  assert.equal(product.metadata.tagline, 'Admin updated tagline')
  assert.deepEqual(product.metadata.features, ['Durable', 'Ready to share'])
  assert.equal(product.slug, 'updated-card')
  assert.equal(product.imageUrls.length, 2)
  await page.goto('http://127.0.0.1:3000/store')
  await page.getByText('Admin updated tagline', { exact: true }).waitFor()
  assert.equal(await page.getByText('15%', { exact: false }).count(), 0)
  await page.getByRole('heading', { name: 'Catalog Card', exact: true }).click()
  await page.getByText('₦40,000.00', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  assert(
    await page
      .getByRole('button', { name: 'Add to Cart', exact: true })
      .isDisabled(),
  )
  await page.getByRole('button', { name: 'Black', exact: true }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByLabel('back card preview in #000000').waitFor()
  await page.getByRole('button', { name: 'View cart', exact: true }).click()
  await page.getByText('₦40,000.00 each', { exact: true }).waitFor()
  const cart = await page.evaluate(
    () => JSON.parse(localStorage.getItem('abio-cart')).state.items,
  )
  assert.equal(cart[0].variantId, 'v1')
  assert.equal(cart[0].productId, 'p1')
  await page.addInitScript(() => {
    localStorage.setItem('auth_access_token', 'fixture')
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'u1',
        name: 'Buyer',
        isOnboardingCompleted: true,
        profile: { username: 'buyer' },
      }),
    )
  })
  await page.goto('http://127.0.0.1:3000/dashboard/store')
  await page.getByText('Admin updated tagline', { exact: true }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  )
  await page.screenshot({
    path: '/tmp/catalog-dashboard-mobile.png',
    fullPage: true,
  })
  await page.goto('http://127.0.0.1:3000/')
  await page.getByText('Admin updated tagline', { exact: true }).waitFor()
  product = {...product, id:'p2',type:'custom',variants:[]}
  await page.goto('http://127.0.0.1:3000/store')
  await page.getByRole('heading',{name:'Catalog Card',exact:true}).click()
  await page.getByLabel('Name / username',{exact:true}).fill('alex')
  await page.getByLabel('Artwork (optional)',{exact:true}).setInputFiles({name:'art.png',mimeType:'image/png',buffer:Buffer.from('fixture')})
  await page.getByAltText('Uploaded artwork',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Add to Cart',exact:true}).click()
  await page.getByLabel('Name / username',{exact:true}).fill('sam')
  await page.getByRole('button',{name:'Add to Cart',exact:true}).click()
  const customItems=await page.evaluate(()=>JSON.parse(localStorage.getItem('abio-cart')).state.items.filter(i=>i.productId==='p2'))
  assert.equal(customItems.length,2)
  assert.equal(customItems[0].variantId,undefined)
  assert.equal(customItems[0].artworkUrl,'https://images.test/art.png')
  assert.equal(customItems[1].customUsername,'sam')
  await browser.close()
  console.log(
    'PASS admin metadata/gallery/slug -> public store + dashboard + landing, variant prices incl zero, stock, preview, cart IDs, no discount, mobile',
  )
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
