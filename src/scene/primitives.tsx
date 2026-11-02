import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type MutableRefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Text, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { INK, PAPER, type SectionLayout } from './layout'
import { gsap, smoothScroll } from './motion'

type SceneContext = { layout: SectionLayout; scroll: MutableRefObject<number>; reduced: boolean; clip: THREE.Plane[] }
const Context = createContext<SceneContext>(null!)
export const useSection = () => useContext(Context)
export const go = (href: string) => { if (href.startsWith('#')) { if(smoothScroll) smoothScroll.scrollTo(href); else document.querySelector(href)?.scrollIntoView({ behavior: 'instant' }) } else window.location.href = href }
const noopRaycast = () => {}

export function ClipRegion({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: ReactNode }) {
  const context = useSection()
  const { layout } = context
  const clip = useMemo(() => [...context.clip,
    new THREE.Plane(new THREE.Vector3(1,0,0), -(x-layout.width/2)*layout.scale),
    new THREE.Plane(new THREE.Vector3(-1,0,0), (x+w-layout.width/2)*layout.scale),
    new THREE.Plane(new THREE.Vector3(0,-1,0), -layout.top-y*layout.scale),
    new THREE.Plane(new THREE.Vector3(0,1,0), layout.top+(y+h)*layout.scale),
  ],[context.clip,layout,x,y,w,h])
  return <Context.Provider value={{...context,clip}}>{children}</Context.Provider>
}

// For content drawn into its own render texture, where the section's
// world-space clip planes would cut it off.
export function Unclipped({ children }: { children: ReactNode }) {
  const context = useSection()
  const value = useMemo(() => ({ ...context, clip: [] }), [context])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function Section({ layout, scroll, reduced, children }: Omit<SceneContext, 'clip'> & { children: ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const clip = useMemo(() => layout.id === 'people' ? [] : [new THREE.Plane(new THREE.Vector3(0, -1, 0), -layout.top), new THREE.Plane(new THREE.Vector3(0, 1, 0), layout.top + layout.height)], [layout.id, layout.top, layout.height])
  useFrame(({ size }) => {
    if (group.current) group.current.visible = scroll.current + size.height > layout.top - 500 && scroll.current < layout.top + layout.height + 500
  })
  return <Context.Provider value={{ layout, scroll, reduced, clip }}><group ref={group} position={[-layout.width * layout.scale / 2, -layout.top, 0]} scale={layout.scale}>{children}</group></Context.Provider>
}

export function Label({ x, y, children, size = 18, font = 'sans', color = INK, align = 'left', width, tracking = 0, z = 30, onClick, anchor = 'top', bold = false, lineHeight = 1.14, animated = true }: { x: number; y: number; children: ReactNode; size?: number; font?: 'sans' | 'serif' | 'italic' | 'hero'; color?: string; align?: 'left' | 'center' | 'right'; width?: number; tracking?: number; z?: number; onClick?: () => void; anchor?: 'top' | 'middle'; bold?: boolean; lineHeight?: number; animated?: boolean }) {
  const { clip, layout, reduced } = useSection()
  const motion=useRef<THREE.Group>(null)
  useEffect(()=>{
    if(!motion.current || reduced || !animated) return
    const tween=gsap.fromTo(motion.current.position,{y:-20},{y:0,duration:.8,ease:'power3.out',scrollTrigger:{start:()=>layout.top+Math.max(0,y)*layout.scale-window.innerHeight*.94,once:true}})
    return ()=>{tween.scrollTrigger?.kill();tween.kill()}
  },[layout.top,layout.scale,y,reduced,animated])
  return <group ref={motion}><Text position={[x, -y, z]} font={`/fonts/${font === 'sans' ? bold ? 'inter-bold' : 'inter' : font === 'hero' ? 'hero-serif' : font === 'italic' ? 'newsreader-italic' : 'newsreader'}.ttf`} fontSize={size} anchorX={align} anchorY={anchor} maxWidth={width} textAlign={align} lineHeight={lineHeight} letterSpacing={tracking} onClick={onClick ? e => { e.stopPropagation(); onClick() } : undefined} onPointerOver={onClick ? e => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined} onPointerOut={onClick ? () => document.body.style.cursor = '' : undefined} raycast={onClick ? undefined : noopRaycast}><meshBasicMaterial color={color} clippingPlanes={clip} />{children}</Text></group>
}

function roundedShape(w: number, h: number, r: number) {
  const shape = new THREE.Shape(); const x = -w / 2, y = -h / 2
  shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

export function Panel({ x, y, w, h, color = PAPER, radius = 0, z = 0, border = false, opacity = 1 }: { x: number; y: number; w: number; h: number; color?: string; radius?: number; z?: number; border?: boolean; opacity?: number }) {
  const { clip } = useSection()
  const geometry = useMemo(() => new THREE.ShapeGeometry(roundedShape(w, h, Math.min(radius, w / 2, h / 2)), 12), [w, h, radius])
  const outline = useMemo(() => new THREE.BufferGeometry().setFromPoints(roundedShape(w, h, Math.min(radius, w / 2, h / 2)).getPoints(12).map(p => new THREE.Vector3(p.x, p.y, 0))), [w, h, radius])
  useEffect(() => () => { geometry.dispose(); outline.dispose() }, [geometry, outline])
  const line = useMemo(() => new THREE.LineLoop(outline, new THREE.LineBasicMaterial({ color: '#8a8983', transparent: true, opacity: .65, clippingPlanes: clip })), [outline, clip])
  useEffect(() => () => (line.material as THREE.Material).dispose(), [line])
  return <group position={[x, -y, z]}><mesh geometry={geometry} raycast={noopRaycast}><meshBasicMaterial color={color} clippingPlanes={clip} transparent={opacity < 1} opacity={opacity} /></mesh>{border && <primitive object={line} position={[0, 0, .1]} raycast={noopRaycast} />}</group>
}

export function Stroke({ points, color = '#c4c1b9', z = 1, draw = false, opacity = 1, width = 1 }: { points: number[][]; color?: string; z?: number; draw?: boolean; opacity?: number; width?: number }) {
  const { clip, scroll, layout, reduced } = useSection()
  const line = useMemo(() => {
    if (width <= 1) return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(([x, y]) => new THREE.Vector3(x, -y, 0))), new THREE.LineBasicMaterial({ color, transparent: true, opacity, clippingPlanes: clip }))
    const positions: number[] = []
    for(let i=1;i<points.length;i++) {
      const [ax,ay]=points[i-1], [bx,by]=points[i], length=Math.hypot(bx-ax,by-ay)||1
      const nx=-(by-ay)/length*width/2, ny=(bx-ax)/length*width/2
      for(const [x,y] of [[ax+nx,ay+ny],[ax-nx,ay-ny],[bx-nx,by-ny],[ax+nx,ay+ny],[bx-nx,by-ny],[bx+nx,by+ny]]) positions.push(x,-y,0)
    }
    const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
    return new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity,clippingPlanes:clip,side:THREE.DoubleSide}))
  }, [points, color, opacity, clip, width])
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose() }, [line])
  useFrame(({ size }) => {
    if (!draw) return
    const progress = reduced ? 1 : THREE.MathUtils.clamp((scroll.current + size.height - layout.top) / (layout.height * .95), 0, 1)
    line.geometry.setDrawRange(0, width > 1 ? Math.floor((points.length-1)*progress)*6 : Math.max(2, Math.floor(points.length * progress)))
  })
  return <primitive object={line} position={[0, 0, z]} raycast={noopRaycast} />
}

export function Arrow({ x, y, r = 26, direction = 'right', color = INK, onClick, circle = true, z = 35, weight = 1 }: { x: number; y: number; r?: number; direction?: 'right' | 'left' | 'up' | 'down'; color?: string; onClick?: () => void; circle?: boolean; z?: number; weight?: number }) {
  const { clip } = useSection()
  const group = useRef<THREE.Group>(null); const hover = useRef(false)
  const ring = useMemo(() => Array.from({ length: 65 }, (_, i) => [x + Math.cos(i / 64 * Math.PI * 2) * r, y + Math.sin(i / 64 * Math.PI * 2) * r]), [x, y, r])
  const a = direction === 'left' ? Math.PI : direction === 'up' ? -Math.PI / 4 : direction === 'down' ? Math.PI / 2 : 0
  const arrow = [[-r * .34, 0], [r * .34, 0], [r * .03, -r * .3], [r * .34, 0], [r * .03, r * .3]].map(([px, py]) => [x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a)])
  useFrame((_, dt) => { if (group.current) group.current.position.x = THREE.MathUtils.damp(group.current.position.x, hover.current ? 3 : 0, 16, dt) })
  return <group>{circle && <Stroke points={ring} color={color} z={z} />}<group ref={group}><Stroke points={arrow} color={color} z={z} width={weight} /></group>{onClick && <mesh position={[x, -y, z + 1]} onPointerOver={e => { e.stopPropagation(); hover.current = true; document.body.style.cursor = 'pointer' }} onPointerOut={() => { hover.current = false; document.body.style.cursor = '' }} onClick={e => { e.stopPropagation(); onClick() }}><circleGeometry args={[r + 5, 24]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} clippingPlanes={clip} /></mesh>}</group>
}

const photoVertex = `varying vec2 vUv;
#include <clipping_planes_pars_vertex>
void main(){vUv=uv; vec4 mvPosition=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mvPosition;
#include <clipping_planes_vertex>
}`
const photoFragment = `uniform sampler2D uMap; uniform vec2 uRepeat; uniform vec2 uOffset; uniform vec2 uPointer; uniform float uHover; uniform float uTime; uniform float uBend; varying vec2 vUv;
#include <clipping_planes_pars_fragment>
void main(){
#include <clipping_planes_fragment>
vec2 uv=vUv; float d=distance(uv,uPointer); uv+=(uv-uPointer)*sin(d*18.-uTime*2.)*exp(-d*7.)*uHover*.012;
uv=(uv-.5)*(1.-uHover*.015)+.5; uv.y+=sin(uv.x*3.14159265)*uBend*.006;
vec4 c=texture2D(uMap,clamp(uv,0.,1.)*uRepeat+uOffset); gl_FragColor=vec4(c.rgb,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`

export function Photo({ src, x = 0, y = 0, w, h, angle = 0, z = 5, framed = false, href, parallax = 0, focus = [.5, .5], interactive = true }: { src: string; x?: number; y?: number; w: number; h: number; angle?: number; z?: number; framed?: boolean; href?: string; parallax?: number; focus?: [number, number]; interactive?: boolean }) {
  const { clip, layout, scroll, reduced } = useSection()
  const texture = useTexture(src)
  const material = useRef<THREE.ShaderMaterial>(null)
  const group = useRef<THREE.Group>(null), hover = useRef(0), pointer = useRef(new THREE.Vector2(.5, .5))
  const uniforms = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    const image = texture.image as HTMLImageElement
    const aspect = image.width / image.height, box = w / h
    const repeat = new THREE.Vector2(aspect > box ? box / aspect : 1, aspect > box ? 1 : aspect / box)
    return { uMap: { value: texture }, uRepeat: { value: repeat }, uOffset: { value: new THREE.Vector2((1 - repeat.x) * focus[0], (1 - repeat.y) * focus[1]) }, uPointer: { value: new THREE.Vector2(.5, .5) }, uHover: { value: 0 }, uTime: { value: 0 }, uBend: { value: 0 } }
  }, [texture, w, h, focus[0], focus[1]])
  useFrame(({ clock, size }, dt) => {
    if (!group.current || scroll.current + size.height < layout.top || scroll.current > layout.top + layout.height) return
    const over = reduced ? 0 : hover.current
    const current = material.current?.uniforms ?? uniforms
    current.uHover.value = THREE.MathUtils.damp(current.uHover.value, over, 15, dt)
    current.uPointer.value.lerp(pointer.current, 1 - Math.exp(-18 * dt))
    current.uTime.value = reduced ? 0 : clock.elapsedTime
    const p = THREE.MathUtils.clamp((scroll.current + size.height / 2 - layout.top - layout.height / 2) / layout.height, -.6, .6)
    current.uBend.value = reduced ? 0 : p
    group.current.position.y = -y + (reduced ? 0 : p * parallax)
    const entry = reduced ? 1 : THREE.MathUtils.smoothstep(scroll.current + size.height, layout.top + (y - h / 2) * layout.scale, layout.top + (y - h / 2 + 140) * layout.scale)
    group.current.scale.setScalar(.975 + entry * .025)
    // The hit surface stays almost stationary; no pointer-following camera or raised
    // card crossing its neighbours. Fast settling prevents sticky hover oscillation.
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, framed ? 0 : over * (pointer.current.y - .5) * .035, 16, dt)
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, framed ? 0 : over * (pointer.current.x - .5) * .035, 16, dt)
  })
  const enter = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); hover.current = 1; document.body.style.cursor = href ? 'pointer' : 'default' }
  return <group ref={group} position={[x, -y, z]} rotation={[0, 0, -angle * Math.PI / 180]}>
    {framed && <><Panel x={3} y={5} w={w + 34} h={h + 50} color="#d3d0c8" z={-2} opacity={.55} /><Panel x={0} y={3} w={w + 32} h={h + 48} color="#fbfaf7" z={-1} border /></>}
    <mesh onPointerOver={interactive ? enter : undefined} onPointerOut={interactive ? () => { hover.current = 0; document.body.style.cursor = '' } : undefined} onPointerMove={interactive ? e => { e.stopPropagation(); if(e.uv) pointer.current.copy(e.uv) } : undefined} onClick={href ? e => { e.stopPropagation(); go(href) } : undefined} raycast={interactive ? undefined : noopRaycast}>
      <planeGeometry args={[w, h]} /><shaderMaterial ref={material} uniforms={uniforms} vertexShader={photoVertex} fragmentShader={photoFragment} clippingPlanes={clip} clipping side={THREE.DoubleSide} />
    </mesh>
  </group>
}

export function DecorativePaths({ variant = 'reviews' }: { variant?: 'reviews' | 'footer' }) {
  const { layout } = useSection()
  const mobile = layout.width < 760
  const paths = variant === 'reviews' ? [
    'M -40 365 H 25 Q 170 365 250 250 L 390 66 Q 450 -40 330 -80',
    'M 460 230 Q 470 100 680 100 H 1020 Q 1170 100 1200 -50',
    'M -80 945 H 140 Q 285 945 390 800 L 470 680',
    'M 1580 120 Q 1450 300 1450 500 V 650 Q 1450 800 1270 900 L 1110 1010',
  ] : [
    'M -40 94 H 120 Q 245 94 235 -50', 'M 830 -50 V 80 Q 830 160 720 185',
    'M 1600 15 H 1470 Q 1320 15 1320 170', 'M 1600 360 Q 1480 520 1640 660',
  ]
  return <group position={[0, 0, -30]}>{paths.map((d, i) => <SVGPath key={d} d={d} scale={mobile ? .5 : 1} offset={mobile && i % 2 ? -300 : 0} />)}</group>
}

// SVG path sampling keeps editable vector art while rendering/drawing it in 3D.
function SVGPath({ d, scale, offset }: { d: string; scale: number; offset: number }) {
  const points = useMemo(() => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d); const length = path.getTotalLength()
    return Array.from({ length: 181 }, (_, i) => { const p = path.getPointAtLength(length * i / 180); return [p.x * scale + offset, p.y * scale] })
  }, [d, scale, offset])
  return <Stroke points={points} color="#b7b5ad" opacity={.62} draw />
}
