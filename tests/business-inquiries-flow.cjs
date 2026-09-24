const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    let empty = false, fail = false, missing = false
    const searches = []
    await page.addInitScript(() => localStorage.setItem('auth_access_token', 'fixture'))
    await page.route('**/api/v1/**', route => {
      const url = new URL(route.request().url())
      const ok = data => route.fulfill({ json: { success: true, data } })
      if (url.pathname.endsWith('/admin/me')) return ok({ id:'staff', name:'Moderator', email:'staff@example.com', roles:['moderator'] })
      if (url.pathname.includes('/admin/business-inquiries/')) {
        if (missing) return route.fulfill({status:404,json:{message:'Business inquiry not found'}})
        return ok({id:'detail',companyName:'Fresh company detail',fullName:'Jane Doe',email:'jane@example.com',phone:'+2348000000000',companySize:'11–50',industry:'Design',features:['Team cards'],createdAt:'2026-09-24T09:00:00Z',user:null})
      }
      if (url.pathname.endsWith('/admin/business-inquiries')) {
        if (fail) return route.fulfill({ status:400, json:{message:'Unable to load enquiries'} })
        const current = Number(url.searchParams.get('page'))
        assert.equal(url.searchParams.get('limit'), '20')
        searches.push({q:url.searchParams.get('q'),page:current})
        return ok({ inquiries: empty ? [] : [{ id:'lead-'+current, companyName:'Company '+current, fullName:'Jane Doe', email:'jane@example.com', phone:'+2348000000000', companySize:'11–50', industry:'Design', features:['Team cards','Analytics'], createdAt:'2026-09-24T09:00:00Z', user:{id:'user1',name:'Jane',email:'account@example.com'} }], pagination:{page:current,limit:20,total:empty?0:21,totalPages:empty?0:2} })
      }
      return ok(null)
    })
    await page.goto('http://localhost:3001/business-inquiries')
    await page.getByRole('button',{name:'View enquiry from Company 1'}).click()
    await page.getByRole('dialog').getByText('Team cards',{exact:true}).waitFor()
    assert.equal(await page.getByRole('dialog').getByRole('link',{name:'jane@example.com'}).getAttribute('href'),'mailto:jane@example.com')
    await page.getByRole('button',{name:'Close dialog'}).click()
    await page.getByRole('button',{name:'Next',exact:true}).click()
    await page.getByRole('button',{name:'View enquiry from Company 2'}).waitFor()
    const search = page.getByRole('textbox',{name:'Search business enquiries'})
    await search.fill(' Jane ')
    await page.getByRole('button',{name:'View enquiry from Company 1'}).waitFor()
    assert.deepEqual(searches.at(-1),{q:'Jane',page:1})
    await search.fill('')
    await page.waitForTimeout(600) // Clearing search may reuse the cached first page.
    missing = true
    await page.getByRole('button',{name:'View enquiry from Company 1'}).click()
    await page.getByText('This business enquiry could not be found.',{exact:false}).waitFor()
    await page.getByRole('button',{name:'Close dialog'}).click()
    missing = false
    await page.setViewportSize({width:390,height:844})
    await page.getByRole('button',{name:'View enquiry from Company 1'}).click()
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.getByRole('button',{name:'Close dialog'}).click()
    empty = true
    await page.getByRole('button',{name:'Refresh',exact:true}).click()
    await page.getByText('No business enquiries yet.').waitFor()
    fail = true
    await page.getByRole('button',{name:'Refresh',exact:true}).click()
    await page.getByRole('button',{name:'Try again'}).waitFor()
    fail = false
    await page.getByRole('button',{name:'Try again'}).click()
    await page.getByText('No business enquiries yet.').waitFor()
    assert.deepEqual(errors,[])
    console.log('PASS moderator access, list, detail, contacts, pagination, mobile, empty state and error recovery')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
