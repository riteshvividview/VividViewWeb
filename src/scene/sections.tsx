import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Svg, useTexture } from '@react-three/drei'
import { faInstagram, faBehance, faDribbble, faLinkedinIn } from '@fortawesome/free-brands-svg-icons'
import * as THREE from 'three'
import { Arrow, ClipRegion, DecorativePaths, go, Label, Panel, Photo, Stroke, useSection } from './primitives'
import { INK, PAPER, reviews, works } from './layout'
import { InteractivePeople, type Strip } from './People'
import heroMedia from '../data/hero.json'
import { gsap } from './motion'

const CONTACT = 'mailto:contact@thevividview.in'
const PEOPLE = 'https://thevividview.in/who-are-we'
const SERVICES = 'https://thevividview.in/our-services'
const PORTFOLIO = 'https://thevividview.in/branding'

// Service strap sits at the bottom of the first screen, whatever its height.
const strapY = (scale: number) => Math.min(849, window.innerHeight / scale - 40)

export function Hero() {
  const { layout } = useSection(); const mobile = layout.width < 760
  const width = layout.width
  const curves = useMemo(() => [0, 25, 58].map(offset => Array.from({ length: 141 }, (_, i) => {
    const x = i / 140 * width, p = Math.abs(x - width / 2) / (width / 2)
    return [x, (mobile ? 620 : 650) + Math.pow(p, 2.2) * (mobile ? 42 : 92) + offset]
  })), [width, mobile])
  return <>
    {curves.map((points, i) => <Stroke key={i} points={points} opacity={.65 - i * .12} z={-25} draw />)}
    {[-1, 1].map(side => Array.from({ length: mobile ? 6 : 8 }, (_, index) => <HeroCard key={`${side}-${index}`} side={side} index={index} slots={mobile ? 6 : 8} />))}
    <Label x={width / 2} y={mobile ? 137 : 187} size={mobile ? 37 : 70} font="hero" align="center">One platform.</Label>
    {mobile ? <Label x={195} y={184} size={33} font="hero" align="center">Every creative{ '\n' }outcome.</Label> : <>
      <Label x={800} y={267} size={64} font="hero" align="center">Every creative outcome.</Label>
    </>}
    <Label x={width / 2} y={mobile ? 282 : 350} size={mobile ? 14 : 20} align="center" color="#63635d" width={mobile ? 300 : 540}>We build brands, digital experiences and stories that actually mean something.</Label>
    <Arrow x={mobile ? 138 : 755} y={mobile ? 376 : 467} r={mobile ? 24 : 33} direction="up" onClick={() => go('#work')} />
    <Label x={mobile ? 176 : 806} y={mobile ? 359 : 444} size={mobile ? 16 : 21} onClick={() => go('#work')}>Explore{ '\n' }Our Work</Label>
    {!mobile && <><Label x={50} y={strapY(layout.scale)} size={11}>BRANDING    /    DIGITAL    /    CONTENT    /    CAMPAIGNS    /    SPACES    /    CONSULTING</Label><Label x={1545} y={strapY(layout.scale)} size={11} align="right">IDEAS    PEOPLE    EXPERIENCES    IMPACT    ——</Label></>}
  </>
}

const heroSources = heroMedia.map(image=>image.src)
function HeroCard({ side, index, slots }: { side: number; index: number; slots: number }) {
  const { layout, clip, reduced, scroll } = useSection()
  const mobile=layout.width<760,group=useRef<THREE.Group>(null),phase=useRef({value:0})
  const tex=useTexture(heroSources[(index+(side>0?3:0))%heroSources.length])
  const aspect=(tex.image as HTMLImageElement).width/(tex.image as HTMLImageElement).height
  // The perspective taper is applied per frame so it can open with the card.
  const geometry=useMemo(()=>new THREE.PlaneGeometry(aspect,1),[aspect])
  const taper=useRef(-1)
  const setTaper=(amount:number)=>{
    if(Math.abs(amount-taper.current)<.001)return
    taper.current=amount
    const p=geometry.getAttribute('position') as THREE.BufferAttribute
    for(let i=0;i<p.count;i++) p.setY(i,Math.sign(p.getY(i))*.5*(1+side*p.getX(i)/aspect*.18*amount))
    p.needsUpdate=true
  }
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useEffect(()=>{tex.colorSpace=THREE.SRGBColorSpace},[tex])
  useEffect(()=>{if(reduced)return;const tween=gsap.to(phase.current,{value:1,duration:7.5,repeat:-1,ease:'none'});return()=>{tween.kill()}},[reduced])
  useFrame(()=>{
    if(!group.current||scroll.current>layout.height+100)return
    const p=(phase.current.value+(index+.5)/slots)%1
    const growth=Math.pow(p,1.8),appear=THREE.MathUtils.smoothstep(p,0,.06)
    const x=layout.width/2+side*(18+Math.pow(p,1.25)*(mobile?430:layout.width*.88))
    const height=((mobile?36:61)+growth*(mobile?650:1260))*appear
    const bottom=(mobile?602:620)+Math.pow(Math.abs(x-layout.width/2)/(layout.width/2),2.15)*(mobile?21:65)
    group.current.position.set(x,-bottom+height/2,-14+p*18)
    group.current.scale.setScalar(height)
    // Cards leave the center flat, then swing open like car doors into the
    // same final angle; only the entrance changes.
    const open=THREE.MathUtils.smootherstep(p,.03,.32)
    group.current.rotation.set(.08*open,-side*.7*open,0)
    setTaper(open)
  })
  return <group ref={group}><mesh geometry={geometry}><meshBasicMaterial map={tex} clippingPlanes={clip} side={THREE.DoubleSide} /></mesh></group>
}
// Centers, sizes and rotations are traced from the supplied collage wireframe.
// Frames deliberately cross the section boundary, then get clipped there so they
// cannot spill into the portfolio or testimonials during continuous scrolling.
const team = ['/images/who-0.webp', '/images/who-2.webp', '/images/people-08.png', '/images/who-1.webp', '/images/people-11.jpg', '/images/who-7.webp', '/images/who-3.webp', '/images/people-10.jpg', '/images/who-6.webp', '/images/who-9.webp', '/images/people-12.jpg']
const collage = [
  { x: 145, y: 90, w: 298, h: 305, a: -16, z: 9, image: 0 },
  { x: 370, y: 65, w: 268, h: 337, a: 9, z: 5, image: 1 },
  { x: 630, y: 50, w: 270, h: 314, a: -5, z: 3, image: 2 },
  { x: 930, y: 55, w: 317, h: 350, a: 7, z: 10, image: 3 },
  { x: 1212, y: 39, w: 291, h: 305, a: -11, z: 4, image: 4 },
  { x: 1510, y: 61, w: 287, h: 310, a: 16, z: 1, image: 5 },
  { x: 187, y: 330, w: 320, h: 236, a: -34, z: 2, image: 6 },
  { x: 514, y: 274, w: 224, h: 232, a: 13, z: 13, image: 7 },
  { x: 166, y: 477, w: 227, h: 244, a: 31, z: 11, image: 8 },
  { x: 346, y: 568, w: 327, h: 218, a: -18, z: 5, image: 9 },
  { x: -11, y: 655, w: 295, h: 276, a: -23, z: 15, image: 10 },
  { x: 102, y: 810, w: 273, h: 285, a: 14, z: 6, image: 2 },
  { x: 324, y: 785, w: 225, h: 221, a: 22, z: 14, image: 5 },
  { x: 470, y: 970, w: 295, h: 329, a: 31, z: 3, image: 1 },
  { x: 764, y: 870, w: 301, h: 293, a: 21, z: 16, image: 8 },
  { x: 970, y: 979, w: 289, h: 278, a: -19, z: 3, image: 4 },
  { x: 1190, y: 879, w: 318, h: 274, a: -13, z: 17, image: 0 },
  { x: 1460, y: 719, w: 322, h: 305, a: 23, z: 12, image: 7 },
  { x: 1560, y: 952, w: 294, h: 245, a: 14, z: 4, image: 9 },
  { x: 1517, y: 434, w: 340, h: 252, a: 22, z: 1, image: 6 },
  { x: 1237, y: 461, w: 350, h: 245, a: -23, z: 8, image: 10 },
  { x: 1393, y: 254, w: 230, h: 266, a: -19, z: 15, image: 2 },
  { x: 1129, y: 699, w: 285, h: 206, a: -15, z: 10, image: 3 },
]

function FilmStrip({ x, y, angle, length = 750, z = 0 }: { x: number; y: number; angle: number; length?: number; z?: number }) {
  const { clip } = useSection()
  const geometry = useMemo(() => {
    const positions: number[] = [], colors: number[] = []
    const rect = (cx: number, cy: number, w: number, h: number, z: number, color: string) => {
      const c = new THREE.Color(color)
      for(const [dx, dy] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]) { positions.push(cx + dx*w/2, cy + dy*h/2, z); colors.push(c.r,c.g,c.b) }
    }
    rect(0,0,67,length,0,'#a6a59f'); rect(0,0,42,length-4,.1,'#d8d6cf')
    for(let i=0;i<Math.floor(length/23);i++) for(const cx of [-26,26]) rect(cx,-length/2+14+i*23,9,14,.2,PAPER)
    for(let i=0;i<Math.floor(length/82);i++) rect(0,-length/2+43+i*82,36,69,.2,'#b9b7af')
    const g = new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); return g
  },[length])
  useEffect(() => () => geometry.dispose(),[geometry])
  return <mesh position={[x,-y,z]} rotation={[0,0,-angle*Math.PI/180]} geometry={geometry} raycast={() => {}}><meshBasicMaterial vertexColors clippingPlanes={clip} /></mesh>
}

const strips: Strip[] = [
  { x: 108, y: 389, angle: 39, length: 690, z: 6 },
  { x: 1156, y: 180, angle: -16, length: 480, z: 6 },
  { x: 510, y: 1067, angle: 34, length: 480, z: 12 },
  { x: 1420, y: 900, angle: 38, length: 730, z: 14 },
]

export function People() {
  // y includes the section's 100px offset that the strips used to inherit.
  return <InteractivePeople frames={collage} team={team} strips={strips} renderStrip={s => <FilmStrip x={0} y={0} angle={0} length={s.length} />} />
}
const footerColumns = [
  { title: 'ABOUT', links: [['Our Story', PEOPLE], ['Our Team', '#people'], ['Careers', CONTACT], ['Contact Us', CONTACT]] },
  { title: 'SERVICES', links: [['Brand Strategy', SERVICES], ['Visual & Experiential', SERVICES], ['Digital Experiences', SERVICES], ['Growth & Partnership', SERVICES], ['Consulting', SERVICES]] },
  { title: 'HELP', links: [['Help Center', CONTACT], ['Support Team', CONTACT], ['Community', CONTACT], ['Security FAQs', CONTACT]] },
]
export function Footer() {
  const { layout, reduced } = useSection(); const mobile = layout.width < 760
  const fan=useRef<THREE.Group>(null)
  useEffect(()=>{
    if(!fan.current||reduced)return
    const timeline=gsap.timeline({scrollTrigger:{start:()=>layout.top-window.innerHeight*.65,once:true}})
    timeline.fromTo(fan.current.position,{y:-55},{y:0,duration:.9,ease:'power3.out'},0)
    timeline.fromTo(fan.current.rotation,{z:-.1},{z:0,duration:1.05,ease:'back.out(1.2)'},0)
    return()=>{timeline.scrollTrigger?.kill();timeline.kill()}
  },[layout.top,reduced])
  return <>
    <DecorativePaths variant="footer" />
    <Panel x={mobile ? 195 : 800} y={mobile ? 240 : 294} w={mobile ? 354 : 1490} h={mobile ? 406 : 288} radius={mobile ? 28 : 42} color="#e8e6e0" border />
    <group ref={fan}>
      <Photo src="/images/branding-4.webp" x={mobile ? 137 : 196} y={mobile ? 128 : 285} w={mobile ? 83 : 152} h={mobile ? 106 : 165} angle={-14} z={5} href={CONTACT} />
      <Photo src="/images/cravery-1.webp" x={mobile ? 194 : 298} y={mobile ? 139 : 300} w={mobile ? 94 : 166} h={mobile ? 119 : 185} angle={-8} z={8} href={CONTACT} />
      <Photo src="/images/kulfi-4.webp" x={mobile ? 255 : 389} y={mobile ? 158 : 330} w={mobile ? 73 : 118} h={mobile ? 98 : 143} angle={12} z={11} href={CONTACT} />
    </group>
    <Stroke points={mobile ? [[95, 128], [80, 119]] : [[98, 306], [80, 291]]} color={INK} draw />
    <Stroke points={mobile ? [[292, 117], [307, 100]] : [[425, 217], [442, 190]]} color={INK} draw />
    <Stroke points={mobile ? [[301, 133], [316, 129]] : [[438, 235], [459, 222]]} color={INK} draw />
    <Label x={mobile ? 195 : 520} y={mobile ? 234 : 230} size={mobile ? 30 : 57} bold align={mobile ? 'center' : 'left'}>Let’s Discuss{ '\n' }With Our Team</Label>
    {!mobile && <Stroke points={[[980, 212], [980, 384]]} color="#a6a49e" />}
    <Label x={mobile ? 48 : 1020} y={mobile ? 333 : 257} size={mobile ? 13 : 20} width={mobile ? 222 : 269} color="#5f6059">Turning ideas into meaningful experiences. Let’s create something great together.</Label>
    <Panel x={mobile ? 309 : 1411} y={mobile ? 371 : 294} w={mobile ? 56 : 185} h={mobile ? 56 : 185} radius={mobile ? 14 : 25} color="#e8e6e0" border z={3} />
    <Arrow x={mobile ? 309 : 1411} y={mobile ? 371 : 294} r={mobile ? 36 : 135} direction="up" circle={false} weight={mobile ? 1.5 : 4} onClick={() => go(CONTACT)} />
    <Logo x={mobile ? 26 : 106} y={mobile ? 472 : 518} h={mobile ? 60 : 84} />
    <Label x={mobile ? 26 : 106} y={mobile ? 542 : 613} size={mobile ? 8 : 12} tracking={.35}>IDEAS  ·  EXPERIENCES  ·  IMPACT</Label>
    <SocialIcons mobile={mobile} />
    {footerColumns.map((col, i) => <group key={col.title}>
      <Label x={mobile ? 26 + i * 123 : [750, 988, 1300][i]} y={mobile ? 664 : 519} size={mobile ? 11 : 17} tracking={.12}>{col.title}</Label>
      {col.links.map(([label, href], n) => <Label key={label} x={mobile ? 26 + i * 123 : [750, 988, 1300][i]} y={(mobile ? 704 : 564) + n * (mobile ? 48 : 43)} size={mobile ? 11 : 20} width={mobile ? 112 : 280} color="#73746e" onClick={() => go(href)}>{label}</Label>)}
    </group>)}
    <Stroke points={mobile ? [[22, 988], [368, 988]] : [[55, 794], [1546, 794]]} color="#93948d" draw />
    <Label x={mobile ? 26 : 74} y={mobile ? 1010 : 840} size={mobile ? 10 : 16} color="#73746e">© 2026 VIVID VIEW. All rights reserved.</Label>
    <Label x={mobile ? 26 : 1250} y={mobile ? 1049 : 840} size={mobile ? 11 : 16} color="#73746e" onClick={() => go('mailto:contact@thevividview.in?subject=Privacy%20Policy')}>Privacy Policy</Label>
    <Label x={mobile ? 174 : 1425} y={mobile ? 1049 : 840} size={mobile ? 11 : 16} color="#73746e" onClick={() => go('mailto:contact@thevividview.in?subject=Terms%20of%20Use')}>Terms of Use</Label>
  </>
}

function SocialIcons({ mobile }: { mobile: boolean }) {
  const { clip } = useSection()
  const y=mobile?594:699
  const icons=[faInstagram,faBehance,faDribbble,faLinkedinIn]
  return <>{icons.map((icon,i)=>{
    const x=(mobile?47:132)+i*(mobile?55:76),size=i===1?27:24
    const [width,height,,,path]=icon.icon
    const paths=Array.isArray(path)?path:[path]
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${paths.map(d=>`<path fill="rgb(37,38,34)" d="${d}"/>`).join('')}</svg>`
    const href=i===0?'https://www.instagram.com/thevividview.in/':i===3?'https://in.linkedin.com/company/thevividview':undefined
    return <group key={icon.iconName}>
      <Stroke points={Array.from({length:65},(_,j)=>[x+Math.cos(j/64*Math.PI*2)*25,y+Math.sin(j/64*Math.PI*2)*25])} color={INK} z={30} />
      <Svg src={svg} position={[x-width/Math.max(width,height)*size/2,-y+height/Math.max(width,height)*size/2,31]} scale={size/Math.max(width,height)} fillMaterial={{clippingPlanes:clip,depthWrite:true}} />
      {href&&<mesh position={[x,-y,34]} onClick={e=>{e.stopPropagation();go(href)}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>document.body.style.cursor=''}><circleGeometry args={[25,32]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} clippingPlanes={clip} /></mesh>}
    </group>
  })}</>
}

// Brand logo image (top-left anchored at x, y in design units, h tall).
const LOGO = '/images/vivid-logo.png'
function Logo({ x, y, h }: { x: number; y: number; h: number }) {
  const { clip } = useSection()
  const tex = useTexture(LOGO)
  const image = tex.image as HTMLImageElement, w = h * image.width / image.height
  useEffect(() => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true }, [tex])
  return <mesh position={[x + w / 2, -(y + h / 2), 30]} raycast={() => {}}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} transparent clippingPlanes={clip} /></mesh>
}
