import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Label, Photo, Stroke, useSection } from './primitives'
import { gsap } from './motion'
import { INK, PAPER } from './layout'

type Frame = { x: number; y: number; w: number; h: number; a: number; z: number; image: number }
export type Strip = { x: number; y: number; angle: number; length: number; z: number }
// Film strips fly in and spread with the photo cards instead of sitting fixed.
// renderStrip draws one strip centered on the origin, unrotated.
export function InteractivePeople({ frames, team, strips = [], renderStrip, children }: { frames: Frame[]; team: string[]; strips?: Strip[]; renderStrip?: (strip: Strip) => ReactNode; children?: ReactNode }) {
  const { layout, reduced, scroll } = useSection()
  const mobile = layout.width < 760, center = layout.width / 2
  const cards = useMemo(() => {
    const outer = mobile ? frames.filter((_,i)=>i%2===0).map((f,i)=>({ ...f, x: center + (f.x-800)*.27, y: 600 + (f.y-500)*.85, w: f.w*.48, h:f.h*.6, a:f.a, z: i })) : frames.map(f=>({...f,y:f.y+100}))
    const middle = Array.from({length:mobile?7:9},(_,i)=>({x:center+((i%3)-1)*(mobile?91:175)+(i%2?20:-15),y:(mobile?410:425)+Math.floor(i/3)*(mobile?135:155),w:mobile?145:238,h:mobile?190:285,a:[-17,12,-9,18,-7,13,-15,8,20][i],z:45+i,image:(i+2)%team.length}))
    return [...outer,...middle]
  },[frames,team,mobile,center])
  const groups=useRef<(THREE.Group|null)[]>([])
  const title=useRef<THREE.Group>(null)
  const flights=useMemo(()=>cards.map(()=>({value:reduced?1:0})),[cards,reduced])
  const stripGroups=useRef<(THREE.Group|null)[]>([])
  const stripFlights=useMemo(()=>strips.map(()=>({value:reduced?1:0})),[strips,reduced])
  const reveal=useRef({value:0,pulse:1})
  const active=useRef(-1), timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  const ripple=useMemo(()=>({uReveal:{value:0},uPulse:{value:1},uTime:{value:0},uColor:{value:new THREE.Color(PAPER)},uAspect:{value:mobile?.8:1.3},uOrigin:{value:new THREE.Vector2(.5,.5)}}),[mobile])

  useEffect(()=>{
    if(reduced) return
    const timeline=gsap.timeline({scrollTrigger:{start:()=>layout.top-window.innerHeight*.72,once:true,invalidateOnRefresh:true}})
    timeline.to(flights,{value:1,duration:1.05,stagger:{each:.02,from:'center'},ease:'power3.out'})
    if(stripFlights.length) timeline.to(stripFlights,{value:1,duration:1.2,stagger:.08,ease:'power3.out'},.1)
    return ()=>{timeline.scrollTrigger?.kill();timeline.kill()}
  },[layout.top,layout.height,flights,stripFlights,reduced])
  useEffect(()=>()=>{clearTimeout(timer.current);gsap.killTweensOf(reveal.current)},[])

  const select=(index:number,x=center,y=600)=>{
    clearTimeout(timer.current)
    if(index===active.current) return
    active.current=index
    gsap.to(reveal.current,{value:index<0?0:1,duration:reduced?0:.65,ease:'power3.out',overwrite:'auto'})
    if(index>=0){
      ripple.uOrigin.value.set(THREE.MathUtils.clamp((x-center)/(mobile?350:850)+.5,.15,.85),THREE.MathUtils.clamp(.5-(y-600)/650,.15,.85))
      reveal.current.pulse=0;gsap.to(reveal.current,{pulse:1,duration:1.05,ease:'power2.out',overwrite:'auto'})
    }
  }
  const hit=(event:ThreeEvent<PointerEvent>|ThreeEvent<MouseEvent>)=>{
    const x=event.point.x/layout.scale+layout.width/2,y=-(event.point.y+layout.top)/layout.scale
    let found=-1, highest=-Infinity
    groups.current.forEach((group,i)=>{
      if(!group || flights[i].value<.65) return
      const dx=x-group.position.x,dy=y+group.position.y,a=group.rotation.z,c=Math.cos(a),s=Math.sin(a)
      const lx=dx*c-dy*s,ly=dx*s+dy*c
      if(Math.abs(lx)<cards[i].w*group.scale.x/2+17 && Math.abs(ly)<cards[i].h*group.scale.y/2+24 && group.position.z>highest){found=i;highest=group.position.z}
    })
    return {found,x,y}
  }
  const move=(e:ThreeEvent<PointerEvent>)=>{
    e.stopPropagation();const {found,x,y}=hit(e)
    if(found>=0){select(found,x,y);document.body.style.cursor='pointer'}
    else if(active.current>=0 && Math.abs(x-center)<(mobile?150:340) && y>350 && y<830) {clearTimeout(timer.current)}
    else {clearTimeout(timer.current);timer.current=setTimeout(()=>select(-1),130);document.body.style.cursor=''}
  }

  useFrame(({clock,size},dt)=>{
    if(scroll.current+size.height<layout.top-350 || scroll.current>layout.top+layout.height+350) return
    const open=reveal.current.value
    groups.current.forEach((group,i)=>{
      if(!group) return
      const card=cards[i],flight=flights[i].value
      let tx=card.x,ty=card.y,tz=card.z*2,angle=-card.a*Math.PI/180
      const dx=card.x-center,dy=card.y-600
      const radiusX=mobile?220:500,radiusY=mobile?320:340
      const distance=Math.max(.025,Math.hypot(dx/radiusX,dy/radiusY))
      const wave=THREE.MathUtils.smoothstep(open,Math.min(.16,distance*.08),1)
      if(distance<1.12){
        const push=1.12/distance
        tx=THREE.MathUtils.lerp(card.x,center+dx*push,wave)
        ty=THREE.MathUtils.lerp(card.y,600+dy*push,wave)
        angle+=Math.sign(dx||1)*wave*.08
      }
      const fromX=center+(i%2?-1:1)*(mobile?470:1300),fromY=layout.designHeight+350+(i%4)*90
      const airborne=1-flight
      const targetX=THREE.MathUtils.lerp(fromX,tx,flight), targetY=THREE.MathUtils.lerp(fromY,ty,flight)-Math.sin(flight*Math.PI)*(mobile?150:330)
      group.position.x=THREE.MathUtils.damp(group.position.x,targetX,18,dt)
      group.position.y=THREE.MathUtils.damp(group.position.y,-targetY,18,dt)
      group.position.z=THREE.MathUtils.damp(group.position.z,tz+airborne*270,16,dt)
      group.rotation.z=THREE.MathUtils.damp(group.rotation.z,angle+airborne*(i%2?1:-1)*2.1,16,dt)
      group.rotation.x=airborne*.7
      group.rotation.y=airborne*(i%2?.4:-.4)
      const scale=(.55+.45*flight)*.82
      group.scale.setScalar(scale)
    })
    stripGroups.current.forEach((group,i)=>{
      if(!group) return
      const strip=strips[i],flight=stripFlights[i].value,airborne=1-flight
      // Same outward push as the cards when a photo is opened.
      const dx=strip.x-center,dy=strip.y-600,push=THREE.MathUtils.smoothstep(open,0,1)*.18
      const tx=strip.x+dx*push,ty=strip.y+dy*push
      const fromX=center+(i%2?1:-1)*(mobile?470:1300),fromY=layout.designHeight+350
      group.position.x=THREE.MathUtils.damp(group.position.x,THREE.MathUtils.lerp(fromX,tx,flight),14,dt)
      group.position.y=THREE.MathUtils.damp(group.position.y,-(THREE.MathUtils.lerp(fromY,ty,flight)-Math.sin(flight*Math.PI)*(mobile?120:260)),14,dt)
      group.rotation.z=-strip.angle*Math.PI/180+airborne*(i%2?-1:1)*1.6+Math.sin(clock.elapsedTime*.6+i)*.015
      group.rotation.x=airborne*.6
    })
    if(title.current){const opacity=THREE.MathUtils.smoothstep(open,.45,.94);title.current.visible=opacity>.01;title.current.scale.setScalar(.96+opacity*.04);title.current.traverse(object=>{if((object as THREE.Mesh).isMesh){const material=(object as THREE.Mesh).material;for(const m of Array.isArray(material)?material:[material]){m.transparent=true;m.opacity=opacity}}})}
  })
  return <>
    <group position={[0,-100,-10]}>{children}</group>
    {renderStrip && strips.map((s,i)=><group key={i} ref={g=>{stripGroups.current[i]=g}} position={[s.x,-s.y,s.z-10]}>{renderStrip(s)}</group>)}
    {cards.map((c,i)=><group key={i} ref={g=>{groups.current[i]=g}} position={[c.x,-c.y,c.z*2]}><Photo src={team[c.image]} w={c.w} h={c.h} framed interactive={false} focus={[.5,.6]} /></group>)}
    <group ref={title} position={[center,-600,400]} visible={false}>
      <Label x={0} y={mobile?-173:-200} align="center" size={mobile?7:10} tracking={.18}>DESIGN  —  STRATEGY  —  STORYTELLING</Label>
      <Label x={0} y={mobile?-153:-180} align="center" size={mobile?7:10} tracking={.18}>COLLABORATION  —  IMPACT</Label>
      <Label x={0} y={-120} font="serif" align="center" size={mobile?42:62} lineHeight={.9}>Creative{ '\n' }minds.</Label>
      <Label x={0} y={mobile?-35:-9} font="italic" align="center" size={mobile?44:65}>Real people.</Label>
      <Stroke points={[[-20,mobile?28:79],[20,mobile?28:79]]} color={INK} />
      <Label x={0} y={mobile?56:115} align="center" size={mobile?8:11} tracking={.18}>DIFFERENT PERSPECTIVES.</Label>
      <Label x={0} y={mobile?75:137} align="center" size={mobile?8:11} tracking={.18}>ONE SHARED PASSION.</Label>
      <Label x={0} y={mobile?94:159} align="center" size={mobile?8:11} tracking={.18}>CREATING WHAT’S NEXT.</Label>
    </group>
    <mesh position={[center,-600,900]} onPointerMove={move} onPointerOut={()=>{clearTimeout(timer.current);select(-1);document.body.style.cursor=''}} onClick={e=>{e.stopPropagation();const h=hit(e);select(active.current===h.found?-1:h.found,h.x,h.y)}}><planeGeometry args={[layout.width,layout.designHeight]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
  </>
}
