import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOX, CYL, SPH, mat, mergeParts } from './gfx.jsx'
import { G } from './sim'

// Every vehicle / person torso is merged into ONE vertex-coloured mesh (1 draw call each).
const vehMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05 })
const WHEEL = '#16181c', GLASS = '#1d2a35', HEAD = '#fff3b0', TAIL = '#ff3030'
const box = (p, s, c, r) => ({ g: BOX, p, s, c, r })
const wheel = (x, y, z, r = 0.35, w = 0.25) => ({ g: CYL, p: [x, y, z], s: [r, w, r], r: [0, 0, Math.PI / 2], c: WHEEL })

function partsFor(type, c) {
  if (type === 'car') {
    return [
      box([0, 0.65, 0], [1.9, 0.75, 4.2], c), box([0, 1.3, -0.25], [1.7, 0.45, 1.95], GLASS), box([0, 1.6, -0.25], [1.6, 0.14, 2.0], c),
      box([0.6, 0.7, 2.1], [0.4, 0.2, 0.06], HEAD), box([-0.6, 0.7, 2.1], [0.4, 0.2, 0.06], HEAD),
      box([0.6, 0.7, -2.1], [0.4, 0.2, 0.06], TAIL), box([-0.6, 0.7, -2.1], [0.4, 0.2, 0.06], TAIL),
      wheel(0.95, 0.35, 1.35), wheel(-0.95, 0.35, 1.35), wheel(0.95, 0.35, -1.35), wheel(-0.95, 0.35, -1.35),
    ]
  }
  if (type === 'cng') {
    const g = '#1b9e5a'
    return [
      box([0, 0.75, -0.1], [1.3, 0.7, 2.4], g), box([0, 0.95, -0.1], [1.34, 0.1, 2.44], '#ffd23f'),
      box([0, 1.4, -0.5], [1.25, 0.62, 1.5], '#16854b'), box([0, 1.78, -0.45], [1.38, 0.1, 1.75], '#0f6a3b'),
      box([0, 1.3, 0.3], [1.1, 0.5, 0.06], GLASS), box([0.64, 1.35, -0.5], [0.04, 0.5, 1.5], '#222'), box([-0.64, 1.35, -0.5], [0.04, 0.5, 1.5], '#222'),
      box([0, 0.8, 1.12], [0.4, 0.2, 0.06], HEAD), box([0.4, 0.8, -1.32], [0.3, 0.16, 0.06], TAIL), box([-0.4, 0.8, -1.32], [0.3, 0.16, 0.06], TAIL),
      wheel(0, 0.33, 1.0, 0.33, 0.16), wheel(0.62, 0.33, -0.85, 0.33, 0.2), wheel(-0.62, 0.33, -0.85, 0.33, 0.2),
    ]
  }
  if (type === 'bus') {
    return [
      box([0, 1.7, 0], [2.6, 2.4, 9.2], c), box([0, 2.25, 0], [2.64, 0.8, 8.3], GLASS), box([0, 1.25, 0], [2.64, 0.2, 9.22], '#ffd23f'),
      box([0, 2.35, 4.58], [2.2, 1, 0.06], GLASS), box([0.9, 0.8, 4.62], [0.4, 0.25, 0.06], HEAD), box([-0.9, 0.8, 4.62], [0.4, 0.25, 0.06], HEAD),
      wheel(1.3, 0.5, 3, 0.5, 0.3), wheel(-1.3, 0.5, 3, 0.5, 0.3), wheel(1.3, 0.5, -3, 0.5, 0.3), wheel(-1.3, 0.5, -3, 0.5, 0.3),
    ]
  }
  return [
    box([0, 0.45, 0], [0.9, 0.12, 2.3], '#2b2b2b'), box([0, 0.7, -0.55], [0.85, 0.28, 0.85], '#c1121f'),
    box([0, 1.0, -1.0], [0.95, 0.85, 0.08], c), box([0, 1.15, -1.05], [0.7, 0.12, 0.04], '#ffd23f'), box([0, 0.9, -1.05], [0.7, 0.12, 0.04], '#06d6a0'),
    box([0, 1.62, -0.55], [1.0, 0.07, 1.05], c, [0.22, 0, 0]),
    box([0.47, 1.1, -0.05], [0.05, 1.0, 0.05], '#444'), box([-0.47, 1.1, -0.05], [0.05, 1.0, 0.05], '#444'), box([0, 1.0, 0.95], [0.7, 0.05, 0.05], '#444'),
    wheel(0.52, 0.42, -0.5, 0.42, 0.06), wheel(-0.52, 0.42, -0.5, 0.42, 0.06), wheel(0, 0.38, 1.05, 0.38, 0.06),
  ]
}

const cache = new Map()
const geoFor = (type, c) => {
  const k = type + c
  if (!cache.has(k)) cache.set(k, mergeParts(partsFor(type, c)))
  return cache.get(k)
}
const Veh = ({ type, color, children }) => (
  <group>
    <mesh geometry={geoFor(type, color)} material={vehMat} castShadow />
    {children}
  </group>
)
export const CarBody = ({ color, cop }) => <Veh type="car" color={color}>{cop}</Veh>
export const BusBody = ({ color }) => <Veh type="bus" color={color} />
export const CngBody = ({ color = '#1b9e5a' }) => <Veh type="cng" color={color} />
export const RickshawBody = ({ color }) => <Veh type="rick" color={color} />

const torso = (c) => {
  const k = 'p' + c
  if (!cache.has(k)) cache.set(k, mergeParts([box([0, 1.1, 0], [0.46, 0.62, 0.26], c), { g: SPH, p: [0, 1.58, 0], s: [0.15, 0.15, 0.15], c: '#c68642' }, { g: SPH, p: [0, 1.66, -0.01], s: [0.155, 0.09, 0.155], c: '#f1f1f1' }]))
  return cache.get(k)
}
const pantsM = mat('#2c3550'), skinM = mat('#c68642')

export function Person({ c, limbs }) {
  const L = (k) => (e) => { if (limbs) limbs.current[k] = e }
  return (
    <group>
      <mesh geometry={torso(c)} material={vehMat} castShadow />
      <group ref={L('l')} position={[-0.12, 0.8, 0]}><mesh geometry={BOX} material={pantsM} position={[0, -0.4, 0]} scale={[0.17, 0.8, 0.2]} /></group>
      <group ref={L('r')} position={[0.12, 0.8, 0]}><mesh geometry={BOX} material={pantsM} position={[0, -0.4, 0]} scale={[0.17, 0.8, 0.2]} /></group>
      <group ref={L('al')} position={[-0.3, 1.38, 0]}><mesh geometry={BOX} material={skinM} position={[0, -0.28, 0]} scale={[0.12, 0.56, 0.14]} /></group>
      <group ref={L('ar')} position={[0.3, 1.38, 0]}><mesh geometry={BOX} material={skinM} position={[0, -0.28, 0]} scale={[0.12, 0.56, 0.14]} /></group>
    </group>
  )
}

export function Traffic() {
  const refs = useRef([])
  useFrame(() => {
    G.vehicles.forEach((v, i) => {
      const o = refs.current[i]
      if (o) { o.position.set(v.x, 0.12, v.z); o.rotation.y = v.ry }
    })
  })
  return G.vehicles.map((v, i) => (
    <group key={i} ref={(e) => (refs.current[i] = e)}>
      <Veh type={v.type} color={v.color} />
    </group>
  ))
}

export function Npcs() {
  const refs = useRef([]), limbs = useRef(G.npcs.map(() => ({ current: {} })))
  useFrame((s) => {
    const t = s.clock.elapsedTime
    G.npcs.forEach((p, i) => {
      const o = refs.current[i]; if (!o) return
      o.rotation.order = 'YXZ'
      const dn = p.down > 0
      o.position.set(p.x, dn ? 0.3 : 0.12, p.z); o.rotation.y = p.ry; o.rotation.x = dn ? -1.45 : 0 // knocked flat
      const l = limbs.current[i].current, sw = p.down > 0 ? 0 : Math.sin(t * (p.scare > 0 ? 14 : 5) + i) * (p.scare > 0 ? 0.9 : 0.55)
      if (l.l) { l.l.rotation.x = sw; l.r.rotation.x = -sw; l.al.rotation.x = -sw; l.ar.rotation.x = sw }
    })
  })
  return G.npcs.map((p, i) => (
    <group key={i} ref={(e) => (refs.current[i] = e)}><Person c={p.color} limbs={limbs.current[i]} /></group>
  ))
}
