import { useEffect,useMemo,useRef } from 'react'
import { useFrame,type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Arrow,ClipRegion,Label,Panel,Stroke,go,useSection } from './primitives'
import { gsap } from './motion'
import { INK,PAPER,reviews } from './layout'

const colors=['#ef6049','#f59d44','#f5d85c','#74c7a6','#c9e975','#a6dfe9','#e8b0c9','#b9b4de']
// Eight visual cards reuse the five supplied wireframe quotations. No additional
// client names or endorsements are invented for this interaction prototype.
const deckReviews=[...reviews,reviews[0],reviews[2],reviews[4]]
export function InteractiveTestimonials(){
  const {layout,reduced}=useSection(),mobile=layout.width<760
  const groups=useRef<(THREE.Group|null)[]>([]),active=useRef(-1),leaveTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  // Each card's text extends 3 scene units above its face. Keep whole card
  // layers farther apart so the next face occludes all content beneath it.
  const bases=useMemo(()=>deckReviews.map((_,i)=>({x:mobile?195+(i-3.5)*29:285+i*147,y:(mobile?535:620)+[0,13,-9,5,-8,8,-4,10][i],angle:[-.12,.07,-.045,.045,-.08,.07,-.05,.1][i],z:10+i*10,scale:1})),[mobile])
  const states=useMemo(()=>bases.map(x=>({...x})),[bases])
  useEffect(()=>{
    if(reduced)return
    const timeline=gsap.timeline({scrollTrigger:{start:()=>layout.top+(mobile?270:390)*layout.scale-window.innerHeight*.8,once:true}})
    states.forEach((state,i)=>timeline.fromTo(state,{y:bases[i].y+100,angle:bases[i].angle+.15,scale:.86},{y:bases[i].y,angle:bases[i].angle,scale:1,duration:.8,ease:'power3.out'},i*.045))
    return()=>{timeline.scrollTrigger?.kill();timeline.kill();states.forEach(s=>gsap.killTweensOf(s));clearTimeout(leaveTimer.current)}
  },[states,bases,layout.top,layout.scale,mobile,reduced])
  const select=(index:number)=>{
    clearTimeout(leaveTimer.current);if(active.current===index)return;active.current=index
    states.forEach((state,i)=>{
      const base=bases[i],chosen=i===index,distance=Math.abs(i-index),side=Math.sign(i-index)
      const push=index<0?0:(mobile?160:Math.max(105,245-distance*24))*side
      // Switch stacking atomically; tweening z would pass text through other
      // card faces while focus changes. Position/rotation still animate.
      state.z=chosen?350:base.z
      gsap.to(state,{x:chosen?(mobile?195:base.x):base.x+push,y:chosen?(mobile?521:605):base.y+(!chosen&&index>=0?distance*3:0),angle:chosen?0:base.angle+(index>=0?side*.055:0),scale:chosen?1.045:1,duration:reduced?0:.48,delay:reduced?0:Math.min(.12,distance*.018),ease:'power3.out',overwrite:true})
    })
  }
  const pick=(e:ThreeEvent<PointerEvent>|ThreeEvent<MouseEvent>)=>{
    const x=e.point.x/layout.scale+layout.width/2,y=-(e.point.y+layout.top)/layout.scale
    let hit=-1,z=-Infinity
    states.forEach((s,i)=>{const dx=x-s.x,dy=y-s.y,c=Math.cos(s.angle),a=Math.sin(s.angle),lx=dx*c+dy*a,ly=-dx*a+dy*c;if(Math.abs(lx)<(mobile?126:125)*s.scale&&Math.abs(ly)<160*s.scale&&s.z>z){hit=i;z=s.z}})
    return hit
  }
  const move=(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();const hit=pick(e);if(hit>=0){select(hit);document.body.style.cursor='pointer'}else{clearTimeout(leaveTimer.current);leaveTimer.current=setTimeout(()=>select(-1),160);document.body.style.cursor=''}}
  useFrame(()=>groups.current.forEach((g,i)=>{if(g){const s=states[i];g.position.set(s.x,-s.y,s.z);g.rotation.z=-s.angle;g.scale.setScalar(s.scale)}}))
  const advance=(direction:number)=>select((active.current+direction+deckReviews.length)%deckReviews.length)
  return <>
    {!mobile&&<><Label x={78} y={38} size={29} bold>VIVID VIEW</Label><Label x={1380} y={45} size={18} onClick={()=>go('mailto:contact@thevividview.in')}>Let’s talk</Label><Arrow x={1505} y={56} direction="up" circle={false} onClick={()=>go('mailto:contact@thevividview.in')} /></>}
    <Label x={mobile?25:82} y={mobile?36:180} size={mobile?11:14}>●   CLIENT TESTIMONIALS</Label>
    <Label x={mobile?25:82} y={mobile?78:210} size={mobile?39:75} font="hero">They say it better</Label>
    <Label x={mobile?25:82} y={mobile?125:282} size={mobile?39:75} font="hero">than we</Label>
    <Label x={mobile?193:407} y={mobile?128:279} size={mobile?44:81} font="italic">do.</Label>
    <Label x={mobile?25:993} y={mobile?201:240} width={mobile?310:282} size={mobile?14:17} color="#62635e">Real words from amazing clients who believed in our vision, and made it all happen.</Label>
    {!mobile&&<Stroke points={[[993,318],[1275,318]]} />}
    <Arrow x={mobile?277:1340} y={mobile?280:316} r={26} onClick={()=>advance(1)} />
    <Label x={mobile?25:1388} y={mobile?272:307} size={mobile?14:16} onClick={()=>advance(1)}>Explore the stories</Label>
    <Panel x={mobile?195:800} y={mobile?547:620} w={mobile?358:1444} h={mobile?459:457} radius={23} color="#222320" />
    <ClipRegion x={mobile?25:97} y={mobile?325:405} w={mobile?340:1406} h={mobile?395:422}>
      {deckReviews.map((review,i)=><group key={i} ref={g=>{groups.current[i]=g}} position={[bases[i].x,-bases[i].y,bases[i].z]}>
        <Panel x={0} y={0} w={250} h={320} radius={7} color={colors[i]} />
        <Label x={-99} y={-124} size={19} width={201} z={2} animated={false}>{`“${review.quote}”`}</Label>
        <Stroke points={[[-100,83],[100,83]]} color="#424337" opacity={.45} z={2} />
        <Panel x={-80} y={119} w={34} h={34} radius={17} color={PAPER} z={2} />
        <Label x={-80} y={119} anchor="middle" align="center" size={15} z={3} animated={false}>{review.initial}</Label>
        <Label x={-52} y={102} size={12} z={3} animated={false}>{review.name}</Label>
        <Label x={-52} y={123} size={10} z={3} animated={false}>{review.role}</Label>
      </group>)}
    </ClipRegion>
    <mesh position={[mobile?195:800,-(mobile?520:620),700]} onPointerMove={move} onPointerOut={()=>{select(-1);document.body.style.cursor=''}} onClick={e=>{e.stopPropagation();const index=pick(e);select(active.current===index?-1:index)}}><planeGeometry args={[mobile?340:1340,mobile?355:400]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    <Arrow x={mobile?113:127} y={mobile?737:622} r={mobile?21:28} direction="left" color={PAPER} onClick={()=>advance(-1)} z={750} />
    <Arrow x={mobile?277:1478} y={mobile?737:622} r={mobile?21:28} color={PAPER} onClick={()=>advance(1)} z={750} />
  </>
}
