import fs from 'node:fs/promises'
const data=JSON.parse(await fs.readFile('src/data/portfolio.json','utf8'))
const pages=[...new Set(data.filter(x=>x.tags.includes('CONTENT')).map(x=>x.href))]
const result=[]
for(const href of pages){
  const html=await (await fetch(href)).text()
  const matches=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>({w:Number(m[0].match(/\swidth="(\d+)"/)?.[1]),h:Number(m[0].match(/\sheight="(\d+)"/)?.[1]),src:m[0].match(/\ssrc="([^"]+)"/)?.[1]})).filter(x=>x.w>350&&x.h>x.w&&x.w/x.h>.55&&x.src?.includes('framerusercontent'))
  if(!matches.length)continue
  const selected=matches[0],url=new URL(selected.src.replaceAll('&amp;','&'));url.searchParams.set('scale-down-to','1024')
  const response=await fetch(url);if(!response.ok)continue
  const src=`/images/portfolio/hero-${result.length}.jpg`
  await fs.writeFile('public'+src,Buffer.from(await response.arrayBuffer()))
  result.push({src,href,width:selected.w,height:selected.h,source:selected.src})
  if(result.length===8)break
}
await fs.writeFile('src/data/hero.json',JSON.stringify(result,null,2));console.log('Portrait hero images',result.length)
