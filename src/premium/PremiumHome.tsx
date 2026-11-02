import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { gsap, ScrollTrigger, startSmoothScroll, smoothScroll } from '../scene/motion'
import { services } from '../scene/servicesData'
import { portfolio, galleryTabs } from '../scene/galleryData'
import { reviews } from '../scene/layout'
import type { SceneState } from './VividScene'

const VividScene = lazy(() => import('./VividScene').then(m => ({ default: m.VividScene })))
const chapters = ['Intro', 'Selected work', 'Capabilities', 'Our people', 'Kind words', 'Contact']
const ids = ['home', 'work', 'services', 'people', 'reviews', 'contact']
const featured = ['media-production-1', 'branding-4', 'website-development-1', 'branding-1']
const orderedPortfolio = [...portfolio].sort((a,b) => {
  const rank = (id: string) => featured.includes(id) ? featured.indexOf(id) : id.startsWith('original') ? 100 : 10
  return rank(a.id) - rank(b.id)
})
const team = ['who-0.webp', 'who-2.webp', 'people-08.png', 'who-1.webp', 'people-11.jpg', 'who-7.webp', 'who-3.webp']
const contact = 'mailto:contact@thevividview.in'

function Arrow({ diagonal = true }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h16m-7-7 7 7-7 7'} stroke="currentColor" strokeWidth="1.4" /></svg>
}
function Eyebrow({ number, children }: { number: string; children: string }) {
  return <div className="eyebrow"><span className="section-number">{number}</span><span>{children}</span></div>
}
function tilt(event: MouseEvent<HTMLElement>) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width - .5
  const y = (event.clientY - rect.top) / rect.height - .5
  event.currentTarget.style.setProperty('--tilt-x', `${-y * 7}deg`)
  event.currentTarget.style.setProperty('--tilt-y', `${x * 7}deg`)
  event.currentTarget.style.setProperty('--light-x', `${(x + .5) * 100}%`)
  event.currentTarget.style.setProperty('--light-y', `${(y + .5) * 100}%`)
}
function resetTilt(event: MouseEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--tilt-x', '0deg')
  event.currentTarget.style.setProperty('--tilt-y', '0deg')
}

function Work() {
  const [filter, setFilter] = useState('ALL')
  const [position, setPosition] = useState(0)
  const rail = useRef<HTMLDivElement>(null)
  const items = useMemo(() => filter === 'ALL' ? orderedPortfolio : orderedPortfolio.filter(p => p.tags.includes(filter)), [filter])
  const changeFilter = (value: string) => { setFilter(value); setPosition(0); rail.current?.scrollTo({ left: 0, behavior: 'instant' }) }
  const slide = (direction: number) => {
    const node = rail.current
    if (node) node.scrollBy({ left: direction * (node.querySelector('article')!.getBoundingClientRect().width + 28), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  return <section id="work" className="work-section chapter-section">
    <div className="section-heading reveal"><div><Eyebrow number="01" >The work speaks</Eyebrow><h2>Ideas, made<br /><span className="muted">impossible to ignore.</span></h2></div><p>Different brands. Different worlds.<br />The same instinct to make it matter.</p></div>
    <div className="work-toolbar"><div className="filters" aria-label="Filter projects">{galleryTabs.map(tab => <button key={tab} aria-pressed={filter === tab} onClick={() => changeFilter(tab)}>{tab === 'ALL' ? 'All work' : tab.toLowerCase()}<span>{(tab === 'ALL' ? portfolio : portfolio.filter(p => p.tags.includes(tab))).length.toString().padStart(2, '0')}</span></button>)}</div><span className="mono">EXPLORE THE COLLECTION ↗</span></div>
    <div className="work-rail" ref={rail} data-lenis-prevent onScroll={() => { const el = rail.current; if (el) setPosition(el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)) }} tabIndex={0} aria-label="Project gallery. Scroll horizontally or use the previous and next buttons.">
      {items.map((work, i) => <article className="work-card" key={work.id} onMouseMove={tilt} onMouseLeave={resetTilt}>
        <a href={work.href ?? 'https://thevividview.in/branding'} className="project-image" data-cursor="VIEW" aria-label={`View ${work.title}`}>
          <img src={work.src} alt={`${work.title} — ${work.sub}`} loading="lazy" /><span className="project-shine" /><span className="project-index">{String(i + 1).padStart(2, '0')} / VIVID VIEW</span><span className="project-arrow"><Arrow /></span>
          {work.id.startsWith('original') && work.id !== 'original-3' && <span className="study-label">Visual study</span>}
        </a>
        <div className="project-caption"><h3>{work.title}</h3><p>{work.sub}</p></div>
      </article>)}
    </div>
    <div className="gallery-bottom"><span className="mono">A LITTLE OF WHAT WE PUT INTO THE WORLD.</span><div className="gallery-progress"><i style={{ transform: `translateX(${position * 300}%)` }} /></div><div className="arrow-controls"><button aria-label="Previous projects" disabled={position < .001} onClick={() => slide(-1)}><Arrow diagonal={false} /></button><button aria-label="Next projects" disabled={position > .999} onClick={() => slide(1)}><Arrow diagonal={false} /></button></div></div>
  </section>
}

export function PremiumHome() {
  const root = useRef<HTMLDivElement>(null)
  const cursor = useRef<HTMLDivElement>(null)
  const [chapter, setChapter] = useState(0)
  const [service, setService] = useState(0)
  const [review, setReview] = useState(0)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const scene = useRef<SceneState>({ chapter: 0, phase: 0, progress: 0, pointer: { x: 0, y: 0 }, service: 0, reduced })
  const activeService = services[service]
  const activeReview = reviews[review]

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    scene.current.reduced = reduced
    return reduced ? undefined : startSmoothScroll()
  }, [reduced])
  useEffect(() => { scene.current.service = service }, [service])

  useEffect(() => {
    const pointer = (event: PointerEvent) => {
      scene.current.pointer.x = event.clientX / window.innerWidth * 2 - 1
      scene.current.pointer.y = 1 - event.clientY / window.innerHeight * 2
      root.current?.style.setProperty('--pointer-x', `${event.clientX / window.innerWidth * 100}%`)
      if (!cursor.current || event.pointerType === 'touch') return
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-cursor], a, button')
      cursor.current.dataset.active = target ? 'true' : 'false'
      cursor.current.dataset.label = target?.dataset.cursor ?? ''
      cursor.current.style.opacity = '1'
      gsap.to(cursor.current, { x: event.clientX, y: event.clientY, duration: .22, ease: 'power3.out', overwrite: true })
    }
    const leave = () => { if (cursor.current) cursor.current.style.opacity = '0' }
    window.addEventListener('pointermove', pointer)
    document.addEventListener('pointerleave', leave)
    return () => { window.removeEventListener('pointermove', pointer); document.removeEventListener('pointerleave', leave); gsap.killTweensOf(cursor.current) }
  }, [])

  useEffect(() => {
    const sections = ids.map(id => document.getElementById(id)!)
    const update = () => {
      const y = window.scrollY + window.innerHeight * .45
      let current = 0
      sections.forEach((section, i) => { if (y >= section.offsetTop) current = i })
      scene.current.chapter = current
      let phase = 0
      sections.forEach((section, i) => {
        if (i === 0) return
        const start = section.offsetTop - window.innerHeight * .8
        const transition = Math.max(0, Math.min(1, (window.scrollY - start) / (window.innerHeight * .75)))
        phase += transition * transition * (3 - 2 * transition)
      })
      scene.current.phase = phase
      setChapter(current)
      const progress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      scene.current.progress = progress
      root.current?.style.setProperty('--progress', String(progress))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!reduced) {
        gsap.from('.hero-copy > *', { y: 40, opacity: 0, duration: 1.25, stagger: .12, ease: 'power3.out', delay: .15 })
        gsap.from('.hero-coordinate, .hero-bottom', { opacity: 0, duration: 1.5, delay: 1 })
        gsap.to('.hero-copy', { y: -100, opacity: .1, ease: 'none', scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom 15%', scrub: true } })
        gsap.utils.toArray<HTMLElement>('.reveal').forEach(el => gsap.from(el, { y: 55, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }))
        gsap.utils.toArray<HTMLElement>('.portrait').forEach((el, i) => gsap.fromTo(el, { y: i % 2 ? 70 : -55, rotate: i % 2 ? 7 : -6 }, { y: i % 2 ? -65 : 45, rotate: i % 2 ? -3 : 3, ease: 'none', scrollTrigger: { trigger: '#people', start: 'top bottom', end: 'bottom top', scrub: 1 } }))
        gsap.to('.people-word', { xPercent: -12, ease: 'none', scrollTrigger: { trigger: '#people', start: 'top bottom', end: 'bottom top', scrub: true } })
      }
      ScrollTrigger.create({ trigger: '#services', start: 'top top', end: 'bottom bottom', onUpdate: self => { if (!reduced) setService(Math.min(6, Math.floor(self.progress * 7))) } })
    }, root)
    const timer = window.setTimeout(() => { smoothScroll?.resize(); ScrollTrigger.refresh() }, 300)
    const hash = window.location.hash.slice(1)
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'instant' }))
    return () => { ctx.revert(); clearTimeout(timer) }
  }, [reduced])

  const selectService = (index: number) => {
    setService(index)
    if (reduced) return
    const section = document.getElementById('services')!
    const target = section.offsetTop + (section.offsetHeight - window.innerHeight) * ((index + .45) / 7)
    if (smoothScroll) smoothScroll.scrollTo(target, { duration: .65 })
    else window.scrollTo({ top: target, behavior: 'smooth' })
  }

  return <div className={`premium-home${reduced ? ' reduced-motion' : ''}`} ref={root}>
    <a className="skip-link" href="#work">Skip introduction</a>
    <Suspense fallback={<div className="scene-fallback" />}><VividScene state={scene} /></Suspense>
    <div className="ambient-grain" aria-hidden="true" />
    <div className="custom-cursor" ref={cursor} aria-hidden="true" />
    <div className="reading-progress" aria-hidden="true" />
    <header className={`site-header${chapter ? ' scrolled' : ''}`}>
      <a href="#home" className="brand" aria-label="Vivid View home"><img src="/images/vivid-logo.png" alt="Vivid View" /></a>
      <nav aria-label="Main navigation">{[['work','Our work'],['services','What we do'],['people','Who we are']].map(([id,label]) => <a key={id} href={`#${id}`} aria-current={ids[chapter] === id ? 'location' : undefined}>{label}</a>)}</nav>
      <a className="header-contact" href={contact}>Let’s talk <span><Arrow /></span></a>
    </header>
    <aside className="chapter-nav" aria-label="Page chapters">{ids.map((id,i) => <a key={id} href={`#${id}`} aria-label={chapters[i]} aria-current={chapter === i ? 'location' : undefined}><span>{chapters[i]}</span><i /></a>)}</aside>
    <main>
      <section id="home" className="hero chapter-section">
        <div className="hero-copy"><div className="eyebrow"><i className="status-dot" />INDEPENDENT MINDS. EXTRAORDINARY OUTCOMES.</div><h1>One platform.<br />Every creative<br /><span className="gradient-text">possibility.</span></h1><p>We turn bold thinking into brands,<br />experiences and stories that move people.</p><a href="#work" className="round-link">Enter our world <span><Arrow /></span></a></div>
        <div className="hero-coordinate"><span className="crosshair">+</span><div>THE VIVID LOOP<span>ONE IDEA. INFINITE POSSIBILITIES.</span></div><span className="live-dot" /></div>
        <div className="hero-orbit-label" aria-hidden="true">IMAGINATION, IN MOTION.</div>
        <div className="hero-bottom"><a href="#work" className="scroll-invite"><span className="scroll-line" />SCROLL TO DISCOVER</a><span>STRATEGY · DESIGN · TECHNOLOGY · STORYTELLING</span><span className="mono">HYDERABAD, INDIA ↗ EVERYWHERE</span></div>
      </section>
      <Work />
      <section id="services" className="services-section chapter-section">
        <div className="services-stage">
          <div className="services-title"><Eyebrow number="02">Built around your ambition</Eyebrow><h2>Different disciplines.<br /><span className="muted">One vivid vision.</span></h2></div>
          <div className="service-orbit-copy"><span className="mono">CONNECTED BY CURIOSITY</span><span className="orbit-plus">✳</span><p>From the first spark<br />to what comes next.</p></div>
          <div className="service-detail" key={service} id="service-detail" role="tabpanel" aria-labelledby={`service-tab-${service}`}>
            <div className="service-counter"><span>0{service + 1}</span><span>/ 07 — OUR CAPABILITIES</span></div><h3>{activeService.title.replace('\n', ' ')}</h3><p>{activeService.text}</p><div className="service-tags">{activeService.includes.map(item => <span key={item}>{item}</span>)}</div><a className="text-link" href="https://thevividview.in/our-services">Explore this capability <Arrow /></a>
          </div>
          <div className="service-tabs" role="tablist" aria-label="Our capabilities">{services.map((item,i) => <button id={`service-tab-${i}`} key={item.tag} role="tab" aria-selected={service === i} aria-controls="service-detail" tabIndex={service === i ? 0 : -1} onKeyDown={e => { if (['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 6 : (i + (e.key === 'ArrowRight' ? 1 : 6)) % 7; selectService(next); document.getElementById(`service-tab-${next}`)?.focus({ preventScroll: true }) } }} onClick={() => selectService(i)}><span>0{i + 1}</span>{item.tag}<i /></button>)}</div>
        </div>
      </section>
      <section id="people" className="people-section chapter-section">
        <div className="people-heading reveal"><Eyebrow number="03">The people behind the possibilities</Eyebrow><h2>Serious about the work.<br /><span className="muted">Never too serious.</span></h2><p>Different perspectives. One shared passion.<br />Creating what’s next, together.</p></div>
        <div className="people-word" aria-hidden="true">HUMAN, ALWAYS.</div>
        <div className="portrait-gallery">{team.map((src,i) => <div key={src} className={`portrait portrait-${i}`} style={{ '--portrait-index': i } as CSSProperties}><a href="https://thevividview.in/who-are-we" data-cursor="MEET" onMouseMove={tilt} onMouseLeave={resetTilt}><img src={`/images/${src}`} alt={`A moment with the Vivid View team ${i + 1}`} loading="lazy" /><span>THE VIVID COLLECTIVE <Arrow /></span></a></div>)}</div>
        <div className="people-footer"><span className="mono">GOOD ENERGY. GREAT IDEAS. REAL PEOPLE.</span><a className="round-link" href="https://thevividview.in/who-are-we">Meet the minds <span><Arrow /></span></a></div>
      </section>
      <section id="reviews" className="reviews-section chapter-section">
        <div className="reviews-intro reveal"><Eyebrow number="04">A different point of view</Eyebrow><h2>Good work.<br /><span className="muted">Better together.</span></h2><p>They say it better than we do.</p><span className="review-note">TESTIMONIAL VISUAL STUDY · COPY PENDING APPROVAL</span></div>
        <div className="quote-stage"><span className="quote-mark" aria-hidden="true">“</span><div key={review} className="quote-content" aria-live="polite"><blockquote>{activeReview.quote.replace('couldn’t', 'couldn’t')}</blockquote><div className="quote-author"><span className="author-avatar">{activeReview.initial}</span><div><strong>{activeReview.name}</strong><span>{activeReview.role}</span></div></div></div><div className="quote-controls"><div className="quote-dots" aria-label="Choose testimonial">{reviews.map((r,i) => <button key={r.name} aria-label={`Testimonial ${i + 1}`} aria-pressed={i === review} onClick={() => setReview(i)} />)}</div><span className="mono">0{review + 1} / 0{reviews.length}</span><div className="arrow-controls"><button aria-label="Previous testimonial" onClick={() => setReview((review + reviews.length - 1) % reviews.length)}><Arrow diagonal={false} /></button><button aria-label="Next testimonial" onClick={() => setReview((review + 1) % reviews.length)}><Arrow diagonal={false} /></button></div></div></div>
      </section>
      <section id="contact" className="contact-section chapter-section">
        <div className="contact-top reveal"><Eyebrow number="05">Your next chapter starts here</Eyebrow><a className="contact-headline" href={contact} data-cursor="LET’S TALK"><h2>Let’s make<br />something <em>vivid.</em></h2><span className="contact-arrow"><Arrow /></span></a><div className="contact-sub"><p>A bold idea? A new beginning?<br />We’d love to be part of it.</p><a className="email-link" href={contact}>contact@thevividview.in <Arrow /></a></div></div>
        <footer><div className="footer-main"><a href="#home" className="brand"><img src="/images/vivid-logo.png" alt="Vivid View" /></a><p>Ideas. Experiences. Impact.</p><div><a href="https://www.instagram.com/thevividview.in/">Instagram ↗</a><a href="https://in.linkedin.com/company/thevividview">LinkedIn ↗</a></div><div><a href="https://thevividview.in/who-are-we">Our story ↗</a><a href={`${contact}?subject=Careers%20at%20Vivid%20View`}>Careers ↗</a></div></div><div className="footer-bottom"><span>© 2026 Vivid View. All rights reserved.</span><div><a href={`${contact}?subject=Privacy%20Policy`}>Privacy policy</a><a href={`${contact}?subject=Terms%20of%20Use`}>Terms of use</a></div><a href="#home">BACK TO THE TOP ↑</a></div></footer>
      </section>
    </main>
    <div className="chapter-indicator" aria-hidden="true"><span>0{chapter + 1}</span><i />{chapters[chapter]}</div>
  </div>
}
