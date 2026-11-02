import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const out='.local-backups/premium-2026-10-29';
const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1536,height:960},deviceScaleFactor:1});const errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await p.goto('http://localhost:5173',{waitUntil:'domcontentloaded'});await p.locator('.loader').waitFor({state:'detached',timeout:90000});await p.waitForTimeout(2500);
const bounds=await p.locator('.scene-anchor').evaluateAll(ns=>ns.map(n=>({id:n.id,top:n.offsetTop,height:n.offsetHeight})));
for(const s of bounds){await p.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),s.top);await p.waitForTimeout(1800);await p.screenshot({path:`${out}/brand-${s.id}.png`});
 if(s.id==='home'){await p.mouse.click(760,730);await p.waitForTimeout(300);await p.screenshot({path:`${out}/brand-typewriter-click.png`});}
 if(s.id==='people'){await p.mouse.move(765,570);await p.waitForTimeout(850);await p.screenshot({path:`${out}/brand-people-hover.png`});}
 if(s.id==='reviews'){await p.mouse.move(985,595);await p.waitForTimeout(700);await p.screenshot({path:`${out}/brand-review-hover.png`});}
}
await p.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),bounds[2].top+1800);await p.waitForTimeout(2000);await p.screenshot({path:`${out}/brand-services-mid.png`});
const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
console.log(JSON.stringify({errors,bounds,overflow}));await fs.writeFile(`${out}/brand-checks.json`,JSON.stringify({errors,bounds,overflow},null,2));await b.close();
