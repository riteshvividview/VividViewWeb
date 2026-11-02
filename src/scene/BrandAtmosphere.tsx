import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sectionBg, type SectionLayout } from './layout'

const COUNT = 6
const vertex = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
// Shared by both planes. The page has a single ground colour per chapter. Each
// chapter boundary has its own transition pattern (WIPES, by boundary index):
// 0 noise burn, 1 rising blinds, 2 pixel blocks, 3 iris from the centre,
// 4 soft rising mist (wide, feathered fog edge), -1 none (the hero leaves by
// parallax instead, see Section).
// The pattern floods the ground with the next colour, scrubbed by scroll, and
// dissolves the outgoing chapter's content in the same shape.
const WIPES = [0, -1, 0, 2, 3, 1]
const common = `
  varying vec2 vUv;uniform float uTime,uAspect;uniform vec3 uColors[${COUNT}];
  uniform float uTops[${COUNT}],uBottoms[${COUNT}];
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
  // Threshold field for a pattern: covered where field < cut. y runs 0 -> 1
  // away from the edge the wipe starts at.
  float field(int type,float y){
    vec2 q=vec2(vUv.x*uAspect,vUv.y);
    if(type<0)return 9.;
    if(type==1)return fract(y*8.)*.45+y*.55;
    if(type==4)return y*.75+fbm(q*1.6+uTime*.04)*.25;
    if(type==2){vec2 c=floor(q*vec2(16.));return hash(c)*.55+y*.45;}
    if(type==3)return length((vUv-.5)*vec2(uAspect,1.))*.9+fbm(q*3.)*.15;
    return y*.55+fbm(q*3.+uTime*.06)*.45;
  }
  float cover(int type,float y,float p){float v=field(type,y),cut=p*1.3;return 1.-smoothstep(cut-(type==2?.005:type==4?.3:.04),cut,v);}
  int wipe(int i){${WIPES.map((w,i)=>`if(i==${i})return ${w < 0 ? `-1` : w};`).join('')}return 0;}
  vec3 ground(){
    vec3 c=uColors[0];
    for(int i=1;i<${COUNT};i++){
      if(uColors[i]==uColors[i-1])continue;
      c=mix(c,uColors[i],cover(wipe(i),vUv.y,smoothstep(1.05,.2,uTops[i])));
    }
    return c;
  }
`

const backFragment = `${common}
  void main(){gl_FragColor=vec4(ground(),1.);
    #include <colorspace_fragment>
  }`

// In front of the scene: as the next chapter rises, the outgoing chapter's
// content dissolves into the ground in that boundary's pattern.
const frontFragment = `${common}
  void main(){
    float s=1.-vUv.y,a=0.;
    float n=fbm(vec2(vUv.x*uAspect,s)*4.5);
    for(int i=1;i<${COUNT};i++){
      float b=uTops[i],e=uBottoms[i-1],t=smoothstep(.85,.15,b);
      if(t>0.&&s<e)a=max(a,cover(wipe(i),clamp(e-s,0.,1.),t*1.1));
    }
    gl_FragColor=vec4(ground(),a);
    #include <colorspace_fragment>
  }`

export function BrandAtmosphere({ scroll, reduced, sections }: { scroll: React.MutableRefObject<number>; reduced: boolean; sections: SectionLayout[] }) {
  const { size } = useThree()
  const back = useRef<THREE.Mesh>(null), front = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uTime:{value:0}, uAspect:{value:1},
    uColors:{value:Array.from({length:COUNT},()=>new THREE.Color(sectionBg('home')))},
    uTops:{value:new Array(COUNT).fill(2)}, uBottoms:{value:new Array(COUNT).fill(2)} }), [])
  useEffect(() => { sections.forEach((s,i)=>uniforms.uColors.value[i]?.set(sectionBg(s.id))) }, [sections, uniforms])
  useFrame(({clock})=>{
    const y=-scroll.current-size.height/2
    back.current?.position.setY(y); front.current?.position.setY(y)
    sections.forEach((s,i)=>{ uniforms.uTops.value[i]=(s.top-scroll.current)/size.height; uniforms.uBottoms.value[i]=(s.top+s.height-scroll.current)/size.height })
    uniforms.uAspect.value=size.width/size.height
    uniforms.uTime.value=reduced?0:clock.elapsedTime
  })
  return <>
    <mesh ref={back} position={[0,0,-190]} raycast={()=>{}}><planeGeometry args={[size.width,size.height]}/><shaderMaterial uniforms={uniforms} depthWrite={false} vertexShader={vertex} fragmentShader={backFragment}/></mesh>
    {!reduced && <mesh ref={front} position={[0,0,1500]} renderOrder={999} raycast={()=>{}}><planeGeometry args={[size.width,size.height]}/><shaderMaterial uniforms={uniforms} transparent depthTest={false} depthWrite={false} vertexShader={vertex} fragmentShader={frontFragment}/></mesh>}
  </>
}
