import { useEffect,useMemo,useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Arrow,Label,Panel,Photo,Stroke,go,useSection } from './primitives'
import { filterPortfolio,galleryMetrics,galleryTabs,useGallery,type PortfolioCard } from './galleryData'
import { gsap,ScrollTrigger,smoothScroll } from './motion'
import { INK } from './layout'

export function WorkGallery(){
  const {layout,scroll,reduced}=useSection(),{filter,setFilter}=useGallery()
  const mobile=layout.width<760
  const viewportHeight=useThree(state=>state.size.height)
  const cards=useMemo(()=>filterPortfolio(filter),[filter])
  const metrics=useMemo(()=>galleryMetrics(cards.length,mobile),[cards.length,mobile])
  const pin=useRef<THREE.Group>(null),rail=useRef<THREE.Group>(null),transition=useRef<THREE.Group>(null)
  const progress=useRef({value:0}),busy=useRef(false)
  const pinTop=mobile?70:Math.max(60,(viewportHeight-metrics.deckHeight*layout.scale)/2)
  const start=layout.top+metrics.deckTop*layout.scale-pinTop
  useEffect(()=>{
    progress.current.value=0
    if(transition.current){gsap.fromTo(transition.current.scale,{x:.97,y:.97},{x:1,y:1,duration:reduced?0:.6,ease:'power3.out'});gsap.to(transition.current.position,{y:0,duration:.4})}
    busy.current=false
    const timer=setTimeout(()=>{smoothScroll?.resize();ScrollTrigger.refresh()},100)
    return ()=>{clearTimeout(timer)}
  },[filter,start,metrics.travel,layout.scale,reduced])
  useFrame(()=>{
    // Do not drive the pin from a separate ScrollTrigger ticker: even a
    // one-frame difference from the camera produces vertical trembling.
    const travel=THREE.MathUtils.clamp((scroll.current-start)/layout.scale,0,metrics.travel)
    progress.current.value=metrics.travel>0?travel/metrics.travel:0
    if(pin.current&&rail.current){pin.current.position.y=-travel;rail.current.position.x=-travel}
  }, -1)
  const change=(next:string)=>{
    if(next===filter||busy.current)return
    busy.current=true
    if(reduced||!transition.current){setFilter(next);return}
    gsap.to(transition.current.scale,{x:.95,y:.95,duration:.18,ease:'power2.in',onComplete:()=>setFilter(next)})
    gsap.to(transition.current.position,{y:-24,duration:.18})
  }
  return <>
    <Label x={mobile?22:100} y={mobile?32:57} size={mobile?11:13}>●   OUR WORK</Label>
    <Label x={mobile?22:100} y={mobile?64:92} font="serif" size={mobile?42:57} lineHeight={.98}>Ideas{ '\n' }brought</Label>
    <Label x={mobile?22:100} y={mobile?150:201} font="italic" size={mobile?42:57}>to Life.</Label>
    {!mobile&&<Stroke points={[[320,128],[320,243]]} />}
    <Label x={mobile?197:350} y={mobile?85:128} width={mobile?167:270} size={mobile?12:16} color="#64645c">A glimpse of the brands, campaigns and digital experiences we’ve created across industries.</Label>
    <Arrow x={mobile?215:374} y={mobile?188:227} r={mobile?19:23} onClick={()=>go('https://thevividview.in/our-work')} />
    <Label x={mobile?243:418} y={mobile?181:219} size={mobile?12:16} onClick={()=>go('https://thevividview.in/our-work')}>View all work</Label>
    {!mobile&&<Stroke points={[[1375,58],[1375,240]]} />}
    {galleryTabs.map((tab,i)=><Label key={tab} x={mobile?22+i*72:1410} y={mobile?251:59+i*34} size={mobile?9:14} color={tab===filter?INK:'#77776e'} onClick={()=>change(tab)}>{`${tab===filter?'• ':''}${tab}${mobile?'':`  (${filterPortfolio(tab).length})`}`}</Label>)}
    <group ref={pin} name="work-gallery-pin"><group ref={transition}><group ref={rail} name="work-gallery-rail">
      {cards.map((card,i)=><GalleryCard key={`${filter}-${card.id}`} card={card} box={metrics.cards[i]} index={i} start={start} progress={progress} travel={metrics.travel} />)}
    </group></group>
      <Label x={mobile?24:42} y={metrics.deckTop+metrics.deckHeight+25} size={mobile?9:12} animated={false} color="#74756b">SCROLL TO EXPLORE  —  {cards.length} SELECTED PROJECT VIEWS</Label>
      <Arrow x={mobile?355:1530} y={metrics.deckTop+metrics.deckHeight+31} r={mobile?17:24} onClick={()=>{const target=Math.min(start+metrics.travel*layout.scale,scroll.current+window.innerWidth*.75);smoothScroll?smoothScroll.scrollTo(target):window.scrollTo({top:target,behavior:'smooth'})}} />
    </group>
  </>
}

function GalleryCard({card,box,index,start,progress,travel}:{card:PortfolioCard;box:{x:number;y:number;w:number;h:number};index:number;start:number;progress:React.MutableRefObject<{value:number}>;travel:number}){
  const {layout,reduced}=useSection(),mobile=layout.width<760
  const entrance=useRef<THREE.Group>(null),visibility=useRef<THREE.Group>(null)
  useEffect(()=>{
    if(!entrance.current||reduced)return
    const tween=gsap.fromTo(entrance.current.position,{y:-46,z:-35},{y:0,z:0,duration:.7,delay:(index%5)*.035,ease:'power3.out',scrollTrigger:{start:()=>Math.max(layout.top-window.innerHeight*.6,start+Math.max(0,box.x-layout.width+80)*layout.scale-120),once:true}})
    return ()=>{tween.scrollTrigger?.kill();tween.kill()}
  },[layout.top,layout.scale,layout.width,reduced,start,box.x,index])
  useFrame(()=>{if(visibility.current){const x=box.x-progress.current.value*travel;visibility.current.visible=x+box.w>-100&&x<layout.width+100}})
  const caption=mobile?51:57,href=card.href??'https://thevividview.in/our-work'
  return <group ref={visibility}><group ref={entrance}>
    <Panel x={box.x+box.w/2} y={box.y+box.h/2} w={box.w} h={box.h} border />
    <Photo src={card.src} x={box.x+box.w/2} y={box.y+(box.h-caption)/2} w={box.w-2} h={box.h-caption-1} href={href} />
    <Label x={box.x+12} y={box.y+box.h-caption+10} size={mobile?11:15} width={box.w-52} animated={false}>{card.title}</Label>
    <Label x={box.x+12} y={box.y+box.h-caption+32} size={mobile?8:11} animated={false} color="#63645e">{card.sub}</Label>
    <Arrow x={box.x+box.w-(mobile?20:30)} y={box.y+box.h-caption/2} r={mobile?13:18} onClick={()=>go(href)} />
  </group></group>
}
