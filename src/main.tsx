import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, events, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Section } from './scene/primitives'
import { RoyalHero } from './scene/RoyalHero'
import { Hero, People, Footer } from './scene/sections'
import { WorkGallery } from './scene/Gallery'
import { InteractiveTestimonials } from './scene/Testimonials'
import { Doodles } from './scene/Doodles'
import { ServicesSection } from './scene/Services'
import { BrandAtmosphere } from './scene/BrandAtmosphere'
import { PageReveal } from './scene/Reveal'
import { services } from './scene/servicesData'
import { GalleryContext,filterPortfolio,galleryMetrics,railCount,hasMore } from './scene/galleryData'
import { WorkOverlay } from './WorkOverlay'
import { makeLayout, PAPER, works, reviews, DARK_SECTIONS, sectionBg } from './scene/layout'
import { startSmoothScroll, smoothScroll, ScrollTrigger } from './scene/motion'
import 'lenis/dist/lenis.css'
import './style.css'

const chapters = ['INTRO', 'OUR WORK', 'SERVICES', 'OUR PEOPLE', 'KIND WORDS', 'CONTACT']
const components = [RoyalHero, WorkGallery, ServicesSection, People, InteractiveTestimonials, Footer]
type Layout = ReturnType<typeof makeLayout>

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
  return <><BrandAtmosphere scroll={scroll} reduced={reduced} sections={layout.sections} />{layout.sections.map((section, i) => {
    const Component = components[i]
    return <Section key={section.id} layout={section} scroll={scroll} reduced={reduced}><Component /></Section>
  })}</>
}

function App() {
  const [width, setWidth] = useState(window.innerWidth)
  const [filter,setFilter]=useState('ALL')
  const [allOpen,setAllOpen]=useState(false)
  const layout = useMemo(() => makeLayout(width,galleryMetrics(railCount(filterPortfolio(filter).length),width<760,hasMore(filterPortfolio(filter).length)).travel), [width,filter])
  const scroll = useRef(window.scrollY)
  const [chapter, setChapter] = useState(0), [hidden, setHidden] = useState(false)
  const [reduced, setReduced] = useState(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [ready, setReady] = useState(false)
  const dark = DARK_SECTIONS.has(layout.sections[chapter]?.id ?? '')
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
  return <GalleryContext.Provider value={{filter,setFilter,openAll:()=>setAllOpen(true)}}>
    <a className="skip-link" href="#page-content">Skip to page content</a>
    <div className="canvas-shell" aria-hidden="true"><Canvas flat orthographic dpr={[1, 1.5]} camera={{ zoom: 1, position: [0, -window.innerHeight / 2, 2000], near: .1, far: 4000 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.localClippingEnabled = true; gl.outputColorSpace = THREE.SRGBColorSpace; gl.setClearColor(PAPER) }} events={state => ({ ...events(state), filter: intersections => intersections.filter(hit => {
      const material = (hit.object as THREE.Mesh).material
      const materials = Array.isArray(material) ? material : [material]
      return materials.some(m => !m?.clippingPlanes || m.clippingPlanes.every(plane => plane.distanceToPoint(hit.point) >= 0))
    }) })}><Suspense fallback={null}><Experience layout={layout} scroll={scroll} reduced={reduced} onReady={onReady} /></Suspense></Canvas></div>
    <header className={`site-nav${hidden ? ' is-hidden' : ''}${chapter > 0 ? ' is-scrolled' : ''}${dark ? ' is-dark' : ''}`} style={{ '--nav-bg': sectionBg(layout.sections[chapter]?.id ?? 'home') } as React.CSSProperties}>
      <a className="brand" href="#home" aria-label="Vivid View home"><img src="/images/vivid-logo.png" alt="Vivid View" /></a>
      <nav aria-label="Main navigation"><a className={chapter === 0 ? 'active' : ''} href="#home">Home</a><a className={chapter === 1 ? 'active' : ''} href="#work">Our Work</a><a className={chapter === 3 ? 'active' : ''} href="#people">Who We Are</a><a className={chapter === 2 ? 'active' : ''} href="#services">Our Services</a></nav>
      <a className="talk" href="mailto:contact@thevividview.in">Let’s talk <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" /></svg></a>
    </header>
    
    <details className="asset-credit"><summary>3D ARTWORK ?</summary><p><a href="https://sketchfab.com/3d-models/typewriter-f8339a2f7ea849b8afbebb76a40e1759">Typewriter</a> by Francesco Coldesina ? <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Adapted materials, scale, textures and animation. <a href="https://sketchfab.com/3d-models/a668103a96874b80a8421f22fbb5c74f">Lady Bust - Benlliure</a> by Moøkan · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</p></details>
    <div className="reading-line" aria-hidden="true" />
    <div className={`chapter${dark ? ' is-dark' : ''}`} aria-hidden="true">0{chapter + 1} / 0{chapters.length} <span>{chapters[chapter]}</span></div>
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
    {allOpen && <WorkOverlay filter={filter} onClose={() => setAllOpen(false)} />}
  </GalleryContext.Provider>
}

createRoot(document.getElementById('root')!).render(<App />)
