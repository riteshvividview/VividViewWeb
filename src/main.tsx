import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, events, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Section } from './scene/primitives'
import { Hero, People, Footer } from './scene/sections'
import { WorkGallery } from './scene/Gallery'
import { InteractiveTestimonials } from './scene/Testimonials'
import { Doodles } from './scene/Doodles'
import { ServicesSection } from './scene/Services'
import { PageReveal } from './scene/Reveal'
import { services } from './scene/servicesData'
import { GalleryContext,filterPortfolio,galleryMetrics } from './scene/galleryData'
import { makeLayout, PAPER, works, reviews } from './scene/layout'
import { startSmoothScroll, smoothScroll, ScrollTrigger } from './scene/motion'
import 'lenis/dist/lenis.css'
import './style.css'

const chapters = ['INTRO', 'OUR WORK', 'SERVICES', 'OUR PEOPLE', 'KIND WORDS', 'CONTACT']
const components = [Hero, WorkGallery, ServicesSection, People, InteractiveTestimonials, Footer]
type Layout = ReturnType<typeof makeLayout>

function Paper({ scroll, reduced }: { scroll: React.MutableRefObject<number>; reduced: boolean }) {
  const { size } = useThree()
  const mesh = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(PAPER) }, uScroll: { value: 0 }, uResolution: { value: new THREE.Vector2(size.width, size.height) } }), [])
  useFrame(() => {
    if (mesh.current) mesh.current.position.y = -scroll.current - size.height / 2
    const current=(mesh.current?.material as THREE.ShaderMaterial|undefined)?.uniforms ?? uniforms
    current.uScroll.value = scroll.current
    current.uResolution.value.set(size.width, size.height)
  })
  return <mesh ref={mesh} position={[0, 0, -100]} raycast={() => {}}><planeGeometry args={[size.width, size.height]} /><shaderMaterial uniforms={uniforms} depthWrite={false} vertexShader="varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader={`varying vec2 vUv; uniform vec3 uColor; uniform float uScroll; uniform vec2 uResolution;
  void main(){
  vec2 p=vec2(vUv.x,(vUv.y*uResolution.y-uScroll)/max(uResolution.x,760.));
  float curve=p.x*1.35+p.y*.72+sin(p.y*4.6+p.x*2.5)*.12+sin(p.y*2.1)*.12;
  float d=abs(fract(curve*5.4)-.5);
  float contour=1.-smoothstep(.009,.025,d);
  float soft=1.-smoothstep(.018,.055,d);
  float grain=fract(sin(dot(gl_FragCoord.xy+vec2(0.,uScroll),vec2(12.9898,78.233)))*43758.5453);
  gl_FragColor=vec4(uColor-vec3(.047,.046,.043)*contour-vec3(.009)*soft+(grain-.5)*.006,1.);
  #include <colorspace_fragment>
  }`} /></mesh>
}

function Experience({ layout, scroll, reduced, onReady }: { layout: Layout; scroll: React.MutableRefObject<number>; reduced: boolean; onReady: () => void }) {
  const { camera, size, invalidate } = useThree()
  useEffect(() => { onReady(); invalidate() }, [onReady, invalidate])
  useFrame(() => {
    // Sample once for the entire scene. Lenis retains subpixel precision;
    // camera and pinned content must use exactly the same scroll position.
    scroll.current = smoothScroll?.animatedScroll ?? window.scrollY
    camera.position.set(0, -scroll.current - size.height / 2, 2000)
    camera.rotation.set(0, 0, 0)
    camera.updateMatrixWorld()
  }, -2)
  return <><Paper scroll={scroll} reduced={reduced} />{layout.sections.map((section, i) => {
    const Component = components[i]
    return <Section key={section.id} layout={section} scroll={scroll} reduced={reduced}><Component /></Section>
  })}</>
}

function App() {
  const [width, setWidth] = useState(window.innerWidth)
  const [filter,setFilter]=useState('ALL')
  const layout = useMemo(() => makeLayout(width,galleryMetrics(filterPortfolio(filter).length,width<760).travel), [width,filter])
  const scroll = useRef(window.scrollY)
  const [chapter, setChapter] = useState(0), [hidden, setHidden] = useState(false)
  const [reduced, setReduced] = useState(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const [revealed, setRevealed] = useState(false)
  const onRevealed = useCallback(() => setRevealed(true), [])
  useEffect(() => reduced ? undefined : startSmoothScroll(), [reduced])
  useEffect(() => { const timer=window.setTimeout(()=>{smoothScroll?.resize();ScrollTrigger.refresh()},150); return ()=>clearTimeout(timer) },[layout,ready])
  useEffect(() => {
    const resize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', resize)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const preference = () => setReduced(media.matches)
    media.addEventListener('change', preference)
    return () => { window.removeEventListener('resize', resize); media.removeEventListener('change', preference) }
  }, [])
  useEffect(() => {
    let previous = window.scrollY
    const update = () => {
      const y = window.scrollY
      const center = y + window.innerHeight * .45
      const section = [...layout.sections].reverse().find(s => center >= s.top)
      setChapter(section?.index ?? 0)
      if (Math.abs(y - previous) > 5) { setHidden(y > 110 && y > previous); previous = y }
      document.documentElement.style.setProperty('--scroll-progress', `${Math.min(1, y / Math.max(1, layout.total - window.innerHeight))}`)
    }
    update(); window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [layout])
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }))
  }, [])
  return <GalleryContext.Provider value={{filter,setFilter}}>
    <a className="skip-link" href="#page-content">Skip to page content</a>
    <div className="canvas-shell" aria-hidden="true"><Canvas flat orthographic dpr={[1, 1.5]} camera={{ zoom: 1, position: [0, -window.innerHeight / 2, 2000], near: .1, far: 4000 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.localClippingEnabled = true; gl.outputColorSpace = THREE.SRGBColorSpace; gl.setClearColor(PAPER) }} events={state => ({ ...events(state), filter: intersections => intersections.filter(hit => {
      const material = (hit.object as THREE.Mesh).material
      const materials = Array.isArray(material) ? material : [material]
      return materials.some(m => !m?.clippingPlanes || m.clippingPlanes.every(plane => plane.distanceToPoint(hit.point) >= 0))
    }) })}><Suspense fallback={null}><Experience layout={layout} scroll={scroll} reduced={reduced} onReady={onReady} /></Suspense></Canvas></div>
    <header className={`site-nav${hidden ? ' is-hidden' : ''}${chapter > 0 ? ' is-scrolled' : ''}`}>
      <a className="brand" href="#home" aria-label="Vivid View home"><img src="/images/vivid-logo.png" alt="Vivid View" /></a>
      <nav aria-label="Main navigation"><a className={chapter === 0 ? 'active' : ''} href="#home">Home</a><a className={chapter === 1 ? 'active' : ''} href="#work">Our Work</a><a className={chapter === 3 ? 'active' : ''} href="#people">Who We Are</a><a className={chapter === 2 ? 'active' : ''} href="#services">Our Services</a></nav>
      <a className="talk" href="mailto:contact@thevividview.in">Let’s talk <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" /></svg></a>
    </header>
    <Doodles layout={layout} reduced={reduced} />
    <div className="reading-line" aria-hidden="true" />
    <div className="chapter" aria-hidden="true">0{chapter + 1} / 0{chapters.length} <span>{chapters[chapter]}</span></div>
    <main className="scroll-track" style={{ height: layout.total }}>{layout.sections.map(s => <section className="scene-anchor" id={s.id} key={s.id} aria-label={chapters[s.index]} style={{ top: s.top, height: s.height }} />)}</main>
    <div className="accessible-copy" id="page-content" tabIndex={-1}>
      <h1>One platform. Every creative outcome.</h1><p>We build brands, digital experiences and stories that actually mean something.</p><a href="#work">Explore our work</a>
      <section><h2>Ideas brought to Life.</h2><p>A glimpse of the brands, campaigns and digital experiences we’ve created across industries.</p><ul>{works.map((work, i) => <li key={i}><a href={work.href ?? 'https://thevividview.in/branding'}>{work.title}: {work.sub}</a></li>)}</ul></section>
      <section><h2>What we do best.</h2><ul>{services.map(s => <li key={s.tag}><strong>{s.title.replace('\n', ' ')}</strong>: {s.text}</li>)}</ul></section>
      <section><h2>Creative minds. Real people.</h2><p>Different perspectives. One shared passion. Creating what’s next.</p><a href="https://thevividview.in/who-are-we">Meet the team</a></section>
      <section><h2>They say it better than we do.</h2>{reviews.map(r => <blockquote key={r.name}>{r.quote}<cite>{r.name}, {r.role}</cite></blockquote>)}</section>
      <section><h2>Let’s Discuss With Our Team</h2><p>Turning ideas into meaningful experiences. Let’s create something great together.</p><a href="mailto:contact@thevividview.in">Contact Vivid View</a></section>
    </div>
    {ready && !revealed && !reduced && <PageReveal onDone={onRevealed} />}
    {!ready && <div className="loader" role="status"><img src="/images/vivid-logo.png" alt="Vivid View" /><span>LOADING THE EXPERIENCE</span><i /></div>}
  </GalleryContext.Provider>
}

createRoot(document.getElementById('root')!).render(<App />)
