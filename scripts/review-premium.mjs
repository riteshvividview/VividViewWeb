import { chromium } from 'playwright'
import fs from 'node:fs/promises'
const out = '.local-backups/premium-2026-10-29'
const browser = await chromium.launch({headless:true})
const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1})
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://localhost:5173',{waitUntil:'networkidle'})
await page.waitForTimeout(2500)
const bounds = await page.locator('.chapter-section').evaluateAll(nodes=>nodes.map(n=>({id:n.id,top:n.offsetTop,height:n.offsetHeight})))
for(const s of bounds){
  await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),s.top)
  await page.waitForTimeout(1500)
  await page.screenshot({path:`${out}/${s.id}.png`})
}
console.log(JSON.stringify({errors,bounds,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),images:await page.locator('img').evaluateAll(ns=>ns.filter(n=>!n.complete||!n.naturalWidth).map(n=>n.src))},null,2))
await fs.writeFile(`${out}/initial-checks.json`,JSON.stringify({errors,bounds},null,2))
await browser.close()
