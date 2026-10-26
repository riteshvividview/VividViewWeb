import { useLayoutEffect, useRef } from 'react'
import { gsap } from './motion'

// Hand-off from the loader to the page: two curtains lift away, the cream
// paper first and an ink layer just behind it, each with a soft curved edge
// that bows while moving and flattens as it settles. A thin line in the logo's
// red rides the ink edge. No noise, so it stays cheap and smooth per frame.
// Plain WebGL on its own canvas so it sits above the scene and the DOM UI.
const vertex = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`
const fragment = `precision highp float;
varying vec2 vUv; uniform float uPaper; uniform float uInk; uniform vec2 uRes;
// Signed distance (in screen heights) above a curtain's lower edge.
float curtain(float p){
  float bow = sin(vUv.x * 3.14159) * .16 * sin(p * 3.14159);
  return vUv.y - (p * 1.35 - .2 + bow);
}
void main(){
  float aa = 1.5 / uRes.y;
  vec3 paper = vec3(.961, .957, .941), ink = vec3(.145, .149, .133), red = vec3(.722, .161, .247);
  float paperCover = smoothstep(-aa, aa, curtain(uPaper));
  float inkEdge = curtain(uInk), inkCover = smoothstep(-aa, aa, inkEdge);
  float line = smoothstep(-aa, aa, inkEdge) - smoothstep(.004 - aa, .004 + aa, inkEdge);
  vec3 col = mix(ink, red, line);
  float alpha = max(paperCover, inkCover);
  col = mix(col, paper, paperCover);
  // Soft shade on the paper's lower edge, as if it lifts off the page.
  col *= 1. - .08 * smoothstep(.06, 0., curtain(uPaper)) * paperCover;
  gl_FragColor = vec4(col * alpha, alpha);
}`

export function PageReveal({ onDone }: { onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), logo = useRef<HTMLDivElement>(null), wrap = useRef<HTMLDivElement>(null)
  // Layout effect: the first frame is drawn before the browser paints, so the
  // hand-off from the loader never shows an empty canvas.
  useLayoutEffect(() => {
    const el = canvas.current, gl = el?.getContext('webgl', { premultipliedAlpha: true, antialias: false })
    if (!el || !gl) { onDone(); return }
    const dpr = Math.min(window.devicePixelRatio, 1.5)
    const resize = () => { el.width = innerWidth * dpr; el.height = innerHeight * dpr; gl.viewport(0, 0, el.width, el.height) }
    resize(); window.addEventListener('resize', resize)
    const shader = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s }
    const program = gl.createProgram()!
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment))
    gl.linkProgram(program); gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uPaper = gl.getUniformLocation(program, 'uPaper'), uInk = gl.getUniformLocation(program, 'uInk'), uRes = gl.getUniformLocation(program, 'uRes')
    const state = { paper: 0, ink: 0 }
    // Draw from GSAP's ticker so the shader and the tween share one clock.
    const draw = () => {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform1f(uPaper, state.paper); gl.uniform1f(uInk, state.ink); gl.uniform2f(uRes, el.width, el.height)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    draw(); gsap.ticker.add(draw)
    // The CSS paper background covers until the canvas holds a frame.
    wrap.current?.classList.add('is-drawn')
    // Short hold first: the scene's first frames upload textures and can hitch.
    const tl = gsap.timeline({ delay: .2, onComplete: onDone })
    tl.to(logo.current, { y: -18, opacity: 0, duration: .5, ease: 'power2.in' })
      .to(state, { paper: 1, duration: 1.15, ease: 'power3.inOut' }, .3)
      .to(state, { ink: 1, duration: 1.15, ease: 'power3.inOut' }, .42)
    return () => { tl.kill(); gsap.ticker.remove(draw); window.removeEventListener('resize', resize); gl.getExtension('WEBGL_lose_context')?.loseContext() }
  }, [onDone])
  return <div ref={wrap} className="page-reveal" aria-hidden="true">
    <canvas ref={canvas} />
    {/* Same markup as the loader so the logo does not shift at the hand-off. */}
    <div ref={logo} className="loader page-reveal-stack"><img src="/images/vivid-logo.png" alt="" /><span>LOADING THE EXPERIENCE</span><i /></div>
  </div>
}
