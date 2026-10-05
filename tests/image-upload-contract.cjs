const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
;(async () => {
 const browser = await chromium.launch({headless:true})
 try {
  const page = await browser.newPage()
  const requests=[]
  await page.route('**/api/v1/**',async route=>{
   const request=route.request()
   if (['POST','PATCH'].includes(request.method())) requests.push({method:request.method(),body:request.postData(),type:request.headers()['content-type']})
   await route.fulfill({json:{success:true,data:request.url().endsWith('/themes') && request.method()==='GET' ? [] : {id:'test',name:'Test',wallpaper_config:{type:'image',image:'https://res.cloudinary.com/fixture/image/upload/test.png'}}}})
  })
  await page.goto('http://127.0.0.1:3001/auth/sign-in')
  await page.evaluate(async()=>{
   const api=await import('/src/features/themes/themes.api.ts')
   const body={name:'Test',font_config:{name:'Arial',italic:true},corner_config:{type:'sharp',opacity:0.5},wallpaper_config:{type:'image',image:'blob:preview'}}
   const file=new File(['fixture'],'test.png',{type:'image/png'})
   await api.createTheme(body,file)
   await api.updateTheme('test',body,file)
  })
  assert.equal(requests.length,2)
  for(const request of requests){
   assert(request.type.startsWith('multipart/form-data; boundary='))
   assert(request.body.includes('name="wallpaper_config[image]"; filename="test.png"'))
   assert(request.body.includes('"opacity":0.5'))
   assert(request.body.includes('"italic":true'))
   assert(!request.body.includes('blob:preview'))
   assert(!request.body.includes('corner_config[opacity]'))
  }
  await page.evaluate(async()=>{
   const {management}=await import('/src/features/admin/api/management.api.ts')
   await management.uploadProductImage('test',new File(['fixture'],'test.png',{type:'image/png'}))
  })
  assert(requests.at(-1).body.includes('name="image"; filename="test.png"'))
  const customer=await browser.newPage()
  const writes=[]
  await customer.route('**/api/v1/**',async route=>{
    writes.push({url:route.request().url(),body:route.request().postData()})
    await route.fulfill({json:{success:true,data:{url:'https://res.cloudinary.com/fixture/image/upload/test.png',publicId:'test'}}})
  })
  await customer.goto('http://127.0.0.1:3000/auth/sign-in')
  const outcome=await customer.evaluate(async()=>{
   const appearance=await import('/src/features/appearance/api/appearance.api.ts')
   const profile=await import('/src/features/profile/api/profile.api.ts')
   const {commerce}=await import('/src/features/commerce/api.ts')
   const file=new File(['fixture'],'test.png',{type:'image/png'})
   const upload=await appearance.uploadWallpaperImage(file)
   await appearance.updatePreferences({wallpaper_config:{type:'image',image:upload.data.url}})
   await profile.updateProfileAvatar(file)
   await profile.updateProfile({bio:'Test',avatarUrl:'https://external.example/image.png'})
   await commerce.add({productId:'test',quantity:1,artworkUrl:upload.data.url})
   let blocked=false
   try { await commerce.add({productId:'test',quantity:1,artworkUrl:'/images/legacy.png'}) } catch { blocked=true }
   return blocked
  })
  assert(outcome)
  assert(writes.find(x=>x.url.endsWith('/wallpaper/image')).body.includes('name="image"'))
  assert(writes.find(x=>x.url.endsWith('/profile/avatar')).body.includes('name="avatar"'))
  assert(!writes.find(x=>x.url.endsWith('/user/profile')).body.includes('avatarUrl'))
  assert(JSON.parse(writes.find(x=>x.url.endsWith('/cart/items')).body).artworkUrl.startsWith('https://res.cloudinary.com/'))
  console.log('PASS theme create/edit multipart, product upload, wallpaper upload then save, avatar endpoint, stripped avatarUrl, and cart URL guard (mocked APIs)')
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)})
