const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
;(async () => {
 const browser = await chromium.launch({headless:true})
 const page = await browser.newPage({viewport:{width:390,height:844}})
 let staffRole='admin', conflict=false, calls=[]
 let roles=['admin','moderator']
 await page.route('**/api/v1/**', async route => {
  const path=new URL(route.request().url()).pathname
  const ok=data=>route.fulfill({json:{success:true,data}})
  if(path.endsWith('/admin/me')) return ok({id:'actor',name:'Admin',email:'admin@test.com',roles:[staffRole]})
  if(path.endsWith('/roles/moderator/revoke')) {
   calls.push(route.request().postDataJSON()); roles=['admin']
   if(conflict) return route.fulfill({status:409,json:{message:'User is not a moderator'}})
   return ok({})
  }
  if(path.endsWith('/users/u1')) return ok({id:'u1',name:'Alex',email:'alex@test.com',active:true,isEmailVerified:true,createdAt:'2026-09-01',roles,hasBadge:false,badges:[],profile:null})
  return ok({})
 })
 await page.goto('http://127.0.0.1:3001/users/u1')
 await page.getByRole('button',{name:'Revoke moderator',exact:true}).click()
 await page.getByLabel('Reason (optional)').fill('  Staff departure  ')
 await page.getByRole('button',{name:'Cancel',exact:true}).click()
 assert.equal(calls.length,0)
 await page.getByRole('button',{name:'Revoke moderator',exact:true}).click()
 await page.getByLabel('Reason (optional)').fill('  Staff departure  ')
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.getByRole('dialog').getByRole('button',{name:'Revoke moderator',exact:true}).click()
 await page.getByText('Moderator role revoked successfully.').waitFor()
 assert.deepEqual(calls,[{reason:'Staff departure'}])
 assert.equal(await page.getByRole('button',{name:'Revoke moderator',exact:true}).count(),0)
 await page.getByText('admin',{exact:true}).waitFor()
 roles=['moderator'];conflict=true;await page.reload()
 await page.getByRole('button',{name:'Revoke moderator',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'Revoke moderator',exact:true}).click()
 await page.getByText('User is not a moderator',{exact:true}).waitFor()
 assert.deepEqual(calls[1],{})
 await page.waitForFunction(()=>document.querySelector('dialog button.danger')?.disabled)
 roles=['moderator'];staffRole='moderator';await page.reload()
 await page.getByRole('heading',{name:'Alex',exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'Revoke moderator',exact:true}).count(),0)
 await browser.close();console.log('PASS: admin-only revoke, confirm/cancel, optional trimmed reason, admin preserved, refreshed roles, conflict prevents stale retry, mobile layout')
})().catch(e=>{console.error(e);process.exit(1)})
