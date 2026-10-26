import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)
export { gsap, ScrollTrigger }
export let smoothScroll: Lenis | undefined
export function startSmoothScroll() {
  const lenis = new Lenis({ lerp: .13, smoothWheel: true, syncTouch: false, anchors: true, wheelMultiplier: .95 })
  smoothScroll = lenis
  const tick = (time: number) => lenis.raf(time * 1000)
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0)
  return () => { gsap.ticker.remove(tick); lenis.destroy(); if(smoothScroll === lenis) smoothScroll = undefined }
}
