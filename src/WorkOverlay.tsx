import { useEffect, useRef, useState } from 'react'
import { filterPortfolio, galleryTabs } from './scene/galleryData'
import { smoothScroll } from './scene/motion'

const PORTFOLIO = 'https://thevividview.in/our-work'

// Full project list for the "View all" block in Our Work: a plain HTML layer
// over the canvas with its own vertical scroll and filter tabs. Page scroll is
// paused while it is open; Esc or the close button returns to the rail.
export function WorkOverlay({ filter, onClose }: { filter: string; onClose: () => void }) {
  const [tab, setTab] = useState(filter)
  const [closing, setClosing] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const close = () => { setClosing(true); window.setTimeout(onClose, 350) }
  useEffect(() => {
    smoothScroll?.stop()
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); smoothScroll?.start(); previous?.focus() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const cards = filterPortfolio(tab)
  return <div className={`work-overlay${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label="All work" ref={panel} tabIndex={-1} data-lenis-prevent>
    <header className="work-overlay-head">
      <div><span className="work-overlay-kicker">●&nbsp;&nbsp;ALL WORK</span><h2>Every project, <em>in one place.</em></h2></div>
      <button className="work-overlay-close" onClick={close} aria-label="Close all work">Close <span aria-hidden="true">×</span></button>
    </header>
    <nav className="work-overlay-tabs" aria-label="Filter projects">
      {galleryTabs.map(t => <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{t} <small>({filterPortfolio(t).length})</small></button>)}
    </nav>
    <ul className="work-overlay-grid">
      {cards.map((card, i) => <li key={`${tab}-${card.id}`} style={{ animationDelay: `${Math.min(i, 16) * 35}ms` }}>
        <a href={card.href ?? PORTFOLIO}>
          <span className="work-overlay-image"><img src={card.src} alt="" loading="lazy" /></span>
          <span className="work-overlay-caption"><strong>{card.title}</strong><small>{card.sub}</small></span>
        </a>
      </li>)}
    </ul>
  </div>
}
