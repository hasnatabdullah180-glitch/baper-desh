import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOX, SPH, mat, mergeParts, labelTex } from './gfx.jsx'
import { Person } from './Traffic.jsx'
import { G } from './sim'
import { Q } from './quality'

// Bangladesh-inspired fictional police: traffic officers (white), patrol officers (sky-blue shirt), cap, belt, badge, whistle.
const uniMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })
const SKIN = '#c68642', NAVY = '#1b2a49'
const box = (p, s, c) => ({ g: BOX, p, s, c })
const torsoGeo = new Map()
function torso(kind) {
  if (torsoGeo.has(kind)) return torsoGeo.get(kind)
  const white = kind === 'traffic', shirt = white ? '#f4f4ef' : '#7aa7d9'
  const g = mergeParts([
    box([0, 1.1, 0], [0.5, 0.62, 0.28], shirt), box([0, 0.82, 0], [0.52, 0.07, 0.3], '#1a1a1a'), box([0.05, 0.82, 0.155], [0.08, 0.07, 0.02], '#e0b030'),
    box([-0.12, 1.25, 0.145], [0.08, 0.1, 0.02], '#e0b030'), box([0.14, 1.35, 0.145], [0.1, 0.03, 0.02], '#1d4ed8'), box([0, 1.1, 0.145], [0.03, 0.55, 0.015], '#d0d6dd'),
    { g: SPH, p: [0, 1.58, 0], s: [0.15, 0.16, 0.15], c: SKIN }, box([0, 1.5, 0.13], [0.08, 0.03, 0.03], '#3a2a1a'),
    box([0, 1.74, 0], [0.34, 0.11, 0.34], white ? '#ffffff' : NAVY), box([0, 1.81, 0], [0.3, 0.05, 0.3], white ? '#ffffff' : NAVY), box([0, 1.71, 0.19], [0.3, 0.03, 0.16], '#111'), box([0, 1.76, 0.172], [0.07, 0.07, 0.02], '#e0b030'),
    box([-0.05, 1.28, 0.15], [0.02, 0.2, 0.01], '#aaa'),
  ])
  torsoGeo.set(kind, g); return g
}
const pantsM = mat(NAVY), armM = { traffic: mat('#f4f4ef'), patrol: mat('#7aa7d9') }, skinM = mat(SKIN), bootM = mat('#111')

function Officer({ kind, limbs }) {
  const L = (k) => (e) => { limbs[k] = e }
  const am = armM[kind === 'traffic' ? 'traffic' : 'patrol']
  return (
    <group ref={L('body')}>
      <mesh geometry={torso(kind === 'traffic' ? 'traffic' : 'patrol')} material={uniMat} castShadow={Q.shadows} />
      {[['l', -0.12], ['r', 0.12]].map(([k, x]) => (
        <group key={k} ref={L(k)} position={[x, 0.8, 0]}>
          <mesh geometry={BOX} material={pantsM} position={[0, -0.4, 0]} scale={[0.17, 0.8, 0.2]} />
          <mesh geometry={BOX} material={bootM} position={[0, -0.76, 0.04]} scale={[0.18, 0.1, 0.28]} />
        </group>
      ))}
      {[['al', -0.31], ['ar', 0.31]].map(([k, x]) => (
        <group key={k} ref={L(k)} position={[x, 1.38, 0]}>
          <mesh geometry={BOX} material={am} position={[0, -0.22, 0]} scale={[0.12, 0.44, 0.14]} />
          <mesh geometry={BOX} material={skinM} position={[0, -0.5, 0]} scale={[0.1, 0.12, 0.12]} />
        </group>
      ))}
    </group>
  )
}

function animate(l, st, t, i) {
  const sw = (f, a) => Math.sin(t * f + i) * a
  let lean = 0, bob = 0, al = 0, ar = 0, ll = 0
  if (st === 'walk') { ll = sw(5, 0.55); al = -ll; ar = ll }
  else if (st === 'run') { ll = sw(12, 1.0); al = -ll * 0.9 - 0.4; ar = ll * 0.9 - 0.4; lean = 0.3 }
  else if (st === 'point') { ar = -1.55 + sw(2.5, 0.1); al = 0.05 }
  else if (st === 'cheer') { al = -2.8 + sw(10, 0.3); ar = -2.8 - sw(10, 0.3); bob = Math.abs(sw(8, 0.18)) }
  else { al = sw(1.5, 0.04); ar = -sw(1.5, 0.04) } // stand
  if (l.l) { l.l.rotation.x = ll; l.r.rotation.x = -ll; l.al.rotation.x = al; l.ar.rotation.x = ar }
  if (l.body) { l.body.rotation.x = lean; l.body.position.y = bob }
}

export function Officers() {
  const [n, setN] = useState(G.officers.length)
  const refs = useRef([]), limbs = useMemo(() => Array.from({ length: 24 }, () => ({})), [])
  useFrame((s) => {
    if (G.officers.length !== n) setN(G.officers.length)
    const t = s.clock.elapsedTime, lim = Q.drawDist
    G.officers.forEach((o, i) => {
      const g = refs.current[i]; if (!g) return
      g.visible = Math.abs(o.x - G.x) + Math.abs(o.z - G.z) < lim * 1.3
      if (!g.visible) return
      g.position.set(o.x, 0.12, o.z); g.rotation.y = o.ry
      animate(limbs[i], o.st, t, i)
    })
  })
  return G.officers.slice(0, 24).map((o, i) => (
    <group key={i} ref={(e) => (refs.current[i] = e)} scale={o.kind === 'raid' ? 1.08 : 1}><Officer kind={o.kind} limbs={limbs[i]} /></group>
  ))
}

const markM = new THREE.SpriteMaterial({ map: labelTex('চাঁদা ৳', '#14b8a6'), toneMapped: false })
export function Vendors() {
  const refs = useRef([]), marks = useRef([]), limbs = useMemo(() => G.vendors.map(() => ({ current: {} })), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime, lim = Q.drawDist, on = G.mission?.id === 'chanda'
    G.vendors.forEach((v, i) => {
      const g = refs.current[i]; if (!g) return
      g.visible = Math.abs(v.x - G.x) + Math.abs(v.z - G.z) < lim
      const mk = marks.current[i]
      if (mk) { mk.visible = g.visible && on && v.active && !v.done; mk.position.y = 3.1 + Math.sin(t * 3 + i) * 0.15 }
      if (!g.visible) return
      g.position.set(v.x, 0.12, v.z); g.rotation.y = v.ry
      const l = limbs[i].current
      let al = Math.sin(t * 1.3 + i) * 0.05, ar = -al
      if (v.scare > 0) { al = -2.7 + Math.sin(t * 18) * 0.25; ar = -2.7 - Math.sin(t * 18) * 0.25 }
      else if (on && v.active && !v.done) ar = -1.2 + Math.sin(t * 4 + i) * 0.45 // "আসেন ভাই!" beckoning
      if (l.l) { l.l.rotation.x = 0; l.r.rotation.x = 0; l.al.rotation.x = al; l.ar.rotation.x = ar }
    })
  })
  return G.vendors.map((v, i) => (
    <group key={i} ref={(e) => (refs.current[i] = e)}>
      <Person c={v.color} limbs={limbs[i]} />
      <sprite ref={(e) => (marks.current[i] = e)} material={markM} scale={[3.2, 0.8, 1]} visible={false} />
    </group>
  ))
}
