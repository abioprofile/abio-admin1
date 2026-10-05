const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert=require('node:assert/strict')
;(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage();page.setDefaultTimeout(10000)
 const base='https://res.cloudinary.com/fixture/image/upload/'
 let assets=0, failure=0, reads=0
 let product={id:'p1',name:'Card',slug:'card',type:'standard',basePriceKobo:10000,currency:'NGN',active:true,imageUrls:[base+'gallery.png'],metadata:{tagline:'Keep tagline',badge:'Keep badge',features:['Keep feature'],preview:{enabled:true,defaultColor:'#000000'}},variants:[{id:'v1',colorName:'Black',colorHex:'#000000',stockQty:2,priceKobo:null,active:true,imageUrls:[]}]}
 await page.addInitScript(()=>localStorage.setItem('auth_access_token','fixture'))
 await page.route('**/api/v1/**',async r=>{const p=new URL(r.request().url()).pathname;const ok=data=>r.fulfill({json:{success:true,data}})
 if(p.endsWith('/admin/me'))return ok({id:'s1',name:'Staff',email:'staff@example.com',roles:['admin']})
 if(p.endsWith('/assets')){assets++;assert(r.request().postData().includes('name="image"'));if(failure)return r.fulfill({status:failure,json:{message:'File is too large. Maximum size is 5MB.'}});await new Promise(resolve=>setTimeout(resolve,150));return ok({url:base+assets+'.png',publicId:String(assets)})}
 if(p.endsWith('/images'))return r.fulfill({status:409,json:{message:'Product already has the maximum of 10 images'}})
 if(p.endsWith('/variants/v1')){Object.assign(product.variants[0],r.request().postDataJSON());return ok(product.variants[0])}
 if(p.endsWith('/products/p1')){if(r.request().method()==='PATCH')product={...product,...r.request().postDataJSON()};else reads++;return ok(product)}
 return ok(null)})
 await page.goto('http://127.0.0.1:3001/products/p1')
 const file={name:'test.png',mimeType:'image/png',buffer:Buffer.from('fixture')}
 assert.equal(assets,0)
 await page.getByLabel('Front overlay',{exact:true}).setInputFiles(file)
 await page.getByAltText('Front overlay 1').waitFor()
 await page.getByLabel('Back overlay',{exact:true}).setInputFiles(file)
 await page.getByAltText('Back overlay 1').waitFor()
 await page.getByRole('button',{name:'Save product',exact:true}).click()
 await page.getByText('Product saved.',{exact:true}).waitFor()
 assert.equal(product.metadata.tagline,'Keep tagline');assert.equal(product.metadata.badge,'Keep badge');assert.deepEqual(product.metadata.features,['Keep feature'])
 assert(product.metadata.preview.frontOverlayUrl.startsWith(base));assert(product.metadata.preview.backOverlayUrl.startsWith(base))
 await page.reload();await page.getByAltText('Front overlay 1').waitFor();await page.getByAltText('Back overlay 1').waitFor()
 await page.getByRole('button',{name:'Edit Black',exact:true}).click()
 await page.getByLabel('Variant images',{exact:true}).setInputFiles(file)
 await page.getByAltText('Variant images 1').waitFor()
 await page.getByRole('button',{name:'Save variant',exact:true}).click()
 await page.getByRole('dialog').waitFor({state:'hidden'})
 await page.reload();await page.getByRole('button',{name:'Edit Black',exact:true}).click();await page.getByAltText('Variant images 1').waitFor()
 await page.getByRole('button',{name:'Cancel',exact:true}).click()
 const before=assets
 await page.getByLabel('Front overlay',{exact:true}).setInputFiles({...file,buffer:Buffer.alloc(5*1024*1024+1)})
 await page.getByRole('alert').filter({hasText:'File is too large. Maximum size is 5MB.'}).waitFor();assert.equal(assets,before)
 failure=413
 await page.getByLabel('Back overlay',{exact:true}).setInputFiles(file)
 await page.getByRole('alert').filter({hasText:'File is too large.'}).last().waitFor()
 assert(await page.getByRole('button',{name:'Save product',exact:true}).isEnabled())
 const oldReads=reads
 await page.getByLabel('Upload product image',{exact:true}).setInputFiles(file)
 await page.getByText('Product already has the maximum of 10 images',{exact:true}).waitFor()
 await page.waitForTimeout(300);assert(reads>oldReads)
 console.log('PASS upload/save/reload for variants and overlays, metadata preservation, oversized-file prevention, backend 413, gallery 409 refresh (mocked)')
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)})
