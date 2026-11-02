import { Component, useEffect, useMemo, useRef, type ReactNode, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export type SceneState = { chapter: number; phase: number; progress: number; pointer: { x: number; y: number }; service: number; reduced: boolean }

const vertex = `
uniform float uTime;
uniform float uMorph;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vView;
void main() {
  vec3 p = position;
  float wave = sin(p.y * 2.8 + uTime * .6) * sin(p.x * 2. + uTime * .4);
  p += normal * wave * (.06 + uMorph * .07);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vNormal = normalize(normalMatrix * normal);
  vPosition = p;
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`
const fragment = `
uniform float uTime;
uniform float uHue;
uniform float uDim;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vView;
vec3 palette(float t) { return .52 + .48 * cos(6.28318 * (vec3(.0,.33,.67) + t)); }
void main() {
  vec3 n = normalize(vNormal);
  vec3 r = reflect(-vView, n);
  float fresnel = pow(1. - abs(dot(n, vView)), 2.4);
  float band = sin(r.y * 4.5 + r.x * 2. + uTime * .10);
  float softbox = pow(max(0., dot(r, normalize(vec3(-.6, 1., 1.)))), 16.);
  float strip = pow(max(0., 1. - abs(r.x * .45 + r.y * .9 - .25)), 38.);
  float edge = pow(max(0., dot(r, normalize(vec3(1., -.2, .4)))), 22.);
  vec3 spectral = palette(r.y * .23 + r.x * .13 + uHue + .56);
  vec3 tint = mix(vec3(.26,.39,.64), spectral, .45);
  vec3 color = mix(vec3(.025,.035,.065), tint * .65, smoothstep(-.7,.65,band));
  color += softbox * vec3(.72,.9,1.) * 1.5;
  color += strip * vec3(.78,.87,1.) * .85;
  color += edge * vec3(.32,.35,1.) * .8;
  color += fresnel * mix(vec3(.22,.38,.85), tint, .6) * .62;
  gl_FragColor = vec4(color * uDim, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

function Atmosphere({ state }: { state: MutableRefObject<SceneState> }) {
  const { viewport } = useThree()
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uHue: { value: 0 }, uPointer: { value: new THREE.Vector2() }, uAspect: { value: 1 } }), [])
  useFrame(({ clock, size }, delta) => {
    uniforms.uTime.value = state.current.reduced ? 0 : clock.elapsedTime
    uniforms.uHue.value = THREE.MathUtils.damp(uniforms.uHue.value, state.current.phase * .15, 2, delta)
    uniforms.uPointer.value.x = THREE.MathUtils.damp(uniforms.uPointer.value.x, state.current.pointer.x, 2, delta)
    uniforms.uPointer.value.y = THREE.MathUtils.damp(uniforms.uPointer.value.y, state.current.pointer.y, 2, delta)
    uniforms.uAspect.value = size.width / size.height
  })
  return <mesh position={[0, 0, -9]} scale={[viewport.width * 2.4, viewport.height * 2.4, 1]}>
    <planeGeometry />
    <shaderMaterial depthWrite={false} uniforms={uniforms} vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader={`
      varying vec2 vUv; uniform float uTime; uniform float uHue; uniform float uAspect; uniform vec2 uPointer;
      void main(){
        vec2 p=vUv-.5; p.x*=uAspect;
        vec2 c=vec2(.34+sin(uTime*.06)*.08,.1)+uPointer*.035;
        float mist=exp(-length((p-c)*vec2(1.,1.4))*4.8);
        float ribbon=exp(-abs(p.y+sin(p.x*3.+uTime*.08)*.12+.17)*18.)*exp(-abs(p.x)*1.8);
        vec3 tint=.5+.5*cos(6.283*(vec3(.62,.77,.9)+uHue));
        vec3 color=vec3(.003,.004,.008)+mist*mix(vec3(.02,.025,.09),tint*.065,.45)+ribbon*tint*.009;
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`} />
  </mesh>
}

const poses = [
  { x: .25, y: .02, scale: .94, rx: .25, ry: -.4, rz: -.35, dim: 1 },
  { x: .39, y: .31, scale: .42, rx: 1.5, ry: .3, rz: .6, dim: .65 },
  { x: -.24, y: -.08, scale: .69, rx: .3, ry: 1.1, rz: -.8, dim: .8 },
  { x: .0, y: -.18, scale: .87, rx: 1.3, ry: .4, rz: .5, dim: .2 },
  { x: -.30, y: -.29, scale: .50, rx: .1, ry: -.8, rz: -.3, dim: .28 },
  { x: .30, y: .13, scale: .77, rx: .8, ry: .4, rz: -.7, dim: .5 },
]

function Sculpture({ state }: { state: MutableRefObject<SceneState> }) {
  const group = useRef<THREE.Group>(null)
  const knot = useRef<THREE.Mesh>(null)
  const satellites = useRef<THREE.Group>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uHue: { value: 0 }, uMorph: { value: 0 }, uDim: { value: 1 } }), [])
  const { viewport } = useThree()
  useFrame(({ clock }, delta) => {
    if (!group.current || !knot.current) return
    const s = state.current, t = s.reduced ? 0 : clock.elapsedTime
    const index = Math.min(4, Math.floor(s.phase)), blend = s.phase - index
    const from = poses[index], to = poses[index + 1]
    const pose = { x: 0, y: 0, scale: 0, rx: 0, ry: 0, rz: 0, dim: 0 }
    for (const key of Object.keys(pose) as (keyof typeof pose)[]) pose[key] = THREE.MathUtils.lerp(from[key], to[key], blend)
    const d = Math.min(delta, .06)
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, pose.x * viewport.width + s.pointer.x * .12, 2.5, d)
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, pose.y * viewport.height + Math.sin(t * .45) * .06, 2.5, d)
    const scale = Math.min(viewport.width / 12, viewport.height / 6.5) * pose.scale
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, scale, 2.5, d))
    knot.current.rotation.x = THREE.MathUtils.damp(knot.current.rotation.x, pose.rx + Math.sin(t * .13) * .15 + s.pointer.y * .12, 2, d)
    knot.current.rotation.y = THREE.MathUtils.damp(knot.current.rotation.y, pose.ry + t * .055 + s.pointer.x * .22, 2, d)
    knot.current.rotation.z = THREE.MathUtils.damp(knot.current.rotation.z, pose.rz + Math.sin(t * .1) * .12, 2, d)
    uniforms.uTime.value = t
    uniforms.uHue.value = THREE.MathUtils.damp(uniforms.uHue.value, s.phase * .14 + s.service * .035, 2, d)
    uniforms.uDim.value = pose.dim
    uniforms.uMorph.value = s.chapter === 2 ? 1 : 0
    if (satellites.current) satellites.current.rotation.z = t * .035
  })
  return <group ref={group} position={[3, 0, 0]}>
    <mesh ref={knot}><torusKnotGeometry args={[1.48, .43, 256, 48, 2, 3]} /><shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} /></mesh>
    <group ref={satellites}>
      {[[-2.3, .9, -.5, .17], [1.8, 1.6, -.8, .095], [1.7, -1.85, .4, .23]].map(([x,y,z,r], i) => <mesh key={i} position={[x,y,z]}>
        <sphereGeometry args={[r, 32, 24]} /><shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} />
      </mesh>)}
      <mesh rotation={[1.15, .3, -.3]}><torusGeometry args={[2.45, .006, 6, 180]} /><meshBasicMaterial color="#859dce" transparent opacity={.22} /></mesh>
      <mesh rotation={[.6, 1.1, .45]}><torusGeometry args={[2.62, .004, 6, 180]} /><meshBasicMaterial color="#a29bd6" transparent opacity={.14} /></mesh>
    </group>
  </group>
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="scene-fallback" /> : this.props.children }
}

export function VividScene({ state }: { state: MutableRefObject<SceneState> }) {
  const shell = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const canvas = shell.current?.querySelector('canvas')
    const lost = (event: Event) => { event.preventDefault(); shell.current?.classList.add('context-lost') }
    const restored = () => shell.current?.classList.remove('context-lost')
    canvas?.addEventListener('webglcontextlost', lost)
    canvas?.addEventListener('webglcontextrestored', restored)
    return () => { canvas?.removeEventListener('webglcontextlost', lost); canvas?.removeEventListener('webglcontextrestored', restored) }
  }, [])
  return <div className="vivid-scene" ref={shell} aria-hidden="true"><SceneBoundary>
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 42 }} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }} fallback={<div className="scene-fallback" />}>
      <Atmosphere state={state} /><Sculpture state={state} />
    </Canvas>
  </SceneBoundary></div>
}
