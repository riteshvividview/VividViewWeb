import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera, RenderTexture, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Label, Panel, Stroke, Unclipped, go, useSection } from './primitives'
import { INK } from './layout'
import { gsap } from './motion'
import { services, SERVICE_LEAD, SERVICE_STEP, type Service } from './servicesData'

// Pinned services stage. While pinned, scroll flips the centre card from one
// service to the next, and photo cards for the active service fly out of the
// depth behind it toward the viewer, then fade as they pass the screen.
const SERVICES_URL = 'https://thevividview.in/our-services'
const FLYERS = 44
const FLY_SPEED = .16 // depth passes per second (~6s from far to off-screen)
const FLIP_SECONDS = .9
// Brand colours for the flip card, cycled per service, each with a title colour
// that reads on it: dark on the light ones, cream on the dark ones.
const CARD_COLORS = [{ bg: '#C9E165', text: '#1d2a10' }, { bg: '#FFDE59', text: '#2a2410' }, { bg: '#002408', text: '#f5f4f0' }, { bg: '#B8293D', text: '#fbf3f1' }]
const cardColor = (index: number) => CARD_COLORS[index % CARD_COLORS.length]

// Each flip turns around a different in-plane axis: right, up, left, down.
// Diagonal axes are left out: they would swap the card into portrait.
// Scrolling back reverses the direction.
const AXES = [[0, 1], [1, 0], [0, -1], [-1, 0]]
type FlipState = { active: number; flip: number; axis: THREE.Vector2 }

export function ServicesSection() {
  const { layout, scroll, reduced } = useSection(), mobile = layout.width < 760
  const viewport = useThree(state => state.size.height) / layout.scale
  const maxTravel = Math.max(0, layout.designHeight - viewport)
  const center = { x: layout.width / 2, y: viewport / 2 + (mobile ? 40 : 30) }
  const card = mobile ? { w: 260, h: 150 } : { w: 340, h: 200 }
  const pin = useRef<THREE.Group>(null)
  const state = useRef<FlipState>({ active: 0, flip: 0, axis: new THREE.Vector2(0, 1) })
  const [faces, setFaces] = useState<[number, number]>([0, 0])
  const [active, setActive] = useState(0)
  // Scroll only picks the target service; each flip is a timed tween. While a
  // flip plays, further scrolling queues the next one.
  const turn = useRef({ shown: 0, busy: false, pending: false })
  useEffect(() => () => { gsap.killTweensOf(state.current) }, [])
  useEffect(() => {
    // The new front face has rendered; reset the turn without a flash.
    if (!turn.current.pending) return
    turn.current.pending = false; turn.current.busy = false; state.current.flip = 0
  }, [faces])

  useFrame(() => {
    const travel = THREE.MathUtils.clamp((scroll.current - layout.top) / layout.scale, 0, maxTravel)
    if (pin.current) pin.current.position.y = -travel
    const target = Math.round(THREE.MathUtils.clamp((travel - SERVICE_LEAD) / SERVICE_STEP, 0, services.length - 1))
    const t = turn.current
    if (!t.busy && target !== t.shown) {
      const from = t.shown, axis = AXES[target % AXES.length], sign = target > from ? 1 : -1
      t.busy = true
      state.current.axis.set(axis[0] * sign, axis[1] * sign)
      setFaces([from, target])
      gsap.to(state.current, { flip: 1, duration: reduced ? 0 : FLIP_SECONDS, ease: 'power3.inOut', onComplete: () => { t.shown = target; t.pending = true; setFaces([target, target]) } })
    }
    const now = state.current.flip > .5 ? faces[1] : faces[0]
    if (now !== state.current.active) { state.current.active = now; setActive(now) }
  }, -1)

  return <group ref={pin}>
    <StageArt center={center} card={card} state={state} />
    <FlyingCards center={center} viewport={viewport} state={state} />
    <Label x={mobile ? 22 : 100} y={mobile ? 30 : center.y - 300} size={mobile ? 11 : 13} animated={false}>●   OUR SERVICES</Label>
    <Label x={mobile ? 22 : 100} y={mobile ? 58 : center.y - 262} font="serif" size={mobile ? 34 : 57} lineHeight={.98} animated={false}>What we</Label>
    <Label x={mobile ? 22 : 100} y={mobile ? 94 : center.y - 205} font="italic" size={mobile ? 34 : 57} animated={false}>do best.</Label>
    {!mobile && <>
      <Label x={100} y={center.y - 110} width={260} size={15} color="#64645c" animated={false}>Keep scrolling to flip through everything we make, build and grow.</Label>
      <Stroke points={[[1335, center.y - 190], [1335, center.y + 70]]} />
      {services.map((s, i) => <Label key={s.tag} x={1365} y={center.y - 188 + i * 36} size={13} tracking={.04} color={i === active ? INK : '#8b8b82'} animated={false}>{`${i === active ? '●  ' : ''}${s.tag}`}</Label>)}
      <Label x={1365} y={center.y + 140} size={44} font="serif" animated={false}>{String(active + 1).padStart(2, '0')}</Label>
      <Label x={1425} y={center.y + 162} size={13} color="#8b8b82" animated={false}>{`/  ${String(services.length).padStart(2, '0')}`}</Label>
    </>}
    <FlipCard x={center.x} y={center.y} card={card} mobile={mobile} faces={faces} state={state} />
  </group>
}

function Face({ service, tint, text, card, mobile }: { service: Service; tint: string; text: string; card: { w: number; h: number }; mobile: boolean }) {
  return <>
    <Panel x={0} y={0} w={card.w} h={card.h} color={tint} />
    <Label x={0} y={0} anchor="middle" align="center" width={card.w - 40} size={mobile ? 28 : 34} font="serif" color={text} lineHeight={.95} z={2} animated={false}>{service.title}</Label>
  </>
}

// The card's two faces are rendered into textures and shown on one plane. The
// scene camera is orthographic, so the vertex shader applies perspective itself:
// rotate around the flip axis (Rodrigues), add a hover tilt, divide by depth.
const flipVertex = `uniform float uAngle; uniform vec2 uAxis; uniform vec2 uTilt; uniform float uDistance; uniform float uLift;
varying vec2 vUv;
vec3 spin(vec3 p, vec3 u, float a){ float c = cos(a), s = sin(a); return p * c + cross(u, p) * s + u * dot(u, p) * (1. - c); }
void main(){
  vUv = uv;
  vec3 q = spin(position, vec3(uAxis, 0.), uAngle);
  q = spin(q, vec3(0., 1., 0.), uTilt.x);
  q = spin(q, vec3(1., 0., 0.), uTilt.y);
  float persp = uDistance / (uDistance - q.z - uLift);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(q.xy * persp, q.z * .01, 1.);
}`
// Hover: a magnifier lens follows the pointer and sharpens what is under it.
// Flips flash a holographic foil and light an iridescent rim.
const flipFragment = `uniform sampler2D uFront; uniform sampler2D uBack; uniform float uAngle; uniform vec2 uAxis; uniform float uHover; uniform vec2 uPointer; uniform float uTime; uniform vec2 uSize; uniform float uRadius; uniform vec3 uFrontBg; uniform vec3 uBackBg;
varying vec2 vUv;
vec3 face(vec2 uv){
  if (cos(uAngle) > 0.) return texture2D(uFront, uv).rgb;
  // The back is seen mirrored across the flip axis.
  vec2 v = (uv - .5) * uSize, a = normalize(uAxis);
  v = 2. * dot(v, a) * a - v;
  return texture2D(uBack, v / uSize + .5).rgb;
}
vec3 holo(float h){ return .5 + .5 * cos(6.2831 * (h + vec3(0., .33, .67))); }
void main(){
  vec2 uv = vUv, px = uv * uSize;
  vec2 d = abs(uv - .5) * uSize - (uSize * .5 - uRadius);
  float edge = length(max(d, 0.)) + min(max(d.x, d.y), 0.) - uRadius;
  if (edge > 0.) discard;
  float turning = sin(uAngle);
  // Magnifier lens: inside it the face is enlarged around the pointer and given
  // a touch more contrast; a fine ring in the title colour marks its edge.
  // The face is rendered at 2x, so the enlarged title stays crisp.
  vec3 bg = cos(uAngle) > 0. ? uFrontBg : uBackBg;
  vec2 pointer = uPointer * uSize;
  float radius = uSize.y * .3 * uHover, dist = length(px - pointer);
  float inside = 1. - smoothstep(radius - 1., radius, dist);
  vec2 zoomed = (pointer + (px - pointer) / (1. + .35 * uHover)) / uSize;
  vec3 col = face(mix(uv, zoomed, inside));
  col = mix(col, clamp((col - bg) * 1.15 + bg, 0., 1.), inside);
  float ring = smoothstep(1.6, 0., abs(dist - radius)) * step(.02, uHover);
  vec3 ink = dot(bg, vec3(.299, .587, .114)) > .3 ? vec3(.06) : vec3(.95);
  col = mix(col, mix(bg, ink, .55), ring * .7);
  // Soft shadow just outside the ring so the lens sits above the card.
  col *= 1. - .1 * smoothstep(radius + 10., radius, dist) * (1. - inside) * uHover;
  // Holographic foil only while the card turns.
  float hue = dot(uv - .5, vec2(.9, .5)) * 1.3 + uTime * .05 + uAngle * .3;
  float bands = .55 + .45 * sin(uv.x * 13. + uv.y * 8. - uTime * .8);
  col = mix(col, col * .55 + holo(hue) * .5, .4 * turning * bands);
  // Iridescent rim during flips; a faint one on hover.
  float rim = smoothstep(-7., -1., edge);
  col += holo(hue + .3) * rim * (.12 * uHover + .5 * turning);
  col = mix(col, vec3(.54, .54, .51), smoothstep(-1.8, -.8, edge) * .6);
  col *= .7 + .3 * abs(cos(uAngle));
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`

function FlipCard({ x, y, card, mobile, faces, state }: { x: number; y: number; card: { w: number; h: number }; mobile: boolean; faces: [number, number]; state: React.MutableRefObject<FlipState> }) {
  const { reduced } = useSection()
  const material = useRef<THREE.ShaderMaterial>(null)
  const hover = useRef({ on: 0, pointer: new THREE.Vector2(.5, .5) })
  const uniforms = useMemo(() => ({
    uFront: { value: null }, uBack: { value: null }, uAngle: { value: 0 }, uAxis: { value: new THREE.Vector2(0, 1) }, uTilt: { value: new THREE.Vector2() },
    uDistance: { value: card.w * 2.4 }, uLift: { value: 0 }, uHover: { value: 0 }, uPointer: { value: new THREE.Vector2(.5, .5) },
    uTime: { value: 0 }, uSize: { value: new THREE.Vector2(card.w, card.h) }, uRadius: { value: 14 }, uFrontBg: { value: new THREE.Color() }, uBackBg: { value: new THREE.Color() },
  }), [card.w, card.h])
  useFrame(({ clock }, dt) => {
    const u = material.current?.uniforms ?? uniforms, h = hover.current, flip = state.current.flip
    u.uAngle.value = flip * Math.PI
    u.uAxis.value.copy(state.current.axis)
    u.uFrontBg.value.set(cardColor(faces[0]).bg); u.uBackBg.value.set(cardColor(faces[1]).bg)
    u.uHover.value = THREE.MathUtils.damp(u.uHover.value, reduced ? 0 : h.on, 8, dt)
    u.uPointer.value.lerp(h.pointer, 1 - Math.exp(-10 * dt))
    // Tilt toward the pointer on hover; lift toward the viewer mid-flip.
    u.uTilt.value.set((u.uPointer.value.x - .5) * .3 * u.uHover.value, (u.uPointer.value.y - .5) * -.3 * u.uHover.value)
    u.uLift.value = Math.sin(flip * Math.PI) * card.w * .4
    u.uTime.value = clock.elapsedTime
  })
  const face = (index: number) => <RenderTexture attach={index === 0 ? 'uniforms-uFront-value' : 'uniforms-uBack-value'} width={card.w * 2} height={card.h * 2} eventPriority={-1}>
    <OrthographicCamera makeDefault manual left={-card.w / 2} right={card.w / 2} top={card.h / 2} bottom={-card.h / 2} near={.1} far={1000} position={[0, 0, 500]} />
    <color attach="background" args={[cardColor(faces[index]).bg]} />
    <Unclipped><Face service={services[faces[index]]} tint={cardColor(faces[index]).bg} text={cardColor(faces[index]).text} card={card} mobile={mobile} /></Unclipped>
  </RenderTexture>
  return <mesh position={[x, -y, 120]}
    onPointerMove={e => { e.stopPropagation(); hover.current.on = 1; if (e.uv) hover.current.pointer.copy(e.uv); document.body.style.cursor = 'pointer' }}
    onPointerOut={() => { hover.current.on = 0; document.body.style.cursor = '' }}
    onClick={e => { e.stopPropagation(); go(SERVICES_URL) }}>
    <planeGeometry args={[card.w, card.h, 32, 32]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={flipVertex} fragmentShader={flipFragment} side={THREE.DoubleSide}>
      {face(0)}{face(1)}
    </shaderMaterial>
  </mesh>
}

// Line art drawn in the scene behind the flying cards (z below them), so it
// never crosses the cards or text: rings ripple out of the depth behind the
// centre card, dashed orbits carry dots around it, a compass needle turns to
// each service, and a bar under the list fills with progress.
const ART_Z = -90
const unitCircle = Array.from({ length: 121 }, (_, i) => { const a = i / 120 * Math.PI * 2; return new THREE.Vector3(Math.cos(a), Math.sin(a), 0) })
function StageArt({ center, card, state }: { center: { x: number; y: number }; card: { w: number; h: number }; state: React.MutableRefObject<FlipState> }) {
  const { clip, reduced, layout } = useSection(), mobile = layout.width < 760
  const circle = useMemo(() => new THREE.BufferGeometry().setFromPoints(unitCircle), [])
  const dashed = useMemo(() => { const g = new THREE.BufferGeometry().setFromPoints(unitCircle); return new THREE.LineSegments(g).computeLineDistances().geometry }, [])
  useEffect(() => () => { circle.dispose(); dashed.dispose() }, [circle, dashed])
  const ink = useMemo(() => new THREE.Color(INK), [])
  const rings = useRef<(THREE.LineLoop | null)[]>([]), dots = useRef<(THREE.Mesh | null)[]>([])
  const needle = useRef<THREE.Group>(null), bar = useRef<THREE.Mesh>(null)
  const orbits = [{ rx: card.w * 1.05, ry: card.h * .95, speed: .18 }, { rx: card.w * 1.3, ry: card.h * 1.25, speed: -.11 }]
  useFrame(({ clock }, dt) => {
    const t = reduced ? 0 : clock.elapsedTime
    rings.current.forEach((ring, i) => {
      if (!ring) return
      const p = (t * .09 + i / rings.current.length) % 1, r = card.w * .6 + p * card.w * .75
      ring.scale.set(r, r * .58, 1)
      ;(ring.material as THREE.LineBasicMaterial).opacity = .26 * THREE.MathUtils.smoothstep(p, 0, .15) * (1 - p) * (1 - p)
    })
    dots.current.forEach((dot, i) => {
      if (!dot) return
      const o = orbits[i % 2], a = t * o.speed + (i > 1 ? Math.PI : 0)
      dot.position.set(center.x + Math.cos(a) * o.rx, -center.y + Math.sin(a) * o.ry, ART_Z + 1)
    })
    const progress = (state.current.active + 1) / services.length
    if (needle.current) needle.current.rotation.z = THREE.MathUtils.damp(needle.current.rotation.z, -state.current.active / services.length * Math.PI * 2, 5, dt)
    if (bar.current) { bar.current.scale.x = THREE.MathUtils.damp(bar.current.scale.x, progress * 140, 6, dt); bar.current.position.x = 1365 + bar.current.scale.x / 2 }
  })
  return <>
    {Array.from({ length: 5 }, (_, i) => <lineLoop key={i} ref={l => { rings.current[i] = l }} geometry={circle} position={[center.x, -center.y, ART_Z]} raycast={() => {}}>
      <lineBasicMaterial color={ink} transparent opacity={0} clippingPlanes={clip} />
    </lineLoop>)}
    {orbits.map((o, i) => <lineSegments key={i} geometry={dashed} position={[center.x, -center.y, ART_Z]} scale={[o.rx, o.ry, 1]} raycast={() => {}}>
      <lineDashedMaterial color={ink} transparent opacity={.3} dashSize={.015} gapSize={.03} clippingPlanes={clip} />
    </lineSegments>)}
    {Array.from({ length: 4 }, (_, i) => <mesh key={i} ref={m => { dots.current[i] = m }} raycast={() => {}}>
      <circleGeometry args={[i > 1 ? 3 : 4.5, 16]} /><meshBasicMaterial color={ink} clippingPlanes={clip} />
    </mesh>)}
    {!mobile && <>
      <group position={[175, -(center.y + 150), ART_Z]}>
        <lineLoop geometry={circle} scale={[40, 40, 1]} raycast={() => {}}><lineBasicMaterial color={ink} transparent opacity={.45} clippingPlanes={clip} /></lineLoop>
        {services.map((_, i) => { const a = i / services.length * Math.PI * 2; return <Stroke key={i} points={[[Math.sin(a) * 40, -Math.cos(a) * 40], [Math.sin(a) * 33, -Math.cos(a) * 33]]} color={INK} /> })}
        <group ref={needle}><mesh raycast={() => {}}><shapeGeometry args={[new THREE.Shape([new THREE.Vector2(0, 27), new THREE.Vector2(5, 0), new THREE.Vector2(0, -27), new THREE.Vector2(-5, 0)])]} /><meshBasicMaterial color={ink} clippingPlanes={clip} /></mesh></group>
      </group>
      <Label x={175} y={center.y + 205} size={10} align="center" tracking={.12} color="#8b8b82" animated={false}>{services[state.current.active].tag}</Label>
      <Stroke points={[[1365, center.y + 95], [1505, center.y + 95]]} />
      <mesh ref={bar} position={[1365, -(center.y + 95), ART_Z + 120]} scale={[1, 2, 1]} raycast={() => {}}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={ink} clippingPlanes={clip} /></mesh>
    </>}
  </>
}

// Photo cards on a tunnel: each starts deep behind the centre card, travels
// toward the viewer (growing and spreading through perspective), then leaves
// the screen. When the service changes, every card swaps to the new service's
// images at once through a block-dissolve wipe, rippling out from the centre.
const flyVertex = `varying vec2 vUv;
#include <clipping_planes_pars_vertex>
void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mvPosition;
#include <clipping_planes_vertex>
}`
// Blocks flip from the old image to the new one in a jittered left-to-right
// sweep. The front glows and splits colour; the old image eases back while the
// new one settles in from a slight zoom.
const flyFragment = `uniform sampler2D uFrom; uniform sampler2D uTo; uniform vec4 uFromRT; uniform vec4 uToRT; uniform float uMix; uniform float uOpacity; uniform float uSeed;
varying vec2 vUv;
#include <clipping_planes_pars_fragment>
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  #include <clipping_planes_fragment>
  vec2 cell = floor(vUv * vec2(9., 11.));
  float threshold = hash(cell + uSeed) * .45 + vUv.x * .55;
  float front = uMix * 1.5 - .25;
  float show = smoothstep(threshold - .03, threshold + .03, front);
  float edge = smoothstep(.14, 0., abs(front - threshold)) * step(.001, uMix) * step(uMix, .999);
  vec2 c = vUv - .5;
  vec2 fromUv = (c * (1. - uMix * .12) + .5) * uFromRT.xy + uFromRT.zw;
  vec2 toUv = (c * (1. + (1. - uMix) * .15) + .5) * uToRT.xy + uToRT.zw;
  float split = edge * .015;
  vec3 a = texture2D(uFrom, fromUv).rgb;
  vec3 b = vec3(texture2D(uTo, toUv + vec2(split, 0.)).r, texture2D(uTo, toUv).g, texture2D(uTo, toUv - vec2(split, 0.)).b);
  vec3 col = mix(a, b, show) + edge * .35;
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}`
const SWAP_SECONDS = .9

type Entry = { tex: THREE.Texture; w: number; rt: THREE.Vector4 }
function FlyingCards({ center, viewport, state }: { center: { x: number; y: number }; viewport: number; state: React.MutableRefObject<FlipState> }) {
  const { layout, scroll, reduced, clip } = useSection(), mobile = layout.width < 760
  const sources = useMemo(() => [...new Set(services.flatMap(s => s.images))], [])
  const textures = useTexture(sources)
  const lookup = useMemo(() => {
    const map = new Map<string, Entry>()
    textures.forEach((tex, i) => {
      tex.colorSpace = THREE.SRGBColorSpace
      const image = tex.image as HTMLImageElement, aspect = image.width / image.height
      const box = THREE.MathUtils.clamp(aspect, .72, 1.45)
      // Cover-crop wide shots instead of stretching them (repeat.xy, offset.zw).
      const rt = aspect > box ? new THREE.Vector4(box / aspect, 1, (1 - box / aspect) / 2, 0) : new THREE.Vector4(1, aspect / box, 0, (1 - aspect / box) / 2)
      map.set(sources[i], { tex, w: box, rt })
    })
    return map
  }, [textures, sources])
  const materials = useMemo(() => Array.from({ length: FLYERS }, (_, i) => new THREE.ShaderMaterial({
    vertexShader: flyVertex, fragmentShader: flyFragment, transparent: true, depthWrite: false, clipping: true, clippingPlanes: clip,
    uniforms: { uFrom: { value: textures[0] }, uTo: { value: textures[0] }, uFromRT: { value: new THREE.Vector4(1, 1, 0, 0) }, uToRT: { value: new THREE.Vector4(1, 1, 0, 0) }, uMix: { value: 1 }, uOpacity: { value: 0 }, uSeed: { value: i * 7.31 } },
  })), [clip, textures])
  useEffect(() => () => materials.forEach(m => { gsap.killTweensOf(m.uniforms.uMix); m.dispose() }), [materials])
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const flyers = useMemo(() => Array.from({ length: FLYERS }, (_, i) => ({ t: i / FLYERS, px: 0, py: 0, service: -1, image: i, cycle: 0, fromW: 1, toW: 1 })), [])
  const last = useRef({ active: 0 })

  const pick = (f: typeof flyers[number], i: number, service: number) => {
    const list = services[service].images
    f.service = service; f.image = (i + f.cycle * 3) % list.length
    return lookup.get(list[f.image])!
  }
  // Fresh start for a card (restart from the depth): no transition.
  const assign = (f: typeof flyers[number], i: number, service: number) => {
    const entry = pick(f, i, service), u = materials[i].uniforms
    // R2 low-discrepancy scatter: even coverage, new spot on every restart.
    f.px = ((.5 + i * .7548777 + f.cycle * .3141) % 1) * 2 - 1
    f.py = ((.5 + i * .5698403 + f.cycle * .4713) % 1) * 2 - 1
    // Keep every card out of the dead centre so perspective carries it fully
    // off-screen (|position| / nearest depth > 1) instead of vanishing mid-view.
    const m = Math.max(Math.abs(f.px), Math.abs(f.py), 1e-3), k = (.42 + .58 * m) / m
    f.px *= k; f.py *= k
    gsap.killTweensOf(u.uMix)
    u.uFrom.value = u.uTo.value = entry.tex; u.uFromRT.value.copy(entry.rt); u.uToRT.value.copy(entry.rt); u.uMix.value = 1
    f.fromW = f.toW = entry.w
  }
  // Service changed: swap the image in place with the wipe, delayed by the
  // card's distance from the centre so the change ripples outward.
  const swap = (f: typeof flyers[number], i: number, service: number, distance: number) => {
    const entry = pick(f, i, service), u = materials[i].uniforms
    gsap.killTweensOf(u.uMix)
    u.uFrom.value = u.uTo.value; u.uFromRT.value.copy(u.uToRT.value); f.fromW = f.toW
    u.uTo.value = entry.tex; u.uToRT.value.copy(entry.rt); f.toW = entry.w
    u.uMix.value = 0
    gsap.to(u.uMix, { value: 1, duration: reduced ? 0 : SWAP_SECONDS, delay: reduced ? 0 : Math.min(distance / 900, 1) * .45, ease: 'power2.inOut' })
  }

  // Runs on its own clock, independent of scroll. True perspective: a card at
  // depth d sits at centre + position / d, so far cards gather near the middle,
  // small and hazy, and near ones rush outward until they leave the screen.
  useFrame((_, dt) => {
    if (scroll.current + window.innerHeight < layout.top - 200 || scroll.current > layout.top + layout.height + 200) return
    const { active } = state.current
    const changed = active !== last.current.active
    last.current.active = active
    flyers.forEach((f, i) => {
      const mesh = meshes.current[i]
      if (!mesh) return
      if (f.service < 0) assign(f, i, active)
      if (!reduced) f.t += Math.min(dt, .05) * FLY_SPEED
      if (f.t >= 1) { f.t -= 1; f.cycle++; assign(f, i, active) }
      const depth = THREE.MathUtils.lerp(7, .38, f.t), scale = 1 / depth
      const x = center.x + f.px * layout.width * .5 * scale
      const y = center.y + f.py * viewport * .5 * scale
      if (changed) swap(f, i, active, Math.hypot(x - center.x, y - center.y))
      const u = materials[i].uniforms, size = (mobile ? 70 : 120) * scale
      mesh.position.set(x, -y, -60 + f.t * 40)
      mesh.scale.set(size * THREE.MathUtils.lerp(f.fromW, f.toW, u.uMix.value), size, 1)
      // Haze in from the depth only; cards never fade on the way out.
      u.uOpacity.value = THREE.MathUtils.smoothstep(f.t, 0, .3)
      mesh.visible = u.uOpacity.value > .01
    })
  })

  return <>{flyers.map((_, i) => <mesh key={i} ref={m => { meshes.current[i] = m }} material={materials[i]} raycast={() => {}}>
    <planeGeometry args={[1, 1]} />
  </mesh>)}</>
}
