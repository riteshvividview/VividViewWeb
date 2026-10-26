<script setup lang="ts">
import { gsap } from 'gsap'

const PER_SIDE = 9
const CYCLE = 6 // seconds for one card to travel from center to the edge

const stage = ref<HTMLElement>()
const cards = ref<HTMLElement[]>([])
const items = Array.from({ length: PER_SIDE * 2 }, (_, n) => n)

let tick: (() => void) | null = null
let onMove: ((e: PointerEvent) => void) | null = null
let tiltX = 0, tiltY = 0, curX = 0, curY = 0

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  gsap.from('[data-reveal]', {
    y: 28, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, delay: 0.15
  })

  const place = (time: number) => {
    const unit = Math.min(1, window.innerWidth / 1600)
    cards.value.forEach((el, n) => {
      const side = n < PER_SIDE ? -1 : 1
      const i = n % PER_SIDE
      const p = ((((time / CYCLE) + i / PER_SIDE) % 1) + 1) % 1

      // ease-in: cards start small near the center and accelerate outward
      const e = Math.pow(p, 1.7)
      const z = -2800 + 3000 * e
      const x = side * (120 + 1000 * e) * unit
      // cards face the center: left cards turn right, right cards turn left
      const rotY = -side * (22 + 42 * e)
      const scale = 0.3 + 1.4 * e
      // fade in as it emerges from the center, fade out past the screen edge
      const o = Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.05)

      el.style.opacity = String(o)
      el.style.transform =
        `translate3d(${x}px, 0, ${z}px) rotateY(${rotY}deg) scale(${scale.toFixed(3)})`
    })
  }

  place(0)
  if (reduced) return

  const t0 = performance.now()
  tick = () => {
    place((performance.now() - t0) / 1000)
    curX += (tiltX - curX) * 0.06
    curY += (tiltY - curY) * 0.06
    if (stage.value) stage.value.style.transform = `rotateX(${curY}deg) rotateY(${curX}deg)`
  }
  gsap.ticker.add(tick)

  onMove = (e: PointerEvent) => {
    tiltX = (e.clientX / window.innerWidth - 0.5) * 6
    tiltY = -(e.clientY / window.innerHeight - 0.5) * 3
  }
  window.addEventListener('pointermove', onMove)
})

onBeforeUnmount(() => {
  if (tick) gsap.ticker.remove(tick)
  if (onMove) window.removeEventListener('pointermove', onMove)
})
</script>

<template>
  <section class="hero">
    <header class="nav" data-reveal>
      <a href="/" class="logo">VIVID VIEW</a>
      <nav class="links">
        <a href="/" class="active">Home</a>
        <a href="/our-work">Our Work</a>
        <a href="/who-are-we">Who We Are</a>
        <a href="/our-services">Our Services</a>
      </nav>
      <a href="/lets-talk" class="pill">
        Let's talk
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 11 11 3M4.5 3H11v6.5" /></svg>
      </a>
    </header>

    <div class="scene" aria-hidden="true">
      <div ref="stage" class="stage">
        <div
          v-for="n in items"
          :key="n"
          :ref="(el) => { if (el) cards[n] = el as HTMLElement }"
          class="card"
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 0 100 100M100 0 0 100" vector-effect="non-scaling-stroke" />
          </svg>
        </div>
      </div>
    </div>

    <div class="copy">
      <h1 data-reveal>One platform.<br />Every <em>creative</em> outcome.</h1>
      <p data-reveal>We build brands, digital experiences and stories<br />that actually mean something.</p>
      <a href="/our-work" class="explore" data-reveal>
        <span class="circle">
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1"><path d="M3 11 11 3M4.5 3H11v6.5" /></svg>
        </span>
        <span>Explore<br />Our Work</span>
      </a>
    </div>

    <div class="scroll" data-reveal>
      <span class="line" />
      <span class="circle sm">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1"><path d="M7 2v10M3 8l4 4 4-4" /></svg>
      </span>
      <span>Scroll</span>
    </div>

    <footer class="tags" data-reveal>
      <span>BRANDING <i>/</i> DIGITAL <i>/</i> CONTENT <i>/</i> CAMPAIGNS <i>/</i> SPACES <i>/</i> CONSULTING</span>
      <span class="right">IDEAS <span class="gap" /> PEOPLE <span class="gap" /> EXPERIENCES <span class="gap" /> IMPACT <u /></span>
    </footer>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  height: 100vh;
  min-height: 640px;
  overflow: hidden;
  background: var(--bg);
}

.nav {
  position: absolute; inset: 0 0 auto 0; z-index: 10;
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  padding: 22px 7.5vw;
}
.logo { font-weight: 800; font-size: 26px; letter-spacing: -0.04em; }
.links { display: flex; gap: 46px; font-size: 14px; font-weight: 300; }
.links a { padding-bottom: 6px; border-bottom: 1px solid transparent; }
.links a.active { border-color: var(--ink); }
.pill {
  justify-self: end; display: inline-flex; align-items: center; gap: 14px;
  padding: 13px 26px; border: 1.5px solid var(--ink); border-radius: 999px; font-size: 14px;
}

.scene {
  position: absolute; inset: 0;
  perspective: 1000px;
  perspective-origin: 50% 68%;
}
.stage {
  position: absolute; left: 50%; top: 68%; width: 0; height: 0;
  transform-style: preserve-3d;
}
.card {
  position: absolute; width: 250px; height: 330px; margin: -165px 0 0 -125px;
  background: var(--card);
  border: 1.2px solid var(--card-line);
  border-radius: 14px;
  overflow: hidden;
  will-change: transform, opacity;
}
.card svg { width: 100%; height: 100%; display: block; fill: none; stroke: var(--card-line); stroke-width: 0.8; }

.copy {
  position: absolute; left: 0; right: 0; top: 21vh; z-index: 5;
  text-align: center; pointer-events: none;
}
.copy > * { pointer-events: auto; }
h1 {
  font-family: var(--font-serif); font-weight: 400;
  font-size: clamp(44px, 5.2vw, 84px); line-height: 1.02; letter-spacing: -0.025em;
}
h1 em { font-style: italic; color: #6b6b67; }
.copy p {
  margin-top: 26px; font-size: clamp(14px, 1.15vw, 18px); line-height: 1.6;
  color: var(--ink-soft); font-weight: 300;
}
.explore {
  display: inline-flex; align-items: center; gap: 22px; margin-top: 34px;
  text-align: left; font-size: 18px; line-height: 1.25;
}
.circle {
  display: grid; place-items: center; width: 66px; height: 66px;
  border: 1.5px solid var(--ink); border-radius: 50%; transition: background .3s, color .3s;
}
.circle.sm { width: 48px; height: 48px; border-width: 1px; }
.explore:hover .circle { background: var(--ink); color: var(--bg); }

.scroll {
  position: absolute; left: 50%; bottom: 3.2vh; transform: translateX(-50%); z-index: 5;
  display: flex; flex-direction: column; align-items: center; font-size: 13px;
}
.scroll .line { width: 1px; height: 60px; background: var(--ink); }
.scroll .circle { margin-bottom: 10px; }

.tags {
  position: absolute; left: 3.1vw; right: 3.1vw; bottom: 2.6vh; z-index: 5;
  display: flex; justify-content: space-between; align-items: flex-end;
  font-size: 11px; letter-spacing: 0.02em;
}
.tags i { font-style: normal; margin: 0 14px; }
.tags .right { display: inline-flex; align-items: center; }
.tags .gap { display: inline-block; width: 12px; }
.tags u { display: inline-block; width: 38px; height: 1px; background: var(--ink); margin-left: 28px; }

@media (max-width: 800px) {
  .links, .tags { display: none; }
  .nav { grid-template-columns: 1fr auto; padding: 18px 20px; }
}
</style>
