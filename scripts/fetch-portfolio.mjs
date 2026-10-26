import fs from 'node:fs/promises'
const base='https://thevividview.in'
const groups=[['branding',12,['BRANDING']],['digital-marketing',12,['DIGITAL','CAMPAIGNS']],['media-production',12,['CONTENT']],['website-development',5,['DIGITAL']]]
const out='.local-backups/interactive-2026-10-26-research'
await fs.mkdir(out,{recursive:true});await fs.mkdir('public/images/portfolio',{recursive:true})
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"')
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`${r.status} ${url}`);return r.text()}
const images=html=>{
  const list=[]
  for(const tag of html.matchAll(/<img\b[^>]*>/g)){
    const src=tag[0].match(/\ssrc="([^"]+)"/)?.[1],w=Number(tag[0].match(/\swidth="(\d+)"/)?.[1]),h=Number(tag[0].match(/\sheight="(\d+)"/)?.[1])
    if(src?.includes('framerusercontent.com/images')&&w>=350&&h>=250)list.push({url:decode(src),w,h})
  }
  return [...new Map(list.map(x=>[x.url.split('?')[0],x])).values()]
}
const records=[];const used=new Set()
for(const [category,count,tags] of groups){
  const html=await get(`${base}/${category}`);await fs.writeFile(`${out}/${category}.html`,html)
  const links=[...new Set([...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).filter(s=>s.includes(`${category}/`)).map(s=>new URL(s.replace(/^\.\//,'/'),base).href))]
  console.log(category,'cases',links.length)
  const cases=[]
  for(let i=0;i<links.length;i+=4){
    const batch=await Promise.allSettled(links.slice(i,i+4).map(async href=>({href,images:images(await get(href))})))
    cases.push(...batch.filter(x=>x.status==='fulfilled').map(x=>x.value))
  }
  let added=0,round=0
  while(added<count && round<20){
    for(const entry of cases){
      const photo=entry.images[round];if(!photo||used.has(photo.url.split('?')[0])||added>=count)continue
      const slug=entry.href.split('/').pop(),title=slug.split('-').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ')
      const url=new URL(photo.url);url.searchParams.set('scale-down-to','1024')
      const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)continue
      const extension=(r.headers.get('content-type')??'').includes('webp')?'webp':(r.headers.get('content-type')??'').includes('png')?'png':'jpg'
      const filename=`${category}-${String(added+1).padStart(2,'0')}.${extension}`
      await fs.writeFile(`public/images/portfolio/${filename}`,Buffer.from(await r.arrayBuffer()))
      records.push({id:`${category}-${added}`,title,sub:category==='branding'?'Brand Identity':category==='digital-marketing'?'Digital Campaign':category==='website-development'?'Website Design':'Media Production',tags,src:`/images/portfolio/${filename}`,href:entry.href,source:photo.url,width:photo.w,height:photo.h,view:round+1})
      used.add(photo.url.split('?')[0]);added++
    }
    round++
  }
  console.log(category,'downloaded',added)
}
await fs.mkdir('src/data',{recursive:true})
await fs.writeFile('src/data/portfolio.json',JSON.stringify(records,null,2))
console.log('TOTAL',records.length)
