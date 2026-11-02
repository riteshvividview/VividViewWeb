import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Label, Stroke, Arrow, useSection, go } from './primitives'
import { gsap } from './motion'
import portfolio from '../data/portfolio.json'

// The hero: the typewriter, the headline and the two streams of work flowing
// out from behind the typewriter.
export function RoyalHero() {
  const { layout, reduced } = useSection()
  const letters = useRef<THREE.Group>(null)
  const letterStates = useMemo(()=>Array.from({length:7},(_,i)=>({y:0,x:0,rotation:0,scale:0,base:(i-3)*58})),[])
  const pulse = useRef({value:0})
  const type = () => {
    if(reduced)return
    gsap.fromTo(pulse.current,{value:1},{value:0,duration:.7,overwrite:true})
    letterStates.forEach((s,i)=>{
      gsap.killTweensOf(s)
      gsap.fromTo(s,{x:0,y:0,scale:0,rotation:0},{x:s.base,y:180+(i%3)*30,scale:1,rotation:(i-3)*.09,duration:.8,delay:i*.04,ease:'power3.out',onComplete:()=>{gsap.to(s,{y:s.y+110,scale:0,duration:.8,delay:.2,ease:'power2.in'})}})
    })
  }
  useEffect(()=>()=>{letterStates.forEach(s=>gsap.killTweensOf(s));gsap.killTweensOf(pulse.current)},[letterStates])
  useFrame(()=>{
    letters.current?.children.forEach((g,i)=>{const s=letterStates[i];g.position.set(s.x,s.y,0);g.scale.setScalar(s.scale);g.rotation.z=s.rotation})
  })
  const w=layout.width
  return <>
    <Label x={w/2} y={115} size={12} tracking={.16} align="center" color="#B8293D">INDEPENDENT MINDS. EXTRAORDINARY IDEAS.</Label>
    <Label x={w/2} y={150} size={94} font="hero" align="center" tracking={-.04}>One platform.</Label>
    <Label x={w/2} y={244} size={97} font="italic" align="center" tracking={-.045}>Every creative outcome.</Label>
    <RoyalTypewriter onType={type} />
    <group ref={letters} position={[w/2,-570,600]}>{'CREATE!'.split('').map((letter,i)=><group key={i} scale={0}><Label x={0} y={0} size={70} font="italic" align="center" color={i%2?'#B8293D':'#002408'} animated={false}>{letter}</Label></group>)}</group>
    <WorkStream side={-1} sources={LEFT} />
    <WorkStream side={1} sources={RIGHT} />
    <Label x={280} y={805} size={11} align="center" tracking={.12} color="#B8293D" onClick={type}>TOUCH THE KEYS. PLAY A LITTLE.</Label>
    <Stroke points={[[70,884],[w-70,884]]} color="#002408" opacity={.25}/>
    <Label x={70} y={908} size={10} tracking={.08}>BRANDS · DIGITAL · STORIES · EXPERIENCES</Label>
    <Label x={w-170} y={902} size={16} font="italic" align="right" onClick={()=>go('#work')}>Explore our work</Label>
    <Arrow x={w-110} y={913} r={24} direction="down" onClick={()=>go('#work')}/>
  </>
}

function RoyalTypewriter({onType}:{onType:()=>void}) {
  const {layout,scroll,reduced,clip}=useSection()
  const {scene}=useGLTF('/models/royal-typewriter.glb')
  const rig=useRef<THREE.Group>(null),pointer=useRef(new THREE.Vector2())
  const keyUniforms=useMemo(()=>({uHit:{value:new THREE.Vector3()},uPress:{value:0}}),[])
  const target=useRef(0)
  const model=useMemo(()=>{
    const clone=scene.clone(true)
    clone.traverse(obj=>{
      if(!(obj instanceof THREE.Mesh))return
      if(obj.name.includes('Paper')){obj.visible=false;return}
      const source=obj.material as THREE.MeshStandardMaterial
      // The model's own materials and textures, untouched, for a realistic
      // machine; only the keys get the press-down vertex offset.
      const mat=source.clone();mat.clippingPlanes=clip
      const isKey=obj.name.includes('Buttons')
      mat.onBeforeCompile=shader=>{
        if(isKey){
          shader.uniforms.uHit=keyUniforms.uHit;shader.uniforms.uPress=keyUniforms.uPress
          shader.vertexShader='uniform vec3 uHit;uniform float uPress;\n'+shader.vertexShader
          shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nfloat keyDistance=distance((modelMatrix*vec4(transformed,1.)).xy,uHit.xy);mvPosition.y-=exp(-keyDistance*.12)*uPress*7.;gl_Position=projectionMatrix*mvPosition;')
        }
      }
      mat.customProgramCacheKey=()=>`royal-${isKey?'keys':'body'}`
      obj.material=mat
    })
    const box=new THREE.Box3().setFromObject(clone),center=box.getCenter(new THREE.Vector3())
    clone.position.sub(center)
    return clone
  },[scene,clip,keyUniforms])
  useEffect(()=>()=>{model.traverse(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.Material).dispose()})},[model])
  const move=(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();keyUniforms.uHit.value.copy(e.point);pointer.current.set((e.point.x/layout.scale)*.0015,(e.point.y/layout.scale+600)*.0015);target.current=1;document.body.style.cursor='pointer'}
  useFrame(({clock},dt)=>{
    if(!rig.current)return
    const travel=scroll.current/layout.scale
    rig.current.position.set(layout.width/2,-650+Math.sin(reduced?0:clock.elapsedTime*.7)*5,230)
    rig.current.rotation.x=THREE.MathUtils.damp(rig.current.rotation.x,.42+(reduced?0:pointer.current.y*.08),7,dt)
    rig.current.rotation.y=THREE.MathUtils.damp(rig.current.rotation.y,-.22+(reduced?0:pointer.current.x*.15)-travel*.0003,7,dt)
    rig.current.rotation.z=THREE.MathUtils.damp(rig.current.rotation.z,-.025+travel*.00005,7,dt)
    keyUniforms.uPress.value=THREE.MathUtils.damp(keyUniforms.uPress.value,reduced?0:target.current,15,dt)
  })
  return <>
    <hemisphereLight args={['#fff6ea','#5b5048',1.3]}/>
    <directionalLight position={[-500,900,1100]} intensity={2.6} color="#fff1dc"/>
    <directionalLight position={[1500,300,600]} intensity={.9} color="#dfe8ff"/>
    <directionalLight position={[600,-200,-900]} intensity={1.2}/>
    <group ref={rig} position={[layout.width/2,-650,230]} rotation={[.42,-.22,-.025]} onPointerMove={move} onPointerOut={()=>{target.current=0;pointer.current.set(0,0);document.body.style.cursor=''}} onClick={e=>{e.stopPropagation();onType()}}><group scale={250}><primitive object={model}/></group></group>
  </>
}
useGLTF.preload('/models/royal-typewriter.glb')

// Work streams: square cards of brand work leave from the centre of the
// typewriter and travel outward along a wavy path, the left stream off the
// left edge of the screen and the right stream off the right edge, looping.
// Every card is the same fixed square; images are centre-cropped to fill it.
const pad = (n: number) => String(n).padStart(2, '0')
const LEFT = Array.from({ length: 10 }, (_, i) => `/images/portfolio/branding-${pad(i + 1)}.jpg`)
const RIGHT = [...Array.from({ length: 6 }, (_, i) => `/images/portfolio/media-production-${pad(i + 1)}.jpg`), ...Array.from({ length: 4 }, (_, i) => `/images/portfolio/hero-${i}.jpg`)]
const LINKS = new Map<string, string>(portfolio.map(p => [p.src, p.href]))
const STREAM_SECONDS = 13
const CARD = 180
function WorkStream({ side, sources }: { side: number; sources: string[] }) {
  const { layout, clip, reduced } = useSection()
  const textures = useTexture(sources)
  const cx = layout.width / 2
  // Design coordinates, y down: from the typewriter's centre out past the side edge.
  const path = useMemo(() => new THREE.CatmullRomCurve3([
    [cx + side * 10, 600], [cx + side * 190, 520], [cx + side * 400, 640], [cx + side * 610, 500], [cx + side * 820, 610], [cx + side * 1060, 520],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'catmullrom', .5), [cx, side])
  const cards = useMemo(() => textures.map((source, i) => {
    // Cover-crop each image to the square without touching the shared texture.
    const tex = source.clone(); tex.colorSpace = THREE.SRGBColorSpace
    const image = source.image as HTMLImageElement, aspect = image.width / image.height
    if (aspect > 1) { tex.repeat.set(1 / aspect, 1); tex.offset.set((1 - 1 / aspect) / 2, 0) } else { tex.repeat.set(1, aspect); tex.offset.set(0, (1 - aspect) / 2) }
    tex.needsUpdate = true
    return { tex, phase: i / textures.length, href: LINKS.get(sources[i]) ?? 'https://thevividview.in/our-work' }
  }), [textures, sources])
  useEffect(() => () => cards.forEach(c => c.tex.dispose()), [cards])
  const groups = useRef<(THREE.Group | null)[]>([]), clock = useRef(0), point = useMemo(() => new THREE.Vector3(), []), tangent = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    if (!reduced) clock.current += Math.min(dt, .05) / STREAM_SECONDS
    cards.forEach((c, i) => {
      const g = groups.current[i]
      if (!g) return
      const t = (c.phase + clock.current) % 1
      path.getPoint(t, point); path.getTangent(t, tangent)
      // Grows out of the machine, then travels at full size.
      const grow = THREE.MathUtils.smoothstep(t, 0, .2)
      // Newest card in front: depth falls with age, all behind the machine.
      g.position.set(point.x, -point.y, -20 - t * 50)
      g.scale.setScalar(.25 + grow * .75)
      g.rotation.z = Math.atan2(-tangent.y * side, Math.abs(tangent.x)) * side * .35
    })
  })
  return <>{cards.map((c, i) => <group key={i} ref={el => { groups.current[i] = el }}>
    <mesh onClick={e => { e.stopPropagation(); go(c.href) }} onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer' }} onPointerOut={() => document.body.style.cursor = ''}>
      <planeGeometry args={[CARD, CARD]} /><meshBasicMaterial map={c.tex} clippingPlanes={clip} />
    </mesh>
  </group>)}</>
}
