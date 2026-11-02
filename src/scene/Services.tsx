import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Label, Stroke, go, useSection } from './primitives'
import { INK } from './layout'
import { gsap, smoothScroll } from './motion'
import { services, SERVICE_LEAD, SERVICE_STEP } from './servicesData'

// Pinned services stage, staged as a photo shoot. A marble bust is the sitter;
// scroll moves the "camera" around it through a series of shots, three per
// service. Each shot reframes the bust and prints a polaroid
// of that service's work, which develops from dark to full colour on a pile.
// Visitors can take their own shot: the webcam frame prints onto the pile too
// (it stays in the browser, nothing is uploaded).
const SERVICES_URL = 'https://thevividview.in/our-services'
const MODEL = '/models/lady-bust.glb'
const TITLE_FONT = '/fonts/inter-bold.ttf'
const CAPTION_FONT = '/fonts/display-italic.ttf'
const ACCENT = '#B8293D'
// Small type sits on the dark gallery, so it uses cream and an aged gold.
const CREAM = '#efe4cf', GOLD = '#d9a866', IVORY = '#f2e7d2'
const SHOTS_PER_SERVICE = 3
const SHOTS = services.length * SHOTS_PER_SERVICE
const PILE = 5

type Shot = { key: string; tex: THREE.Texture; caption: string; aspect: number }
type Focus = { key: number; tex: THREE.Texture; aspect: number; x: number; y: number; w: number; h: number }
// blockers: foreground objects (bust, prints, button) that shield the backdrop
// from hover and clicks.
type Shared = { progress: number; shot: number; flash: number; aim: THREE.Vector2; spin: number; blockers: THREE.Object3D[]; aside: number }
const shotOf = (progress: number) => Math.min(SHOTS - 1, Math.floor(progress * SHOTS_PER_SERVICE + .5))

export function ServicesSection() {
  const { layout, scroll, reduced } = useSection(), mobile = layout.width < 760
  const viewport = useThree(state => state.size.height) / layout.scale
  const maxTravel = Math.max(0, layout.designHeight - viewport)
  const pin = useRef<THREE.Group>(null)
  const shared = useRef<Shared>({ progress: 0, shot: 0, flash: 0, aim: new THREE.Vector2(), spin: 0, blockers: [], aside: 0 })
  const [shot, setShot] = useState(0)
  // Each portrait remembers the shot it was taken on, so it joins the pile in
  // sequence and later shots land on top of it like any other print.
  const [selfies, setSelfies] = useState<{ shot: Shot; after: number }[]>([])
  const [focus, setFocus] = useState<Focus | null>(null)
  const open = (tile: Tile, world: THREE.Vector3) => {
    if (!pin.current) return
    const at = pin.current.worldToLocal(world.clone())
    const image = tile.tex.image as HTMLImageElement
    setFocus({ key: Math.random(), tex: tile.tex, aspect: image.width / image.height, x: at.x, y: at.y, w: tile.w, h: tile.h })
  }
  const pointer = useRef(new THREE.Vector2())
  useEffect(() => { const move = (e: PointerEvent) => pointer.current.set(e.clientX / window.innerWidth - .5, e.clientY / window.innerHeight - .5); window.addEventListener('pointermove', move); return () => window.removeEventListener('pointermove', move) }, [])
  const fire = () => { if (!reduced) gsap.fromTo(shared.current, { flash: 1 }, { flash: 0, duration: 1.6, ease: 'none', overwrite: true }) }
  useFrame((_, dt) => {
    const travel = THREE.MathUtils.clamp((scroll.current - layout.top) / layout.scale, 0, maxTravel)
    if (pin.current) pin.current.position.y = -travel
    const s = shared.current
    const next = THREE.MathUtils.clamp((travel - SERVICE_LEAD) / SERVICE_STEP, 0, services.length - 1)
    // Scroll speed, smoothed: drives the bust's spin and the orbiting shapes.
    if (dt > 0) s.spin = THREE.MathUtils.damp(s.spin, THREE.MathUtils.clamp((next - s.progress) / dt, -3, 3), 6, dt)
    s.progress = next
    if (!reduced) s.aim.lerp(pointer.current, 1 - Math.exp(-4 * dt))
    const now = shotOf(s.progress)
    if (now !== s.shot) { s.shot = now; setShot(now); fire() }
  }, -1)

  // Service shots: three images per service, printed in order.
  const sources = useMemo(() => services.flatMap(s => Array.from({ length: SHOTS_PER_SERVICE }, (_, i) => s.images[i % s.images.length])), [])
  const textures = useTexture(sources)
  const prints = useMemo(() => textures.map((tex, i): Shot => {
    tex.colorSpace = THREE.SRGBColorSpace
    const image = tex.image as HTMLImageElement, service = services[Math.floor(i / SHOTS_PER_SERVICE)]
    return { key: `s${i}`, tex, caption: `${service.tag.toLowerCase()} · ${String(i % SHOTS_PER_SERVICE + 1).padStart(2, '0')}`, aspect: image.width / image.height }
  }), [textures])
  const pile = useMemo(() => {
    const order: Shot[] = []
    for (let i = 0; i <= shot; i++) { order.push(prints[i]); selfies.filter(sf => sf.after === i).forEach(sf => order.push(sf.shot)) }
    return order.slice(-PILE).reverse()
  }, [selfies, prints, shot])

  const service = Math.floor(shot / SHOTS_PER_SERVICE)
  const pad = mobile ? 22 : 70
  const bust = mobile ? { x: 195, y: viewport * .5, h: 330 } : { x: 760, y: viewport / 2 - 20, h: viewport * .68 }
  const stack = mobile ? { x: 285, y: viewport - 170, w: 150 } : { x: 1270, y: viewport / 2 + 10, w: 290 }
  return <group ref={pin}>
    <Backdrop viewport={viewport} service={service} onOpen={open} paused={!!focus} shared={shared} />
    <Gallery x={bust.x} y={bust.y} w={layout.width} h={viewport} />
    <Bust x={bust.x} y={bust.y} height={bust.h} shared={shared} />
    <Viewfinder x={bust.x} y={bust.y} w={mobile ? 260 : 520} h={mobile ? 300 : viewport * .74} shared={shared} />
    <group ref={g => { const b = shared.current.blockers; if (g && !b.includes(g)) b.push(g) }}>{pile.map((p, slot) => <Polaroid key={p.key} shot={p} slot={slot} x={stack.x} y={stack.y} w={stack.w} />)}</group>
    <Grain w={layout.width} h={viewport} />
    {focus && <Lightbox key={focus.key} focus={focus} viewport={viewport} shared={shared} onClosed={() => setFocus(null)} />}

    <Label x={pad} y={mobile ? 78 : 120} size={mobile ? 10 : 12} tracking={.16} color={CREAM} animated={false}>●  OUR SERVICES</Label>
    {services.map((s, i) => <Title key={s.tag} index={i} text={s.title.toUpperCase()} x={pad} y={mobile ? 104 : viewport / 2 - 130} size={mobile ? 34 : 92} active={service} />)}
    <Label x={pad} y={mobile ? 190 : viewport / 2 + 110} size={mobile ? 10 : 12} tracking={.16} color={GOLD} animated={false}>{`SHOT ${String(shot + 1).padStart(2, '0')} / ${SHOTS}`}</Label>
    <group ref={g => { const b = shared.current.blockers; if (g && !b.includes(g)) b.push(g) }}><SelfieButton x={mobile ? 22 : stack.x - stack.w / 2} y={mobile ? viewport - 60 : stack.y + stack.w * 1.2 / 2 + 70} onShot={p => { fire(); setSelfies(list => [...list, { shot: p, after: shared.current.shot }].slice(-4)) }} /></group>
    {!mobile && <Label x={layout.width - pad} y={viewport - 70} size={12} tracking={.16} align="right" color={CREAM} animated={false} onClick={() => go(SERVICES_URL)}>ALL SERVICES  →</Label>}
  </group>
}

// Giant service title in warm ivory with a soft dark shadow, like letters lit
// in the gallery; the outgoing one drops away as the next rises in.
function Title({ index, text, x, y, size, active }: { index: number; text: string; x: number; y: number; size: number; active: number }) {
  const { clip, reduced } = useSection()
  const group = useRef<THREE.Group>(null), material = useRef<THREE.MeshBasicMaterial>(null), shadow = useRef<THREE.MeshBasicMaterial>(null)
  const state = useRef({ t: index === 0 ? 0 : 1 })
  useEffect(() => {
    const target = index === active ? 0 : index < active ? -1 : 1
    gsap.to(state.current, { t: target, duration: reduced ? 0 : .8, ease: 'power3.out', overwrite: true })
  }, [active, index, reduced])
  useFrame(() => {
    if (!group.current || !material.current || !shadow.current) return
    const t = state.current.t
    group.current.visible = Math.abs(t) < .99
    group.current.position.y = t * size * .6
    material.current.opacity = 1 - Math.min(1, Math.abs(t) * 1.4)
    shadow.current.opacity = material.current.opacity * .5
  })
  const props = { font: TITLE_FONT, fontSize: size, lineHeight: .92, letterSpacing: -.05, anchorX: 'left' as const, anchorY: 'top' as const, raycast: () => {} }
  return <group ref={group}>
    <Text {...props} position={[x + size * .03, -y - size * .04, 38]}>{text}<meshBasicMaterial ref={shadow} color="#140d07" transparent clippingPlanes={clip} /></Text>
    <Text {...props} position={[x, -y, 40]}>{text}<meshBasicMaterial ref={material} color={IVORY} transparent clippingPlanes={clip} /></Text>
  </group>
}

// The sitter. Every shot has its own framing (turn, tilt, close-up), so the
// bust appears to be re-shot from a new angle each time; the pointer adds a
// little parallax on top.
// dy shifts the bust down (fraction of its height) so close-ups frame the face.
const FRAMES = [{ ry: -.45, rx: 0, zoom: 1, dy: 0 }, { ry: .35, rx: -.05, zoom: 1.35, dy: .2 }, { ry: .9, rx: .05, zoom: 1.1, dy: .05 }, { ry: -.95, rx: -.08, zoom: 1.5, dy: .28 }, { ry: 0, rx: .04, zoom: 1.2, dy: .12 }]
// Entrance: while the section scrolls into view the bust starts at the top of
// the section, a little larger, and flows down into its place on the stage.
// It starts in the extra gap above the section, so nothing is cut off.
function Bust({ x, y, height, shared }: { x: number; y: number; height: number; shared: React.MutableRefObject<Shared> }) {
  const { clip: sectionClip, reduced, layout, scroll } = useSection()
  // Top plane dropped: the entrance starts up in the empty gap above.
  const clip = useMemo(() => sectionClip.slice(1), [sectionClip])
  const base = useRef({ y: -y, zoom: 1, ry: 0 })
  const { scene } = useGLTF(MODEL)
  const rig = useRef<THREE.Group | null>(null)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone), size = box.getSize(new THREE.Vector3())
    const unit = 1 / size.y
    clone.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return
      const mat = (obj.material as THREE.MeshStandardMaterial).clone()
      mat.clippingPlanes = clip; mat.roughness = .62
      obj.geometry.computeBoundingBox()
      const gb = obj.geometry.boundingBox!, gh = gb.max.y - gb.min.y
      // Rough, aged stone: procedural grain, faint veins and a warm patina,
      // in object space so it stays put as the bust turns.
      mat.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 vObj;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
        shader.fragmentShader = `varying vec3 vObj;
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
` + shader.fragmentShader
          .replace('#include <map_fragment>', `#include <map_fragment>
vec3 q=vObj*${(40 / gh).toFixed(6)};
float grain=n3(q*6.)*.5+n3(q*19.)*.3+h3(floor(q*60.))*.2;
float vein=smoothstep(.015,0.,abs(sin(q.x*3.1+q.y*1.7+n3(q*1.4)*5.)))*.5;
diffuseColor.rgb*=mix(.72,1.04,grain);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.5,.45,.4),vein*.2);diffuseColor.rgb*=vec3(1.,.96,.9);`)
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(grain-.5)*.5,.2,1.);')
      }
      mat.customProgramCacheKey = () => 'bust-marble'
      obj.material = mat
    })
    // Normalise to unit height so `height` is the on-screen height in design px.
    clone.scale.multiplyScalar(unit)
    clone.position.copy(box.getCenter(new THREE.Vector3()).multiplyScalar(-unit))
    return clone
  }, [scene, clip])
  useEffect(() => () => { model.traverse(o => { if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose() }) }, [model])
  useFrame(({ clock }, dt) => {
    if (!rig.current) return
    const s = shared.current, f = FRAMES[s.shot % FRAMES.length], time = reduced ? 0 : clock.elapsedTime
    const ease = reduced ? 1 : 1 - Math.exp(-4 * dt)
    base.current.ry += (f.ry + s.aim.x * .35 + Math.sin(time * .3) * .04 + s.spin * .9 - base.current.ry) * ease
    rig.current.rotation.z = THREE.MathUtils.damp(rig.current.rotation.z, -s.spin * .12, 5, dt)
    rig.current.rotation.x += (f.rx + s.aim.y * .15 - rig.current.rotation.x) * ease
    const b = base.current
    b.zoom += (f.zoom - b.zoom) * ease
    b.y += (-y - f.dy * height * f.zoom - b.y) * ease
    const view = window.innerHeight
    const enter = reduced ? 1 : THREE.MathUtils.smootherstep(scroll.current, layout.top - view, layout.top)
    const away = 1 - enter
    // Steps aside (left, smaller) while a print is open in the lightbox.
    const aside = s.aside
    rig.current.scale.setScalar(height * b.zoom * (1 + away * .3) * (1 - aside * .3))
    rig.current.position.x = x - aside * (x - layout.width * .2)
    rig.current.position.y = b.y + away * (y - height * .35)
    rig.current.rotation.y = b.ry
  })
  return <>
    <ambientLight intensity={.5} color="#e6d8c4" />
    <pointLight position={[x - 200, -y + 150, 900]} intensity={1.6} distance={0} decay={0} color="#ffe2bd" />
    <directionalLight position={[-700, 900, 900]} intensity={2.8} color="#ffe6c8" />
    <directionalLight position={[300, 200, -900]} intensity={2.2} color="#ffb877" />
    <directionalLight position={[1400, -300, 500]} intensity={.35} color="#8fa0b8" />
    <group ref={g => { rig.current = g; const b = shared.current.blockers; if (g && !b.includes(g)) b.push(g) }} position={[x, -y, 150]} scale={height}><primitive object={model} /></group>
  </>
}
useGLTF.preload(MODEL)

// Corner brackets around the sitter. They pull in to focus just before each
// shot lands and spring back out as it is taken.
function Viewfinder({ x, y, w, h, shared }: { x: number; y: number; w: number; h: number; shared: React.MutableRefObject<Shared> }) {
  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!group.current) return
    const s = shared.current, phase = (s.progress * SHOTS_PER_SERVICE + .5) % 1
    group.current.scale.setScalar(1 - THREE.MathUtils.smoothstep(phase, .55, .98) * .08 + s.flash * .04)
  })
  const arm = 36
  const corner = (sx: number, sy: number) => [[sx * w / 2, sy * (h / 2 - arm)], [sx * w / 2, sy * h / 2], [sx * (w / 2 - arm), sy * h / 2]]
  return <group position={[x, -y, 0]}><group ref={group}>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => <Stroke key={`${sx}${sy}`} points={corner(sx, sy)} z={260} width={2} />)}
    <Stroke points={[[-10, 0], [10, 0]]} z={260} opacity={.5} />
    <Stroke points={[[0, -10], [0, 10]]} z={260} opacity={.5} />
  </group></group>
}

// The stage's dark layers don't stop at a hard line where the section ends:
// they thin out over a band with a ragged, slowly drifting edge, so the
// gallery melts into the page above and below. World-space, so it holds still
// while the stage is pinned.
const EDGE = `varying vec3 vWorld;uniform float uTop,uBottom,uFeather,uEdgeTime;
float eHash(float x){return fract(sin(x*127.1)*43758.5453);}
float eNoise(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(eHash(i),eHash(i+1.),f);}
float edgeFade(){
  float d=min(uTop-vWorld.y,vWorld.y-uBottom);
  float n=eNoise(vWorld.x*.006+uEdgeTime*.15)*.6+eNoise(vWorld.x*.025-uEdgeTime*.1)*.4;
  return smoothstep(0.,uFeather,d-n*uFeather*.55);
}`
function useEdge() {
  const { layout, reduced } = useSection()
  const uniforms = useMemo(() => ({ uTop: { value: -layout.top }, uBottom: { value: -(layout.top + layout.height) }, uFeather: { value: 260 * layout.scale }, uEdgeTime: { value: 0 } }), [layout.top, layout.height, layout.scale])
  useFrame(({ clock }) => { uniforms.uEdgeTime.value = reduced ? 0 : clock.elapsedTime })
  return uniforms
}

// A printed shot. Ejects onto the pile with a small toss, then develops from a
// murky brown to full colour; older prints fan out behind it.
const printVertex = `varying vec2 vUv;varying vec3 vWorld;
#include <clipping_planes_pars_vertex>
void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <clipping_planes_vertex>
}`
const printFragment = `varying vec2 vUv;uniform sampler2D uMap;uniform float uDev,uAspect;
#include <clipping_planes_pars_fragment>
void main(){
  #include <clipping_planes_fragment>
  vec2 uv=vUv-.5;uv=uAspect>1.?vec2(uv.x/uAspect,uv.y):vec2(uv.x,uv.y*uAspect);
  vec3 c=texture2D(uMap,uv+.5).rgb;
  float l=dot(c,vec3(.299,.587,.114));
  vec3 latent=mix(vec3(.16,.12,.09),vec3(.55,.42,.3),l*.6);
  float d=smoothstep(0.,1.,uDev);
  c=mix(latent,mix(vec3(l)*vec3(1.05,.95,.82),c,smoothstep(.5,1.,d)),smoothstep(0.,.7,d));
  c=mix(c,vec3(l)*vec3(1.08,.93,.74),.3)*.95+vec3(.03,.02,0.);
  gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}`
function Polaroid({ shot, slot, x, y, w }: { shot: Shot; slot: number; x: number; y: number; w: number }) {
  const { clip, reduced } = useSection()
  const group = useRef<THREE.Group>(null), print = useRef<THREE.ShaderMaterial>(null)
  const seed = useMemo(() => { let h = 0; for (const c of shot.key) h = (h * 31 + c.charCodeAt(0)) % 997; return h / 997 }, [shot.key])
  const state = useRef({ enter: reduced ? 1 : 0, dev: reduced ? 1 : 0, slot })
  const uniforms = useMemo(() => ({ uMap: { value: shot.tex }, uDev: { value: state.current.dev }, uAspect: { value: shot.aspect } }), [shot])
  useEffect(() => {
    if (reduced) return
    const s = state.current
    const tweens = [gsap.to(s, { enter: 1, duration: .9, ease: 'back.out(1.4)' }), gsap.to(s, { dev: 1, duration: .9, delay: .1, ease: 'power2.out' })]
    return () => tweens.forEach(t => t.kill())
  }, [reduced])
  useEffect(() => { gsap.to(state.current, { slot, duration: reduced ? 0 : .6, ease: 'power2.out' }) }, [slot, reduced])
  useFrame(() => {
    if (!group.current) return
    const s = state.current, k = s.slot
    if (print.current) print.current.uniforms.uDev.value = s.dev
    group.current.position.set(x - k * w * .16 + (1 - s.enter) * w * .9, -(y + k * w * .05) + (1 - s.enter) * w * .4, 420 - k * 12)
    group.current.rotation.z = (k < .5 ? -.04 : (seed - .5) * .5) + (1 - s.enter) * -.5
    group.current.scale.setScalar((1 - k * .07) * (.85 + s.enter * .15))
  })
  const h = w * 1.2, inner = w * .88
  return <group ref={group}>
    <mesh position={[8, -10, -2]} raycast={() => {}}><planeGeometry args={[w, h]} /><meshBasicMaterial color="#000" transparent opacity={.1} clippingPlanes={clip} /></mesh>
    <mesh raycast={() => {}}><planeGeometry args={[w, h]} /><meshBasicMaterial color="#efe4cf" clippingPlanes={clip} /></mesh>
    <mesh position={[0, (h - inner) / 2 - w * .06, 1]} raycast={() => {}}><planeGeometry args={[inner, inner]} /><shaderMaterial ref={print} uniforms={uniforms} vertexShader={printVertex} fragmentShader={printFragment} clipping clippingPlanes={clip} /></mesh>
    <Text font={CAPTION_FONT} position={[-inner / 2, -h / 2 + w * .1, 2]} fontSize={w * .075} anchorX="left" anchorY="middle" raycast={() => {}}>{shot.caption}<meshBasicMaterial color={INK} clippingPlanes={clip} /></Text>
  </group>
}

// "Take your shot": asks for the webcam only when clicked, grabs one frame,
// stops the camera straight away and prints the frame onto the pile.
function SelfieButton({ x, y, onShot }: { x: number; y: number; onShot: (shot: Shot) => void }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'blocked'>('idle')
  const count = useRef(0)
  const take = async () => {
    if (status === 'busy') return
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('blocked'); return }
    setStatus('busy')
    let stream: MediaStream | undefined
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 720, height: 720, facingMode: 'user' }, audio: false })
      const video = document.createElement('video')
      video.srcObject = stream; video.muted = true; video.playsInline = true
      await video.play()
      // Give auto-exposure a moment before the shot.
      await new Promise(r => setTimeout(r, 700))
      const size = Math.min(video.videoWidth, video.videoHeight), canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.translate(size, 0); ctx.scale(-1, 1)
      ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, size, size)
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace
      onShot({ key: `you${count.current++}`, tex, caption: 'you, in focus · vivid view', aspect: 1 })
      setStatus('idle')
    } catch { setStatus('blocked') } finally { stream?.getTracks().forEach(t => t.stop()) }
  }
  const text = status === 'busy' ? 'SMILE…' : status === 'blocked' ? 'CAMERA UNAVAILABLE' : 'TAKE YOUR PORTRAIT'
  return <PillButton x={x} y={y} text={text} busy={status === 'busy'} onClick={take} />
}

// Rounded outline button with a small lens icon; fills with aged gold on hover.
function PillButton({ x, y, text, busy, onClick }: { x: number; y: number; text: string; busy: boolean; onClick: () => void }) {
  const { clip } = useSection()
  const w = 64 + text.length * 9.6, h = 46, r = h / 2
  const shape = useMemo(() => { const s = new THREE.Shape(); s.moveTo(r, 0); s.lineTo(w - r, 0); s.absarc(w - r, -r, r, Math.PI / 2, -Math.PI / 2, true); s.lineTo(r, -h); s.absarc(r, -r, r, -Math.PI / 2, Math.PI / 2, true); return s }, [w, h, r])
  const outline = useMemo(() => new THREE.BufferGeometry().setFromPoints(shape.getPoints(24).map(p => new THREE.Vector3(p.x, p.y, 0))), [shape])
  const ring = useMemo(() => new THREE.BufferGeometry().setFromPoints(Array.from({ length: 32 }, (_, i) => new THREE.Vector3(Math.cos(i / 32 * Math.PI * 2), Math.sin(i / 32 * Math.PI * 2), 0))), [])
  useEffect(() => () => { outline.dispose(); ring.dispose() }, [outline, ring])
  const fill = useRef<THREE.MeshBasicMaterial>(null), label = useRef<THREE.MeshBasicMaterial>(null), lens = useRef<THREE.Group>(null)
  const hover = useRef(0), target = useRef(0)
  const ink = useMemo(() => [new THREE.Color(CREAM), new THREE.Color('#1c130b')], [])
  useFrame(({ clock }, dt) => {
    hover.current = THREE.MathUtils.damp(hover.current, target.current, 10, dt)
    if (fill.current) fill.current.opacity = .35 + hover.current * .6
    fill.current?.color.set('#20160d').lerp(new THREE.Color(GOLD), hover.current)
    label.current?.color.copy(ink[0]).lerp(ink[1], hover.current)
    if (lens.current) lens.current.rotation.z = busy ? clock.elapsedTime * 4 : THREE.MathUtils.damp(lens.current.rotation.z, hover.current * Math.PI / 3, 8, dt)
  })
  return <group position={[x, -y, 360]}>
    <mesh onClick={e => { e.stopPropagation(); onClick() }} onPointerOver={() => { target.current = 1; document.body.style.cursor = 'pointer' }} onPointerOut={() => { target.current = 0; document.body.style.cursor = '' }}>
      <shapeGeometry args={[shape, 24]} /><meshBasicMaterial ref={fill} color="#20160d" transparent opacity={.35} clippingPlanes={clip} />
    </mesh>
    <lineLoop geometry={outline} position={[0, 0, 1]} raycast={() => {}}><lineBasicMaterial color={GOLD} transparent opacity={.9} clippingPlanes={clip} /></lineLoop>
    <group ref={lens} position={[r, -r, 2]}>
      {Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2; return <Stroke key={i} points={[[Math.cos(a) * 9, Math.sin(a) * 9], [Math.cos(a + 1.3) * 4, Math.sin(a + 1.3) * 4]]} color={GOLD} width={1.4} /> })}
      <lineLoop geometry={ring} raycast={() => {}} scale={[9, 9, 1]}><lineBasicMaterial color={GOLD} clippingPlanes={clip} /></lineLoop>
    </group>
    <Text font="/fonts/body.ttf" position={[r * 2 + 4, -r, 2]} fontSize={12} letterSpacing={.16} anchorX="left" anchorY="middle" raycast={() => {}}>{text}<meshBasicMaterial ref={label} color={CREAM} clippingPlanes={clip} /></Text>
  </group>
}

// Background flow: tilted columns of each service's work, every tile at its
// image's own proportions, drifting up and down behind the stage and toned
// like old sepia prints. On a service change the old prints wipe down out of
// their frames and the new service's prints rise in, column by column.
// Hovering a tile stops its column, lifts it above the gallery shade and
// brings it back to full colour; clicking it opens it in the lightbox.
const tileFragment = `uniform sampler2D uMap;uniform float uColor,uBurn;
varying vec2 vUv;${EDGE}
#include <clipping_planes_pars_fragment>
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  #include <clipping_planes_fragment>
  vec3 c=texture2D(uMap,vUv).rgb;
  float l=dot(c,vec3(.299,.587,.114));
  vec3 old=mix(c,vec3(l)*vec3(1.1,.9,.66),.75);
  old=mix(old,vec3(.78,.68,.55),.35);
  vec2 q=vUv-.5;old*=(1.-dot(q,q)*.9)*(.9+hash(floor(vUv*90.))*.1);
  // Reveal: a clean wipe rising up the print, led by a thin cream line;
  // uBurn 0 = hidden, 1 = whole.
  float e=smoothstep(0.,1.,uBurn)*1.02;
  if(vUv.y>e)discard;
  vec3 col=mix(old,c,uColor);
  col=mix(col,vec3(.95,.9,.8),smoothstep(.012,0.,e-vUv.y)*step(uBurn,.999));
  gl_FragColor=vec4(col,max(edgeFade(),uColor));
  #include <colorspace_fragment>
}`
const COLUMNS = 6
type Tile = { tex: THREE.Texture; y: number; w: number; h: number; delay: number; material: THREE.ShaderMaterial; color: number }
type Column = { tiles: Tile[]; loop: number; offset: number; speed: number; held: number }
type Layer = { columns: Column[]; show: { value: number } }
function Backdrop({ viewport, service, onOpen, paused, shared }: { viewport: number; service: number; onOpen: (tile: Tile, world: THREE.Vector3) => void; paused: boolean; shared: React.MutableRefObject<Shared> }) {
  const { layout, clip, reduced } = useSection(), mobile = layout.width < 760
  const edge = useEdge()
  const sources = useMemo(() => [...new Set(services.flatMap(s => s.images))], [])
  const textures = useTexture(sources)
  const width = mobile ? 110 : 230, gap = mobile ? 14 : 26
  // Masonry per service: images dealt round-robin into columns, repeated until
  // each column is taller than the screen so it can loop seamlessly.
  const layers = useMemo(() => services.map((s, i): Layer => {
    const list = s.images.map(src => textures[sources.indexOf(src)])
    const columns = Array.from({ length: COLUMNS }, (_, c): Column => {
      const tiles: Tile[] = []
      let y = 0, k = c
      while (y < viewport * 1.6 || tiles.length < 3) {
        const tex = list[k % list.length], image = tex.image as HTMLImageElement
        const h = width * image.height / image.width
        tiles.push({ tex, y, w: width, h, color: 0, delay: 0, material: new THREE.ShaderMaterial({ vertexShader: printVertex, fragmentShader: tileFragment, transparent: true, depthWrite: false, clipping: true, clippingPlanes: clip, uniforms: { ...edge, uMap: { value: tex }, uColor: { value: 0 }, uBurn: { value: 0 } } }) })
        y += h + gap; k += COLUMNS - 1
      }
      // Flip order: left to right, top to bottom within a column.
      tiles.forEach(t => { t.delay = c / COLUMNS * .5 })
      return { tiles, loop: y, offset: (c * 137) % y, speed: (22 + c * 3) * (c % 2 ? 1 : -1), held: 0 }
    })
    return { columns, show: { value: i === 0 ? 1 : 0 } }
  }), [textures, sources, viewport, width, gap, clip, edge])
  useEffect(() => () => layers.forEach(l => l.columns.forEach(c => c.tiles.forEach(t => t.material.dispose()))), [layers])
  useEffect(() => {
    layers.forEach((l, i) => gsap.to(l.show, { value: i === service ? 1 : 0, duration: reduced ? 0 : i === service ? 1.3 : .9, delay: i === service && !reduced ? .35 : 0, ease: 'power2.inOut', overwrite: true }))
  }, [service, layers, reduced])

  const groups = useRef<(THREE.Group | null)[]>([]), columns = useRef<(THREE.Group | null)[][]>(services.map(() => []))
  // Hover is resolved every frame against the live tiles, not with pointer
  // events, so a tile drifting under a still mouse is caught too.
  const meshes = useRef(new Map<THREE.Mesh, Tile>())
  const hovered = useRef<Tile | null>(null), inside = useRef(false)
  useEffect(() => {
    const on = () => { inside.current = true }, off = () => { inside.current = false }
    window.addEventListener('pointermove', on); document.documentElement.addEventListener('pointerleave', off)
    return () => { window.removeEventListener('pointermove', on); document.documentElement.removeEventListener('pointerleave', off) }
  }, [])
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const hitMesh = useRef<THREE.Mesh | null>(null)
  useEffect(() => {
    const click = () => { const m = hitMesh.current, t = hovered.current; if (m && t) onOpen(t, m.getWorldPosition(new THREE.Vector3())) }
    window.addEventListener('click', click)
    return () => window.removeEventListener('click', click)
  }, [onOpen])
  useFrame(({ pointer, camera }, dt) => {
    let hit: Tile | null = null
    ray.setFromCamera(pointer, camera)
    const blocked = ray.intersectObjects(shared.current.blockers, true).length > 0
    if (inside.current && !paused && !blocked) {
      const live = [...meshes.current.keys()].filter(m => m.visible && m.parent?.parent?.parent?.visible && layers[service].columns.some(c => c.tiles.includes(meshes.current.get(m)!)))
      const first = ray.intersectObjects(live, false).find(h => clip.every(pl => pl.distanceToPoint(h.point) >= 0))
      hit = first ? meshes.current.get(first.object as THREE.Mesh)! : null
      hitMesh.current = first ? first.object as THREE.Mesh : null
    } else hitMesh.current = null
    if (hit !== hovered.current) document.body.style.cursor = hit ? 'zoom-in' : (document.body.style.cursor === 'zoom-in' ? '' : document.body.style.cursor)
    hovered.current = hit
    layers.forEach((layer, i) => {
      const group = groups.current[i]
      if (group) group.visible = layer.show.value > .001
      if (layer.show.value <= .001) return
      layer.columns.forEach((col, c) => {
        // A hovered column stops quickly and picks up again on leave.
        col.held = THREE.MathUtils.damp(col.held, hit && col.tiles.includes(hit) ? 1 : 0, 14, dt)
        if (!reduced) col.offset = (((col.offset + col.speed * dt * (1 - col.held)) % col.loop) + col.loop) % col.loop
        const node = columns.current[i][c]
        if (node) node.position.y = col.offset
        col.tiles.forEach(t => {
          t.color = THREE.MathUtils.damp(t.color, hovered.current === t ? 1 : 0, 12, dt)
          t.material.uniforms.uColor.value = t.color
        })
      })
    })
  })
  const span = COLUMNS * (width + gap)
  return <group position={[layout.width / 2, -viewport / 2, -150]} rotation={[0, 0, -.12]}>
    {layers.map((layer, i) => <group key={i} ref={g => { groups.current[i] = g }}>
      {layer.columns.map((col, c) => <group key={c} position={[-span / 2 + c * (width + gap) + width / 2, 0, 0]}>
        <group ref={g => { columns.current[i][c] = g }}>
          {[0, 1, 2].map(copy => col.tiles.map((t, r) => <BurnTile key={`${copy}-${r}`} tile={t} layer={layer} width={width} y={t.y + (copy - 1) * col.loop - col.loop / 2} registry={meshes.current} />))}
        </group>
      </group>)}
    </group>)}
  </group>
}

function BurnTile({ tile, layer, width, y, registry }: { tile: Tile; layer: Layer; width: number; y: number; registry: Map<THREE.Mesh, Tile> }) {
  const mesh = useRef<THREE.Mesh>(null)
  useEffect(() => { const m = mesh.current; if (!m) return; registry.set(m, tile); return () => { registry.delete(m) } }, [registry, tile])
  useFrame(() => {
    const m = mesh.current
    if (!m) return
    // Each tile turns on its own slice of the layer's show tween.
    const p = THREE.MathUtils.clamp(layer.show.value * 1.7 - tile.delay, 0, 1)
    m.visible = p > .002
    tile.material.uniforms.uBurn.value = THREE.MathUtils.smoothstep(p, 0, 1)
    // Lifted in front of the gallery shade (z -100 vs the backdrop's -150) as it colours.
    m.position.z = tile.color * 80
    m.scale.setScalar(1 + tile.color * .05)
  })
  return <mesh ref={mesh} position={[0, -(y + tile.h / 2), 0]} material={tile.material} raycast={THREE.Mesh.prototype.raycast}>
    <planeGeometry args={[width, tile.h]} />
  </mesh>
}

// Gallery light over the backdrop: a warm pool of light behind the bust and
// a soft diagonal beam from the top left, fading to a dark brown vignette at
// the edges, so the stage reads like an old, dim exhibition room.
function Gallery({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const { layout, clip } = useSection()
  const edge = useEdge()
  const uniforms = useMemo(() => ({ ...edge, uCenter: { value: new THREE.Vector2(x / layout.width, 1 - y / h) }, uAspect: { value: layout.width / h } }), [edge, x, y, layout.width, h])
  return <mesh position={[layout.width / 2, -h / 2, -100]} raycast={() => {}}><planeGeometry args={[w, h]} />
    <shaderMaterial uniforms={uniforms} transparent depthWrite={false} clipping clippingPlanes={clip} vertexShader={printVertex} fragmentShader={`varying vec2 vUv;uniform vec2 uCenter;uniform float uAspect;${EDGE}
#include <clipping_planes_pars_fragment>
void main(){
  #include <clipping_planes_fragment>
  vec2 p=(vUv-uCenter)*vec2(uAspect,1.);
  float pool=exp(-dot(p,p)*2.2);
  // Beam from the top left toward the bust.
  vec2 from=vec2(.08,1.05),dir=normalize(uCenter-from),o=vUv-from;
  float along=dot(o,dir),across=abs(o.x*dir.y-o.y*dir.x);
  float beam=smoothstep(.16+along*.12,0.,across)*smoothstep(0.,.3,along)*.5;
  float shade=clamp(.78-pool*.9-beam*.6,0.,.78);
  gl_FragColor=vec4(mix(vec3(.11,.08,.05),vec3(1.,.86,.62),beam*.5),(shade+beam*.18)*edgeFade());
}`} />
  </mesh>
}

// Flickering film grain and the odd scratch over the whole stage.
function Grain({ w, h }: { w: number; h: number }) {
  const { layout, clip, reduced } = useSection()
  const material = useRef<THREE.ShaderMaterial>(null)
  const edge = useEdge()
  const uniforms = useMemo(() => ({ ...edge, uTime: { value: 0 } }), [edge])
  useFrame(({ clock }) => { if (material.current) material.current.uniforms.uTime.value = reduced ? 0 : Math.floor(clock.elapsedTime * 18) })
  return <mesh position={[layout.width / 2, -h / 2, 880]} raycast={() => {}}><planeGeometry args={[w, h]} />
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthTest={false} depthWrite={false} clipping clippingPlanes={clip} vertexShader={printVertex} fragmentShader={`varying vec2 vUv;uniform float uTime;${EDGE}
#include <clipping_planes_pars_fragment>
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  #include <clipping_planes_fragment>
  float g=hash(floor(vUv*vec2(900.,520.))+uTime);
  float scratch=step(.997,hash(vec2(floor(vUv.x*400.),uTime)))*.5;
  gl_FragColor=vec4(vec3(g>.5?1.:.15),(.06+scratch*.15)*edgeFade());
}`} />
  </mesh>
}

// Lightbox: the clicked print lifts off the wall and floats in an arc to the
// right of the stage like a loose cloth, billowing in soft folds that settle
// flat as it lands, shown as-is in full colour. The bust steps aside so the two
// never overlap. Click anywhere or press Esc to send it back.
function Lightbox({ focus, viewport, shared, onClosed }: { focus: Focus; viewport: number; shared: React.MutableRefObject<Shared>; onClosed: () => void }) {
  const { layout, clip, reduced } = useSection()
  const cloth = useMemo(() => ({ uFly: { value: 0 }, uTime: { value: 0 } }), [])
  const sheet = useRef<THREE.Mesh>(null), dim = useRef<THREE.MeshBasicMaterial>(null), hint = useRef<THREE.MeshBasicMaterial>(null)
  const state = useRef({ fly: 0, closing: false })
  const target = useMemo(() => {
    const maxW = layout.width * .5, maxH = viewport * .74
    const w = Math.min(maxW, maxH * focus.aspect)
    return { w, h: w / focus.aspect, x: layout.width * .64, y: -viewport / 2 }
  }, [focus.aspect, layout.width, viewport])
  const close = () => {
    const s = state.current
    if (s.closing) return
    s.closing = true
    gsap.to(s, { fly: 0, duration: reduced ? 0 : .9, ease: 'power3.inOut', onComplete: () => { smoothScroll?.start(); onClosed() } })
  }
  useEffect(() => {
    smoothScroll?.stop()
    const s = state.current
    gsap.to(s, { fly: 1, duration: reduced ? 0 : 1.1, ease: 'power3.inOut' })
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); gsap.killTweensOf(s); smoothScroll?.start(); shared.current.aside = 0 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useFrame(({ clock }) => {
    const t = state.current.fly, m = sheet.current, arc = Math.sin(Math.PI * t)
    shared.current.aside = THREE.MathUtils.smootherstep(t, 0, 1)
    cloth.uFly.value = t; cloth.uTime.value = reduced ? 0 : clock.elapsedTime
    if (!m) return
    m.position.set(THREE.MathUtils.lerp(focus.x, target.x, t) + arc * 40, THREE.MathUtils.lerp(focus.y, target.y, t) + arc * 90, 950)
    m.scale.set(THREE.MathUtils.lerp(focus.w, target.w, t), THREE.MathUtils.lerp(focus.h, target.h, t), 1)
    m.rotation.z = THREE.MathUtils.lerp(-.12, 0, t) + arc * .08
    // Tilted mid-flight so the cloth's depth folds read through the flat camera.
    m.rotation.x = arc * .55; m.rotation.y = -arc * .35
    if (dim.current) dim.current.opacity = t * .78
    if (hint.current) hint.current.opacity = THREE.MathUtils.smoothstep(t, .7, 1) * .8
  })
  return <group>
    <mesh position={[layout.width / 2, -viewport / 2, 940]} renderOrder={1000} onClick={e => { e.stopPropagation(); close() }} onPointerOver={() => document.body.style.cursor = 'zoom-out'} onPointerOut={() => document.body.style.cursor = ''}>
      <planeGeometry args={[layout.width, viewport]} /><meshBasicMaterial ref={dim} color="#0d0905" transparent opacity={0} depthTest={false} depthWrite={false} clippingPlanes={clip} />
    </mesh>
    <mesh ref={sheet} renderOrder={1001} onClick={e => { e.stopPropagation(); close() }}>
      <planeGeometry args={[1, 1, 40, 40]} />
      <meshBasicMaterial map={focus.tex} side={THREE.DoubleSide} transparent depthTest={false} depthWrite={false} clippingPlanes={clip} onBeforeCompile={shader => {
        // Cloth: travelling waves push the sheet in and out of its plane, the
        // free corner lifts more than the rest, and folds shade slightly.
        Object.assign(shader.uniforms, cloth)
        shader.vertexShader = 'uniform float uFly,uTime;varying float vFold;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
float f=sin(3.14159*uFly),lift=.35+.65*smoothstep(-.5,.5,position.x+position.y*.5);
float wave=sin(position.x*7.+uTime*3.2)*.07+sin(position.y*5.5-uTime*2.4+position.x*2.)*.05;
transformed.z+=wave*f*lift;transformed.y+=sin(position.x*4.+uTime*2.)*.03*f;
vFold=cos(position.x*7.+uTime*3.2)*f*lift;`)
        shader.fragmentShader = 'varying float vFold;\n' + shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb*=1.+vFold*.16;')
      }} />
    </mesh>
    <Text font="/fonts/body.ttf" position={[layout.width / 2, -viewport + 50, 960]} fontSize={11} letterSpacing={.18} anchorX="center" anchorY="middle" renderOrder={1002} raycast={() => {}}>CLICK ANYWHERE OR PRESS ESC TO CLOSE<meshBasicMaterial ref={hint} color={CREAM} transparent opacity={0} depthTest={false} clippingPlanes={clip} /></Text>
  </group>
}
