import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOX, CYL, SPH, PLANE, mat, mergeParts, textTex } from './gfx.jsx'
import { G } from './sim'
import { Q } from './quality'

// Every vehicle / person torso is merged into ONE vertex-coloured mesh (1 draw call each).
const vehMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05 })
const WHEEL = '#16181c', GLASS = '#1d2a35', HEAD = '#fff3b0', TAIL = '#ff3030'
const box = (p, s, c, r) => ({ g: BOX, p, s, c, r })

const riderParts = (dy = 0, dz = 0, helm = '#e63946') => [
  box([0, 1.6, -0.15], [0.4, 0.55, 0.25], '#3a4350', [0.25, 0, 0]), { g: SPH, p: [0, 2.03, 0.0], s: [0.19, 0.19, 0.19], c: helm }, box([0, 1.98, 0.14], [0.22, 0.07, 0.04], '#111'),
  box([0.24, 1.55, 0.25], [0.08, 0.08, 0.7], '#c68642'), box([-0.24, 1.55, 0.25], [0.08, 0.08, 0.7], '#c68642'), box([0.14, 1.15, 0.1], [0.1, 0.1, 0.5], '#2c3550'), box([-0.14, 1.15, 0.1], [0.1, 0.1, 0.5], '#2c3550'),
].map((q) => ({ ...q, p: [q.p[0], q.p[1] + dy, q.p[2] + dz] }))

// wheel = black tyre + steel hub + light spokes (so the rotation is actually visible). Tagged `wh` so it is split into a spinning axle mesh.
const W = (x, y, z, r = 0.35, w = 0.25) => {
  const t = [y, z, r]
  return [
    { g: CYL, p: [x, y, z], s: [r, w, r], r: [0, 0, Math.PI / 2], c: WHEEL, wh: t },
    { g: CYL, p: [x, y, z], s: [r * 0.5, w * 1.12, r * 0.5], r: [0, 0, Math.PI / 2], c: '#aab0b6', wh: t },
    { g: BOX, p: [x, y, z], s: [w * 1.18, r * 1.7, r * 0.16], c: '#d9dde0', wh: t },
    { g: BOX, p: [x, y, z], s: [w * 1.18, r * 0.16, r * 1.7], c: '#d9dde0', wh: t },
  ]
}
const BUMP = '#2b2e33'

function carParts(c, o = {}) {
  return [
    box([0, 0.62, 0], [1.8, 0.55, 4.3], c), box([0, 0.93, 1.45], [1.7, 0.14, 1.3], c), box([0, 0.96, -1.6], [1.7, 0.18, 1.0], c),
    box([0, 1.2, -0.2], [1.62, 0.5, 1.9], GLASS), box([0, 1.48, -0.2], [1.56, 0.1, 1.55], c),
    box([0, 1.2, 0.88], [1.6, 0.5, 0.08], GLASS, [-0.62, 0, 0]), box([0, 1.2, -1.28], [1.6, 0.5, 0.08], GLASS, [0.62, 0, 0]),
    box([0, 0.42, 2.18], [1.8, 0.24, 0.18], BUMP), box([0, 0.42, -2.18], [1.8, 0.24, 0.18], BUMP), box([0, 0.66, 2.17], [0.8, 0.18, 0.05], '#111'),
    box([0.63, 0.76, 2.17], [0.4, 0.16, 0.06], HEAD), box([-0.63, 0.76, 2.17], [0.4, 0.16, 0.06], HEAD),
    box([0.65, 0.8, -2.17], [0.4, 0.14, 0.06], TAIL), box([-0.65, 0.8, -2.17], [0.4, 0.14, 0.06], TAIL),
    box([0.96, 1.0, 0.7], [0.12, 0.1, 0.2], c), box([-0.96, 1.0, 0.7], [0.12, 0.1, 0.2], c),
    ...W(0.92, 0.34, 1.4, 0.34, 0.22), ...W(-0.92, 0.34, 1.4, 0.34, 0.22), ...W(0.92, 0.34, -1.4, 0.34, 0.22), ...W(-0.92, 0.34, -1.4, 0.34, 0.22),
    ...(o.extra || []),
  ]
}

function partsFor(type, c) {
  if (type === 'car') return carParts(c)
  if (type === 'taxi') return carParts(c, { extra: [box([0.91, 0.75, 0], [0.03, 0.12, 3.6], '#151515'), box([-0.91, 0.75, 0], [0.03, 0.12, 3.6], '#151515'), box([0, 1.62, -0.2], [0.5, 0.15, 0.24], '#fff8d0')] })
  if (type === 'police') return carParts('#f2f4f7', { extra: [ // white car, blue doors stripe, roof light bar
    box([0.91, 0.78, 0], [0.03, 0.26, 3.4], '#1d4ed8'), box([-0.91, 0.78, 0], [0.03, 0.26, 3.4], '#1d4ed8'), box([0, 0.95, 1.45], [1.72, 0.05, 1.3], '#1d4ed8'),
    box([0, 1.58, -0.2], [1.1, 0.1, 0.34], '#222'), box([-0.36, 1.66, -0.2], [0.34, 0.12, 0.3], '#ff2020'), box([0.36, 1.66, -0.2], [0.34, 0.12, 0.3], '#2b6cff'),
    box([0.7, 0.72, 0.9], [0.03, 0.14, 0.5], '#fff'), box([-0.7, 0.72, 0.9], [0.03, 0.14, 0.5], '#fff')] })
  if (type === 'van') { // white delivery van with a green stripe
    return [
      box([0, 1.35, -0.55], [1.9, 1.75, 3.5], c), box([0, 0.85, 1.65], [1.85, 0.8, 1.6], c), box([0, 1.45, 1.45], [1.7, 0.55, 0.08], GLASS, [-0.38, 0, 0]),
      box([0.94, 1.2, 1.75], [0.03, 0.4, 1.0], GLASS), box([-0.94, 1.2, 1.75], [0.03, 0.4, 1.0], GLASS),
      box([0.96, 1.2, -0.55], [0.03, 0.5, 3.2], '#006a4e'), box([-0.96, 1.2, -0.55], [0.03, 0.5, 3.2], '#006a4e'), box([0.96, 0.9, -0.55], [0.03, 0.12, 3.2], '#f42a41'), box([-0.96, 0.9, -0.55], [0.03, 0.12, 3.2], '#f42a41'),
      box([0, 0.42, 2.5], [1.9, 0.24, 0.18], BUMP), box([0, 0.42, -2.34], [1.9, 0.24, 0.18], BUMP), box([0, 0.7, 2.5], [0.8, 0.2, 0.05], '#111'),
      box([0.65, 0.78, 2.47], [0.4, 0.16, 0.06], HEAD), box([-0.65, 0.78, 2.47], [0.4, 0.16, 0.06], HEAD), box([0.7, 0.8, -2.3], [0.3, 0.3, 0.06], TAIL), box([-0.7, 0.8, -2.3], [0.3, 0.3, 0.06], TAIL),
      box([0.98, 1.0, 1.2], [0.12, 0.1, 0.2], '#222'), box([-0.98, 1.0, 1.2], [0.12, 0.1, 0.2], '#222'),
      ...W(0.9, 0.38, 1.6, 0.38, 0.24), ...W(-0.9, 0.38, 1.6, 0.38, 0.24), ...W(0.9, 0.38, -1.4, 0.38, 0.24), ...W(-0.9, 0.38, -1.4, 0.38, 0.24),
    ]
  }
  if (type === 'cng' || type === 'ezy') { // green CNG / battery auto: red seats, canopy, front wheel on a fork
    const RED = '#d62839'
    return [
      box([0, 0.55, -0.1], [1.05, 0.18, 2.1], c), box([0.55, 0.85, -0.2], [0.08, 0.5, 1.5], c), box([-0.55, 0.85, -0.2], [0.08, 0.5, 1.5], c), box([0, 0.85, -0.95], [1.05, 0.5, 0.08], c),
      box([0, 1.0, -0.35], [0.95, 0.12, 0.7], RED), box([0, 1.4, -0.72], [0.95, 0.7, 0.1], RED), box([0, 1.0, -0.8], [0.95, 0.12, 0.3], RED),
      box([0.55, 1.9, 0.0], [0.06, 1.1, 0.06], '#2f3a35'), box([-0.55, 1.9, 0.0], [0.06, 1.1, 0.06], '#2f3a35'), box([0.55, 1.9, -1.0], [0.06, 1.1, 0.06], '#2f3a35'), box([-0.55, 1.9, -1.0], [0.06, 1.1, 0.06], '#2f3a35'),
      box([0, 2.48, -0.5], [1.4, 0.12, 1.7], '#262b28'), box([0, 2.4, 0.38], [1.4, 0.08, 0.06], '#e8a317'), box([0, 2.4, -1.38], [1.4, 0.08, 0.06], '#e8a317'),
      box([0.56, 1.0, -0.2], [0.02, 0.5, 1.4], '#2a3a30'), box([-0.56, 1.0, -0.2], [0.02, 0.5, 1.4], '#2a3a30'), // cage mesh sides
      box([0, 0.95, 0.95], [0.5, 0.5, 0.15], c), box([0, 1.1, 1.05], [0.4, 0.22, 0.06], HEAD), box([0, 1.45, 0.9], [0.9, 0.06, 0.06], '#333'), box([0, 0.7, 1.0], [0.1, 0.8, 0.1], '#aaa'),
      box([0, 0.95, 0.2], [0.5, 0.1, 0.4], RED), box([0.4, 0.75, -1.0], [0.2, 0.12, 0.05], TAIL), box([-0.4, 0.75, -1.0], [0.2, 0.12, 0.05], TAIL),
      ...W(0, 0.33, 1.05, 0.33, 0.14), ...W(0.55, 0.33, -0.85, 0.33, 0.16), ...W(-0.55, 0.33, -0.85, 0.33, 0.16),
    ]
  }
  if (type === 'bike0') { // motorbike without rider (the player sits on it)
    return [
      ...W(0, 0.38, 0.7, 0.38, 0.1), ...W(0, 0.38, -0.7, 0.38, 0.1),
      box([0, 0.75, 0.0], [0.25, 0.35, 1.0], '#222'), box([0, 1.0, -0.2], [0.28, 0.2, 0.9], c), box([0, 1.12, -0.1], [0.3, 0.1, 0.7], '#111'),
      box([0, 0.8, 0.75], [0.1, 0.7, 0.1], '#d4b106', [0.35, 0, 0]), box([0, 0.9, 0.82], [0.2, 0.06, 0.55], c), box([0, 1.32, 0.52], [0.7, 0.06, 0.06], '#111'), box([0, 1.05, 0.98], [0.26, 0.26, 0.06], HEAD),
      box([0.16, 0.55, -0.8], [0.1, 0.1, 0.6], '#aaa'), box([0, 0.98, -0.78], [0.22, 0.1, 0.06], TAIL),
    ]
  }
  if (type === 'scooter0') {
    return [
      ...W(0, 0.28, 0.68, 0.28, 0.1), ...W(0, 0.28, -0.72, 0.28, 0.12),
      box([0, 0.4, 0], [0.5, 0.1, 1.0], c), box([0, 0.66, -0.55], [0.5, 0.5, 0.8], c), box([0, 0.96, -0.5], [0.42, 0.12, 0.72], '#222'),
      box([0, 0.85, 0.6], [0.45, 0.7, 0.1], c, [-0.25, 0, 0]), box([0, 1.3, 0.55], [0.7, 0.06, 0.06], '#222'), box([0, 1.12, 0.74], [0.24, 0.18, 0.06], HEAD), box([0, 0.78, -0.96], [0.24, 0.1, 0.05], TAIL),
    ]
  }
  if (type === 'bus') { // BRTC-style double-door red city bus
    return [
      box([0, 1.7, 0], [2.6, 2.4, 9.2], c), box([0, 2.3, 0], [2.64, 0.75, 8.6], GLASS),
      ...[-3.6, -2.4, -1.2, 1.4, 2.6, 3.8].map((k) => box([0, 2.3, k], [2.66, 0.8, 0.07], c)),
      box([0, 1.58, 0], [2.64, 0.07, 9.22], '#1f8a4c'), box([0, 1.45, 0], [2.64, 0.06, 9.22], '#ffffff'), box([0, 1.33, 0], [2.64, 0.07, 9.22], '#1f8a4c'),
      box([1.31, 1.95, 0.3], [0.06, 2.1, 1.3], '#6e1b1b'), box([-1.31, 1.95, 0.3], [0.06, 2.1, 1.3], '#6e1b1b'),
      box([0, 2.35, 4.58], [2.2, 1, 0.06], GLASS), box([0, 2.95, 4.6], [1.4, 0.22, 0.05], '#ffcf33'), box([0, 0.55, 4.63], [2.5, 0.3, 0.14], BUMP), box([0, 1.1, 4.62], [1.2, 0.3, 0.05], '#222'),
      box([0.9, 0.85, 4.62], [0.4, 0.25, 0.06], HEAD), box([-0.9, 0.85, 4.62], [0.4, 0.25, 0.06], HEAD),
      box([0, 0.55, -4.63], [2.5, 0.3, 0.14], BUMP), box([0, 2.35, -4.58], [2.0, 0.8, 0.06], GLASS), box([1.0, 1.0, -4.62], [0.4, 0.25, 0.06], TAIL), box([-1.0, 1.0, -4.62], [0.4, 0.25, 0.06], TAIL),
      box([0, 2.95, -1.0], [1.2, 0.18, 2.0], '#c9ced3'), box([1.4, 2.0, 4.0], [0.08, 0.35, 0.18], '#222'), box([-1.4, 2.0, 4.0], [0.08, 0.35, 0.18], '#222'),
      ...W(1.3, 0.5, 3, 0.5, 0.3), ...W(-1.3, 0.5, 3, 0.5, 0.3), ...W(1.3, 0.5, -3, 0.5, 0.3), ...W(-1.3, 0.5, -3, 0.5, 0.3),
    ]
  }
  // cycle rickshaw: painted back panel, tasselled hood, cushioned seat, saddle + handlebar
  const GOLD = '#ffd23f'
  return [
    box([0, 0.45, 0], [0.9, 0.12, 2.3], '#2b2b2b'), box([0, 0.7, -0.55], [0.85, 0.28, 0.85], '#c1121f'), box([0, 0.98, -0.28], [0.8, 0.5, 0.1], '#c1121f', [-0.2, 0, 0]),
    box([0, 1.0, -1.0], [0.95, 0.85, 0.08], c), box([0, 1.0, -1.06], [0.5, 0.5, 0.03], GOLD, [0, 0, Math.PI / 4]), box([0, 1.0, -1.08], [0.28, 0.28, 0.03], '#e63946', [0, 0, Math.PI / 4]), box([0, 1.0, -1.1], [0.1, 0.1, 0.03], '#118ab2', [0, 0, Math.PI / 4]),
    box([0.36, 1.3, -1.06], [0.14, 0.14, 0.03], '#06d6a0'), box([-0.36, 1.3, -1.06], [0.14, 0.14, 0.03], '#06d6a0'), box([0.36, 0.7, -1.06], [0.14, 0.14, 0.03], '#8338ec'), box([-0.36, 0.7, -1.06], [0.14, 0.14, 0.03], '#8338ec'),
    box([0, 1.62, -0.55], [1.0, 0.07, 1.05], c, [0.22, 0, 0]),
    ...[[-0.38, '#ffd23f'], [0, '#06d6a0'], [0.38, '#ffffff']].map(([dz, col]) => box([0, 1.626 - dz * 0.218, -0.55 + dz * 0.976], [1.02, 0.08, 0.13], col, [0.22, 0, 0])),
    ...[-0.4, -0.2, 0, 0.2, 0.4].map((x) => box([x, 1.52, 0.0], [0.07, 0.14, 0.03], '#ef476f')),
    box([0, 1.5, 0.0], [1.0, 0.05, 0.05], GOLD), box([0.47, 1.1, -0.05], [0.05, 1.0, 0.05], '#444'), box([-0.47, 1.1, -0.05], [0.05, 1.0, 0.05], '#444'), box([0, 1.0, 0.95], [0.7, 0.05, 0.05], '#444'),
    box([0, 0.9, 0.58], [0.2, 0.08, 0.3], '#222'), box([0, 0.62, 0.55], [0.06, 0.06, 1.0], '#444', [0.5, 0, 0]),
    box([0, 1.15, 1.0], [0.18, 0.12, 0.05], HEAD), box([0, 0.65, -1.05], [0.3, 0.1, 0.04], TAIL),
    ...W(0.52, 0.42, -0.5, 0.42, 0.06), ...W(-0.52, 0.42, -0.5, 0.42, 0.06), ...W(0, 0.38, 1.05, 0.38, 0.06),
  ]
}

// split into: body | headlights | tail lights | spinning axles
const cache = new Map()
function modelFor(type, c) {
  const k = type + c
  if (cache.has(k)) return cache.get(k)
  const body = [], head = [], tail = [], ax = new Map()
  partsFor(type, c).flat().forEach((p) => {
    if (p.wh) {
      const key = p.wh[0] + '|' + p.wh[1]
      if (!ax.has(key)) ax.set(key, { y: p.wh[0], z: p.wh[1], r: p.wh[2], parts: [] })
      ax.get(key).parts.push({ ...p, p: [p.p[0], 0, 0] })
    } else if (p.c === HEAD) head.push(p)
    else if (p.c === TAIL) tail.push(p)
    else body.push(p)
  })
  const m = { body: mergeParts(body), head: head.length ? mergeParts(head) : null, tail: tail.length ? mergeParts(tail) : null, axles: [...ax.values()].map((a) => ({ y: a.y, z: a.z, r: a.r, geo: mergeParts(a.parts) })) }
  cache.set(type + c, m)
  return m
}
const headM = new THREE.MeshBasicMaterial({ color: HEAD, toneMapped: false })
export const tailOff = new THREE.MeshBasicMaterial({ color: '#7a1414' })
export const tailOn = new THREE.MeshBasicMaterial({ color: '#ff2222', toneMapped: false })
const brtcM = new THREE.MeshBasicMaterial({ map: textTex('BRTC', '#ffffff'), transparent: true, toneMapped: false })
const cngM = new THREE.MeshBasicMaterial({ map: textTex('CNG', '#ffffff'), transparent: true, toneMapped: false })
const BusText = () => [1, -1].map((s) => <mesh key={s} geometry={PLANE} material={brtcM} position={[s * 1.32, 1.0, -2.6]} rotation={[0, s * Math.PI / 2, 0]} scale={[2.4, 0.9, 1]} />)
const CngText = () => [1, -1].map((s) => <mesh key={s} geometry={PLANE} material={cngM} position={[s * 0.58, 0.9, -0.2]} rotation={[0, s * Math.PI / 2, 0]} scale={[0.9, 0.34, 1]} />)
const Veh = ({ type, color, children }) => {
  const m = modelFor(type, color)
  return (
    <group>
      <mesh geometry={m.body} material={vehMat} castShadow />
      {m.head && <mesh geometry={m.head} material={headM} />}
      {m.tail && <mesh geometry={m.tail} material={tailOff} userData={{ tail: 1 }} />}
      {m.axles.map((a, i) => <mesh key={i} geometry={a.geo} material={vehMat} position={[0, a.y, a.z]} userData={{ wr: a.r }} castShadow />)}
      {type === 'bus' && <BusText />}
      {(type === 'ezy' || type === 'cng') && <CngText />}
      {children}
    </group>
  )
}
export const CarBody = ({ color, cop }) => <Veh type={cop ? 'police' : 'car'} color={color} />
export const PoliceCarBody = () => <Veh type="police" color="#f2f4f7" />
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

const riderGeo = (k) => { const key = 'rider' + k; if (!cache.has(key)) cache.set(key, mergeParts(k === 's' ? riderParts(-0.1, -0.2, '#1d3557') : riderParts())); return cache.get(key) }
const RIDERS = { bike: ['bike0', 'b'], scooter: ['scooter0', 's'] }
const wheelStep = (o, v, dt) => { // spin axles by the distance actually travelled (forward or reverse); brake lights follow v.braking
  const dx = v.x - (v._px ?? v.x), dz = v.z - (v._pz ?? v.z)
  v._px = v.x; v._pz = v.z
  const inner = o.children[0]
  if (!inner) return
  const d = Math.abs(dx) + Math.abs(dz) > 6 ? 0 : dx * Math.sin(v.ry) + dz * Math.cos(v.ry)
  const brk = v.braking || (v.player && G.ride?.braking)
  for (const m of inner.children) {
    if (m.userData.wr) m.rotation.x += d / m.userData.wr
    else if (m.userData.tail) m.material = brk ? tailOn : tailOff
  }
  void dt
}
export function Traffic() {
  const refs = useRef([]), riders = useRef([])
  useFrame((st, dt) => {
    const lim = Q.drawDist
    G.vehicles.forEach((v, i) => {
      const o = refs.current[i]
      if (o) {
        o.position.set(v.x, 0.12, v.z); o.rotation.y = v.ry
        o.visible = v.player || Math.abs(v.x - G.x) + Math.abs(v.z - G.z) < lim * 1.3
        if (o.visible) wheelStep(o, v, dt)
      }
      const rd = riders.current[i]
      if (rd) rd.visible = !v.player
    })
  })
  return G.vehicles.map((v, i) => {
    const r = RIDERS[v.type]
    return (
      <group key={i} ref={(e) => (refs.current[i] = e)}>
        {r ? (
          <>
            <Veh type={r[0]} color={v.color} />
            <mesh ref={(e) => (riders.current[i] = e)} geometry={riderGeo(r[1])} material={vehMat} castShadow />
          </>
        ) : <Veh type={v.type} color={v.color} />}
      </group>
    )
  })
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
