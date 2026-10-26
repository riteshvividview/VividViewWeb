import { chromium } from 'playwright'
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1600,height:1000}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.goto('http://localhost:5173',{waitUntil:'domcontentloaded'});await page.locator('.loader').waitFor({state:'detached',timeout:60000});await page.waitForTimeout(1200)
console.log(await page.evaluate(async()=>{const fiber=await import('/node_modules/.vite/deps/@react-three_fiber.js');window.reviewRoot=[...fiber._roots.values()][0].store;return !!window.reviewRoot}))
await page.evaluate(()=>window.scrollTo({top:1700,behavior:'instant'}));await page.waitForTimeout(800)
await page.evaluate(()=>{window.samples=[];let count=0;const sample=()=>{const s=window.reviewRoot.getState(),pin=s.scene.getObjectByName('work-gallery-pin'),rail=s.scene.getObjectByName('work-gallery-rail');if(pin){pin.updateWorldMatrix(true,false);window.samples.push({y:pin.matrixWorld.elements[13]-s.camera.position.y,x:rail.position.x})}if(++count<100)requestAnimationFrame(sample)};requestAnimationFrame(sample)})
await page.mouse.wheel(0,900);await page.waitForTimeout(3500)
console.log(await page.evaluate(()=>{const a=window.samples;return {samples:a.length,verticalDrift:Math.max(...a.map(x=>x.y))-Math.min(...a.map(x=>x.y)),horizontalTravel:a[0].x-a.at(-1).x,reversals:a.slice(1).filter((x,i)=>x.x>a[i].x+.01).length}}));console.log({errors})
await page.screenshot({path:'.local-backups/gallery-smooth-2026-10-26/verified.png'});await browser.close()

