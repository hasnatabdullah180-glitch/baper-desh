import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOX, CYL, PLANE, mat, labelTex } from './gfx.jsx'
import { CarBody, RickshawBody, Person } from './Traffic.jsx'
import { G, HIDEOUT } from './sim'
import { PADS } from './world'

const OPEN = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true)
const glow = (c, o = 0.3) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })

function Pad({ p }) {
  const g = useRef(), ring = useRef()
  useFrame((s) => {
    g.current.visible = !G.mission
    ring.current.rotation.y = s.clock.elapsedTime
    g.current.position.y = 0.16 + Math.sin(s.clock.elapsedTime * 2) * 0.02
  })
  return (
    <group ref={g} position={[p.x, 0.16, p.z]}>
      <mesh geometry={CYL} material={glow(p.color, 0.5)} scale={[2.6, 0.05, 2.6]} />
      <mesh ref={ring} geometry={BOX} material={mat(p.color, { emissive: p.color, emissiveIntensity: 0.8 })} position={[0, 0.2, 0]} scale={[3.4, 0.08, 0.12]} />
      <mesh geometry={OPEN} material={glow(p.color, 0.18)} position={[0, 5, 0]} scale={[2, 10, 2]} />
      <sprite position={[0, 4.4, 0]} scale={[7, 1.75, 1]}>
        <spriteMaterial map={labelTex(p.label, p.color)} toneMapped={false} />
      </sprite>
    </group>
  )
}

const BC = { boss: ['#f42a41', 5], race: ['#ffb703', 9], chase: ['#06d6a0', 5] }
const ringMats = {}, beamMats = {}
const gm = (cache, c, o) => (cache[c + o] ||= glow(c, o))

function Beacon({ next }) {
  const g = useRef(), ring = useRef(), beam = useRef()
  useFrame((s) => {
    const m = G.mission
    const pt = m && G.cps[G.cpi + (next ? 1 : 0)]
    g.current.visible = !!pt && (!next || m.id !== 'chase')
    if (!pt) return
    const [c, r] = BC[m.id]
    g.current.position.set(pt[0], 0.2, pt[1])
    const rr = next ? r * 0.6 : r * (1 + Math.sin(s.clock.elapsedTime * 4) * 0.05)
    ring.current.scale.set(rr, 0.05, rr); beam.current.scale.set(rr * 0.9, next ? 14 : 30, rr * 0.9); beam.current.position.y = next ? 7 : 15
    ring.current.material = gm(ringMats, c, next ? 0.2 : 0.4); beam.current.material = gm(beamMats, c, next ? 0.08 : 0.2)
  })
  return (
    <group ref={g} visible={false}>
      <mesh ref={ring} geometry={CYL} />
      <mesh ref={beam} geometry={OPEN} />
    </group>
  )
}

function HideLabel() {
  const g = useRef()
  useFrame(() => { g.current.visible = G.mission?.id === 'chase' })
  return (
    <sprite ref={g} position={[HIDEOUT[0], 8, HIDEOUT[1]]} scale={[9, 2.25, 1]} visible={false}>
      <spriteMaterial map={labelTex('গোপন আড্ডা', '#06d6a0')} toneMapped={false} />
    </sprite>
  )
}

const redM = new THREE.MeshStandardMaterial({ color: '#ff2020', emissive: '#ff0000', emissiveIntensity: 1 })
const blueM = new THREE.MeshStandardMaterial({ color: '#2060ff', emissive: '#0040ff', emissiveIntensity: 1 })
function CopExtra() {
  return (
    <>
      <mesh geometry={BOX} material={redM} position={[0.4, 1.76, -0.25]} scale={[0.55, 0.14, 0.3]} />
      <mesh geometry={BOX} material={blueM} position={[-0.4, 1.76, -0.25]} scale={[0.55, 0.14, 0.3]} />
      <mesh geometry={BOX} material={mat('#1d4ed8')} position={[0, 0.85, 0]} scale={[1.93, 0.16, 4.23]} />
      {[1, -1].map((sg) => (
        <mesh key={sg} geometry={PLANE} position={[sg * 0.96, 0.7, 0]} rotation={[0, sg * Math.PI / 2, 0]} scale={[1.8, 0.45, 1]}>
          <meshBasicMaterial map={labelTex('পুলিশ', '#3a86ff')} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

function Cops() {
  const refs = useRef([])
  useFrame((s) => {
    const f = Math.sin(s.clock.elapsedTime * 14) > 0
    redM.emissiveIntensity = f ? 2.2 : 0.1; blueM.emissiveIntensity = f ? 0.1 : 2.2
    refs.current.forEach((o, i) => {
      const c = G.cops[i]
      o.visible = !!c
      if (c) { o.position.set(c.x, 0.12, c.z); o.rotation.y = c.ry }
    })
  })
  return [0, 1, 2].map((i) => (
    <group key={i} ref={(e) => (refs.current[i] = e)} visible={false} scale={1.1}>
      <CarBody color="#f5f5f5" cop={<CopExtra />} />
    </group>
  ))
}

function Rivals() {
  const refs = useRef([])
  useFrame(() => {
    refs.current.forEach((o, i) => {
      const r = G.rivals[i]
      o.visible = !!r
      if (r) { o.position.set(r.x, 0.12, r.z); o.rotation.y = r.ry }
    })
  })
  const cols = ['#8338ec', '#06d6a0']
  return [0, 1].map((i) => (
    <group key={i} ref={(e) => (refs.current[i] = e)} visible={false}>
      <RickshawBody color={cols[i]} />
      <group position={[0, 0.5, 0.55]}><Person c={cols[i]} /></group>
    </group>
  ))
}

export default function Missions() {
  return (
    <>
      {PADS.map((p) => <Pad key={p.id} p={p} />)}
      <Beacon /><Beacon next /><HideLabel /><Cops /><Rivals />
    </>
  )
}
