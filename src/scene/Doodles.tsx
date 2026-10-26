import { useEffect, useRef, type ReactNode } from 'react'
import { gsap, ScrollTrigger } from './motion'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import type { makeLayout } from './layout'

gsap.registerPlugin(MotionPathPlugin)

// SVG illustrations above the canvas. Each one is scrubbed by scroll and leans
// slightly toward the pointer. Positions are in section design units (1600
// wide) and were picked from screenshots to sit only in empty space.
type Layout = ReturnType<typeof makeLayout>
type Piece = { x: number; y: number; depth?: number; node: ReactNode }

const STAR = 'M0 -14 C2 -4 4 -2 14 0 C4 2 2 4 0 14 C-2 4 -4 2 -14 0 C-4 -2 -2 -4 0 -14Z'
const ASTERISK = 'M0 -12V12M-10.4 -6L10.4 6M-10.4 6L10.4 -6'

const Spin = ({ d, s = 1, dir = 1 }: { d: string; s?: number; dir?: number }) =>
  <g data-fx="spin" data-dir={dir}><path d={d} transform={`scale(${s})`} /></g>

const Orbit = ({ r }: { r: number }) => <g>
  <circle r={r} strokeDasharray="2 5" />
  <g data-fx="spin" data-dir={1}><circle cx={r} r={3} className="doodle-fill" /></g>
</g>

// Light bulb: glass and filament draw in, rays burst out and it glows.
const Bulb = () => <g data-fx="bulb">
  <circle className="bulb-glow" r={30} cy={-14} />
  <g className="bulb-rays">{Array.from({ length: 8 }, (_, i) => <path key={i} d="M0 -50V-64" transform={`translate(0 -14) rotate(${i * 45})`} />)}</g>
  <path className="bulb-draw" d="M-14 14C-14 2 -30 -2 -30 -18A30 30 0 0 1 30 -18C30 -2 14 2 14 14Z" />
  <path className="bulb-draw" d="M-7 10L-4 -12L0 -4L4 -12L7 10" />
  <path className="bulb-draw" d="M-12 21H12M-9 28H9" />
</g>

// Paper plane flies along a looping route; its trail draws behind it.
const PLANE_ROUTE = 'M0 170C110 170 150 60 250 90S330 210 420 150S560 10 640 40'
const Plane = () => <g data-fx="plane">
  <path className="plane-route" d={PLANE_ROUTE} strokeDasharray="3 7" />
  <path className="plane-trail" d={PLANE_ROUTE} />
  <g className="plane-body"><path d="M14 0L-16 -12L-9 0L-16 12Z" className="doodle-paper" /><path d="M-9 0H14" /></g>
</g>

// Pencil writes a wave across the empty strip above the contact card.
const PENCIL_ROUTE = 'M0 40C40 0 80 0 120 40S200 80 240 40S320 0 360 40S440 80 480 40'
const Pencil = () => <g data-fx="pencil">
  <path className="pencil-line" d={PENCIL_ROUTE} />
  <g className="pencil-body"><g transform="rotate(-40)">
    <path d="M0 0L8 -5V5Z" className="doodle-fill" />
    <path d="M8 -5H58V5H8M58 -5H68V5H58" className="doodle-paper" />
  </g></g>
</g>

// Chat bubble pops open and the typing dots bounce in turn.
const Chat = () => <g data-fx="chat">
  <path className="chat-bubble doodle-paper" d="M-46 -26H46A12 12 0 0 1 58 -14V14A12 12 0 0 1 46 26H-20L-36 40V26H-46A12 12 0 0 1 -58 14V-14A12 12 0 0 1 -46 -26Z" />
  {[-20, 0, 20].map(x => <circle key={x} className="chat-dot doodle-fill" cx={x} r={4.5} />)}
</g>

const desktop: Piece[][] = [
  [
    { x: 1180, y: 214, depth: 14, node: <Spin d={STAR} s={1.1} /> },
    { x: 390, y: 300, depth: 8, node: <Spin d={ASTERISK} s={.8} dir={-1} /> },
    { x: 300, y: 205, depth: 10, node: <Orbit r={22} /> },
  ],
  [
    { x: 70, y: 120, depth: 10, node: <Spin d={STAR} s={.9} /> },
    { x: 700, y: 40, depth: 18, node: <Plane /> },
  ],
  [],
  [],
  [
    { x: 1500, y: 140, depth: 12, node: <Spin d={STAR} s={1.2} dir={-1} /> },
    { x: 830, y: 270, depth: 16, node: <Bulb /> },
  ],
  [
    { x: 160, y: 140, depth: 10, node: <Spin d={STAR} s={1} /> },
    { x: 520, y: 30, depth: 12, node: <Pencil /> },
    { x: 590, y: 610, depth: 16, node: <Chat /> },
  ],
]

export function Doodles({ layout, reduced }: { layout: Layout; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el || reduced || layout.mobile) return
    const ctx = gsap.context(() => {
      el.querySelectorAll<SVGSVGElement>('svg.doodle-section').forEach(svg => {
        const scrub = (extra: object = {}) => ({ trigger: svg, start: 'top 85%', end: 'center 40%', scrub: .6, ...extra })
        const span = { trigger: svg, start: 'top bottom', end: 'bottom top', scrub: .6 }
        svg.querySelectorAll<SVGGElement>('[data-fx="spin"]').forEach(g => gsap.to(g, { rotation: 360 * Number(g.dataset.dir), svgOrigin: '0 0', ease: 'none', scrollTrigger: span }))
        const drawIn = (paths: SVGPathElement[]) => paths.map(p => { const len = p.getTotalLength(); return gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none' }) })
        svg.querySelectorAll<SVGGElement>('[data-fx="bulb"]').forEach(g => {
          const tl = gsap.timeline({ scrollTrigger: scrub() })
          drawIn(Array.from(g.querySelectorAll<SVGPathElement>('.bulb-draw'))).forEach((t, i) => tl.add(t, i * .15))
          tl.fromTo(g.querySelectorAll('.bulb-rays path'), { scale: 0, opacity: 0, svgOrigin: '0 -14' }, { scale: 1, opacity: 1, stagger: .03, ease: 'back.out(3)' }, .5)
          tl.fromTo(g.querySelector('.bulb-glow'), { opacity: 0, scale: .4, svgOrigin: '0 -14' }, { opacity: 1, scale: 1, ease: 'power2.out' }, .5)
          tl.to(g, { rotation: 8, svgOrigin: '0 28', yoyo: true, repeat: 1, ease: 'sine.inOut', duration: .3 }, .6)
        })
        svg.querySelectorAll<SVGGElement>('[data-fx="plane"]').forEach(g => {
          const route = g.querySelector<SVGPathElement>('.plane-trail')!, len = route.getTotalLength()
          const tl = gsap.timeline({ scrollTrigger: scrub({ end: 'center 20%' }) })
          tl.fromTo(route, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none' }, 0)
          tl.to(g.querySelector('.plane-body'), { motionPath: { path: route, autoRotate: true }, ease: 'none' }, 0)
        })
        svg.querySelectorAll<SVGGElement>('[data-fx="pencil"]').forEach(g => {
          const line = g.querySelector<SVGPathElement>('.pencil-line')!, len = line.getTotalLength()
          const tl = gsap.timeline({ scrollTrigger: scrub({ start: 'top 95%', end: 'top 30%' }) })
          tl.fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none' }, 0)
          tl.to(g.querySelector('.pencil-body'), { motionPath: { path: line }, ease: 'none' }, 0)
        })
        svg.querySelectorAll<SVGGElement>('[data-fx="chat"]').forEach(g => {
          const tl = gsap.timeline({ scrollTrigger: scrub({ start: 'top 70%', end: 'center 30%' }) })
          tl.fromTo(g.querySelector('.chat-bubble'), { scale: 0, svgOrigin: '-36 40' }, { scale: 1, ease: 'back.out(2)', duration: .4 })
          g.querySelectorAll('.chat-dot').forEach((dot, i) => tl.fromTo(dot, { y: 0 }, { y: -9, yoyo: true, repeat: 3, ease: 'sine.inOut', duration: .15 }, .4 + i * .08))
        })
      })
    }, el)
    // Pointer parallax: nearer pieces (higher depth) follow the cursor more.
    const movers = Array.from(el.querySelectorAll<SVGGElement>('[data-depth]')).map(g => ({ depth: Number(g.dataset.depth), x: gsap.quickTo(g, 'x', { duration: .8 }), y: gsap.quickTo(g, 'y', { duration: .8 }) }))
    const point = (e: PointerEvent) => {
      const dx = e.clientX / window.innerWidth - .5, dy = e.clientY / window.innerHeight - .5
      movers.forEach(m => { m.x(dx * m.depth * 2); m.y(dy * m.depth * 2) })
    }
    window.addEventListener('pointermove', point, { passive: true })
    ScrollTrigger.refresh()
    return () => { window.removeEventListener('pointermove', point); ctx.revert() }
  }, [layout, reduced])
  if (layout.mobile) return null
  return <div className="doodles" ref={root} aria-hidden="true" style={{ height: layout.total }}>
    {layout.sections.map((section, i) => section.id === 'services' ? null : <svg key={section.id} className="doodle-section" style={{ top: section.top, height: section.height }} viewBox={`0 0 1600 ${section.designHeight}`}>
      {desktop[i].map((piece, j) => <g key={j} transform={`translate(${piece.x} ${piece.y})`}><g data-depth={piece.depth ?? 10}>{piece.node}</g></g>)}
    </svg>)}
  </div>
}

