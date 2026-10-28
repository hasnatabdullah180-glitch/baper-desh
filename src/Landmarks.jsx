import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { BOX, CYL, SPH, PLANE, mat, labelTex, mergeParts, Inst } from './gfx.jsx'
import { FLAG, ROADS, METRO_X, bridges } from './world'
import { hud } from './store'

const CONE = new THREE.ConeGeometry(1, 1, 7)
const M = {
  white: mat('#f4f1ea'), petal: mat('#fff7f2', { roughness: 0.5 }), pink: mat('#ffd6e0', { roughness: 0.5 }), water: mat('#35a4e6', { roughness: 0.15 }),
  concrete: mat('#9a9ca2'), road: mat('#3b3e44'), rail: mat('#dcdcdc'), glass: mat('#27455e', { roughness: 0.2, metalness: 0.3 }),
  roof: mat('#eef0f2'), tar: mat('#4a4d52', { roughness: 1 }), green: mat('#006a4e'), red: mat('#f42a41'), dash: mat('#ffffff'),
}
const label = (t, c, pos, sc) => <sprite position={pos} scale={sc}><spriteMaterial map={labelTex(t, c)} toneMapped={false} /></sprite>

// শাপলা চত্বর: lotus fountain roundabout (Shapla Chattar)
function Shapla() {
  const petals = useMemo(() => [
    ...Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * 6.283, r: 2.8, h: 4.4, t: 0.62, m: M.petal })),
    ...Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * 6.283 + 0.3, r: 1.3, h: 5.8, t: 0.26, m: M.pink })),
  ], [])
  return (
    <group position={[FLAG.x, 0, FLAG.z]}>
      <mesh geometry={CYL} material={M.white} position={[0, 0.4, 0]} scale={[6.4, 0.8, 6.4]} />
      <mesh geometry={CYL} material={M.water} position={[0, 0.42, 0]} scale={[5.7, 0.8, 5.7]} />
      <mesh geometry={CYL} material={M.white} position={[0, 0.8, 0]} scale={[1.7, 1.6, 1.7]} />
      {petals.map((p, i) => (
        <group key={i} position={[Math.sin(p.a) * p.r, 1.5, Math.cos(p.a) * p.r]} rotation={[0, p.a, 0]}>
          <group rotation={[p.t, 0, 0]}><mesh geometry={CONE} material={p.m} position={[0, p.h / 2, 0]} scale={[1.1, p.h, 0.45]} /></group>
        </group>
      ))}
      {label('শাপলা চত্বর', '#ff9fb2', [0, 11, 0], [8, 2, 1])}
    </group>
  )
}

// Raised airport expressway along the z=-80 road, running out west to the terminal
const Z = -80, X0 = -330, X1 = 262
function Expressway() {
  const L = X1 - X0, CX = (X0 + X1) / 2
  const { piers, caps, dashes } = useMemo(() => {
    const xs = []
    for (let x = -320; x <= 250; x += 22) if (ROADS.every((r) => Math.abs(x - r) > 8)) xs.push(x)
    const d = []
    for (let x = X0 + 4; x < X1; x += 8) d.push({ p: [x, 9.4, Z], s: [3, 0.04, 0.2] })
    return { piers: xs.map((x) => ({ p: [x, 4.2, Z], s: [1.5, 8.4, 1.5] })), caps: xs.map((x) => ({ p: [x, 8.4, Z], s: [2.2, 0.7, 6] })), dashes: d }
  }, [])
  return (
    <>
      <mesh geometry={BOX} material={M.concrete} position={[CX, 8.9, Z]} scale={[L, 0.9, 10]} />
      <mesh geometry={BOX} material={M.road} position={[CX, 9.37, Z]} scale={[L, 0.04, 9]} />
      {[-1, 1].map((s) => <mesh key={s} geometry={BOX} material={M.rail} position={[CX, 9.9, Z + s * 4.8]} scale={[L, 1, 0.35]} />)}
      <Inst geo={BOX} mat={M.dash} items={dashes} />
      <Inst geo={BOX} mat={M.concrete} items={piers} />
      <Inst geo={BOX} mat={M.concrete} items={caps} />
      {label('বিমানবন্দর এক্সপ্রেসওয়ে', '#06d6a0', [-110, 15, Z], [18, 4.5, 1])}
    </>
  )
}

// হযরত শাহজালাল বিমানবন্দর terminal, tower and a parked plane (distant landmark)
function Airport() {
  const cols = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ p: [-201, 7, -118 + i * 9.5], s: [1.2, 14, 1.2] })), [])
  return (
    <>
      <mesh geometry={PLANE} material={M.tar} rotation={[-Math.PI / 2, 0, 0]} position={[-340, 0.03, -80]} scale={[260, 240, 1]} />
      <mesh geometry={BOX} material={M.white} position={[-252, 7, -80]} scale={[60, 14, 92]} />
      <mesh geometry={BOX} material={M.glass} position={[-221.6, 6, -80]} scale={[0.6, 9, 84]} />
      <mesh geometry={BOX} material={M.roof} position={[-240, 14.8, -80]} scale={[86, 1.6, 100]} />
      <Inst geo={BOX} mat={M.white} items={cols} />
      <mesh geometry={CYL} material={M.white} position={[-262, 20, -142]} scale={[3, 40, 3]} />
      <mesh geometry={BOX} material={M.glass} position={[-262, 42, -142]} scale={[8, 4, 8]} />
      <mesh geometry={CYL} material={M.white} position={[-340, 3.2, -30]} rotation={[0, 0, Math.PI / 2]} scale={[1.8, 30, 1.8]} />
      <mesh geometry={SPH} material={M.white} position={[-325, 3.2, -30]} scale={[1.8, 1.8, 1.8]} />
      <mesh geometry={BOX} material={M.white} position={[-338, 2.6, -30]} scale={[5, 0.4, 34]} />
      <mesh geometry={BOX} material={M.green} position={[-353, 5.6, -30]} scale={[3, 5, 0.4]} />
      <mesh geometry={BOX} material={M.white} position={[-353, 3.6, -30]} scale={[3, 0.3, 10]} />
      {label('হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর', '#4dabf7', [-221, 20, -80], [34, 8.5, 1])}
    </>
  )
}

// ---- Dhaka Metro Rail: elevated viaduct down the x=0 avenue, with two trains shuttling on it ----
const MZ = 520
function Metro() {
  const { piers, caps, banners } = useMemo(() => {
    const zs = []
    for (let z = -250; z <= 250; z += 20) if (ROADS.every((r) => Math.abs(z - r) > 8)) zs.push(z)
    return {
      piers: zs.map((z) => ({ p: [METRO_X, 6.4, z], s: [2.2, 12.8, 2.2] })),
      caps: zs.map((z) => ({ p: [METRO_X, 12.9, z], s: [5.6, 1.2, 2.6] })),
      banners: zs.filter((_, i) => i % 2 === 0).map((z) => ({ p: [METRO_X + 1.12, 2.2, z], s: [0.04, 3.2, 1.7], c: ['#d62828', '#006a4e', '#1d3557', '#ffb703'][Math.abs(z / 20 | 0) % 4] })),
    }
  }, [])
  const trainGeo = useMemo(() => {
    const parts = []
    for (let k = 0; k < 3; k++) {
      const z = (k - 1) * 14.6
      parts.push({ g: BOX, p: [0, 1.5, z], s: [2.2, 2.7, 14], c: '#eef2f6' }, { g: BOX, p: [0, 1.75, z], s: [2.24, 0.9, 13], c: '#1b2a3a' }, { g: BOX, p: [0, 0.55, z], s: [2.24, 0.5, 14.02], c: '#1d6fb8' })
    }
    parts.push({ g: BOX, p: [0, 1.5, 22.1], s: [1.8, 2.2, 0.2], c: '#ffe27a' })
    return mergeParts(parts)
  }, [])
  const trainM = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), [])
  const t1 = useRef(), t2 = useRef()
  useFrame((s) => {
    if (hud.get().phase === 'pause') return
    const t = s.clock.elapsedTime
    t1.current.position.z = ((t * 17) % MZ) - MZ / 2
    t2.current.position.z = MZ / 2 - ((t * 15 + 190) % MZ)
  })
  return (
    <>
      <mesh geometry={BOX} material={M.concrete} position={[METRO_X, 13.6, 0]} scale={[5.4, 1.4, MZ]} />
      {[-1, 1].map((s) => <mesh key={s} geometry={BOX} material={M.rail} position={[METRO_X + s * 2.6, 14.6, 0]} scale={[0.2, 0.9, MZ]} />)}
      <Inst geo={BOX} mat={M.concrete} items={piers} shadow />
      <Inst geo={BOX} mat={M.concrete} items={caps} shadow />
      <Inst geo={BOX} mat={mat('#ffffff')} items={banners} />
      <mesh ref={t1} geometry={trainGeo} material={trainM} position={[METRO_X + 1.3, 14.3, 0]} />
      <mesh ref={t2} geometry={trainGeo} material={trainM} position={[METRO_X - 1.3, 14.3, 0]} rotation={[0, Math.PI, 0]} />
      {label('মেট্রোরেল', '#4dabf7', [METRO_X, 20, -30], [10, 2.5, 1])}
    </>
  )
}

// ---- pedestrian foot-over-bridges (stairs both ends) ----
const bridgeM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })
function Bridges() {
  const geo = useMemo(() => {
    const parts = [
      { g: BOX, p: [0, 5.6, 0], s: [2.6, 0.35, 23], c: '#8f98a3' },
      ...[-1, 1].map((s) => ({ g: BOX, p: [s * 1.25, 6.35, 0], s: [0.1, 1.1, 23], c: '#f2c230' })),
      { g: BOX, p: [0, 7.0, 0], s: [2.7, 0.12, 23], c: '#3a86ff' },
    ]
    for (const sz of [-1, 1]) {
      parts.push({ g: BOX, p: [0, 2.8, sz * 14.2], s: [2.4, 0.3, 8.0], c: '#7c8590', r: [sz * 0.8, 0, 0] })
      for (const sx of [-1, 1]) {
        parts.push({ g: BOX, p: [sx * 1.0, 2.8, sz * 9], s: [0.6, 5.6, 0.6], c: '#aab2ba' })
        parts.push({ g: BOX, p: [sx * 1.25, 3.4, sz * 14.2], s: [0.1, 1.0, 8.0], c: '#f2c230', r: [sz * 0.8, 0, 0] })
      }
    }
    return mergeParts(parts)
  }, [])
  return bridges.map((b, i) => <mesh key={i} geometry={geo} material={bridgeM} position={[b.x, 0.12, b.z]} rotation={[0, b.rot, 0]} castShadow />)
}

export default function Landmarks() {
  return <><Shapla /><Expressway /><Metro /><Bridges /><group position={[-90, 0, 0]}><Airport /></group></>
}
