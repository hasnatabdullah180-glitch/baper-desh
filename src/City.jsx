import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BOX, CYL, ICO, PLANE, mat, facadeTex, flagTex, signAtlas, Inst } from './gfx.jsx'
import Landmarks from './Landmarks.jsx'
import { ROADS, RW, buildings, slabs, trees, lamps, PALETTE, FLAG, SIGNS, SCOL } from './world'

const asphalt = mat('#3b3e44', { roughness: 0.95 })
const FACE = { '+z': [0, 0, 1], '-z': [Math.PI, 0, -1], '+x': [Math.PI / 2, 1, 0], '-x': [-Math.PI / 2, -1, 0] }
const signW = (b, f) => Math.min((FACE[f][1] ? b.d : b.w) - 1.5, 10)
const signOff = (b, f) => (FACE[f][1] ? b.w / 2 : b.d / 2)

// All buildings merged per palette colour (10 draw calls instead of ~130).
function useBuildingGeos() {
  return useMemo(() => {
    const groups = PALETTE.map(() => [])
    buildings.forEach((b) => {
      const g = new THREE.BoxGeometry(b.w, b.h, b.d)
      g.translate(b.x, b.h / 2 + 0.12, b.z)
      const fl = Math.max(2, Math.round(b.h / 3.2))
      const rx = Math.max(1, Math.round(b.d / 4)), rz = Math.max(1, Math.round(b.w / 4))
      const uv = g.attributes.uv
      for (let i = 0; i < 24; i++) {
        const face = Math.floor(i / 4)
        let u = uv.getX(i), v = uv.getY(i)
        if (face < 2) { u *= rx; v *= fl } else if (face > 3) { u *= rz; v *= fl } else { u = 0.03; v = 0.03 } // roof/bottom: plain wall tone
        uv.setXY(i, u, v)
      }
      groups[b.color].push(g)
    })
    return groups.map((l) => (l.length ? mergeGeometries(l) : null))
  }, [])
}

// All shop-sign planes in one geometry sharing one atlas texture (1 draw call).
function useSigns() {
  return useMemo(() => {
    const N = SIGNS.length
    const planes = [], awnings = []
    buildings.forEach((b) => b.signs.forEach((s) => {
      const [ry, nx, nz] = FACE[s.face]
      const w = signW(b, s.face), off = signOff(b, s.face)
      const g = new THREE.PlaneGeometry(1, 1)
      const uv = g.attributes.uv
      for (let i = 0; i < 4; i++) uv.setY(i, 1 - (s.idx + 1) / N + uv.getY(i) / N)
      g.scale(w, 2.2, 1); g.translate(0, 4.22, off + 0.08); g.rotateY(ry); g.translate(b.x, 0, b.z)
      planes.push(g)
      awnings.push({ p: [b.x + nx * (off + 0.7), 2.97, b.z + nz * (off + 0.7)], s: [w, 0.12, 1.4], r: ry, c: SCOL[s.idx % SCOL.length][0] })
    }))
    return { geo: mergeGeometries(planes), awnings, tex: signAtlas(SIGNS.map((t, i) => [t, SCOL[i % SCOL.length][0], SCOL[i % SCOL.length][1]])) }
  }, [])
}

function Roads() {
  const dashes = useMemo(() => {
    const out = []
    ROADS.forEach((r) => {
      for (let a = -166; a <= 166; a += 7) {
        if (ROADS.some((q) => Math.abs(a - q) < RW / 2 + 2)) continue
        out.push({ p: [a, 0.06, r], s: [3, 1, 0.22] })
        out.push({ p: [r, 0.06, a], s: [0.22, 1, 3] })
      }
    })
    return out
  }, [])
  const zebra = useMemo(() => {
    const out = []
    ROADS.forEach((cx) => ROADS.forEach((cz) => {
      for (let k = -6; k <= 6; k += 1.7) {
        ;[-1, 1].forEach((sg) => {
          out.push({ p: [cx + sg * 9, 0.06, cz + k], s: [3, 1, 0.8] })
          out.push({ p: [cx + k, 0.06, cz + sg * 9], s: [0.8, 1, 3] })
        })
      }
    }))
    return out
  }, [])
  return (
    <>
      {ROADS.map((r) => (
        <group key={r}>
          <mesh geometry={PLANE} material={asphalt} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, r]} scale={[350, RW, 1]} receiveShadow />
          <mesh geometry={PLANE} material={asphalt} rotation={[-Math.PI / 2, 0, 0]} position={[r, 0.035, 0]} scale={[RW, 350, 1]} receiveShadow />
        </group>
      ))}
      <Inst geo={BOX} mat={mat('#ffd23f')} items={dashes} />
      <Inst geo={BOX} mat={mat('#f2f2f2')} items={zebra} />
    </>
  )
}

export default function City() {
  const geos = useBuildingGeos()
  const signs = useSigns()
  const mats = useMemo(() => PALETTE.map((_, i) => {
    const t = facadeTex(PALETTE[i]); t.wrapS = t.wrapT = THREE.RepeatWrapping
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })
  }), [])
  const tanks = useMemo(() => buildings.filter((b) => b.roof).map((b) => ({ p: [b.x + b.w * 0.15, b.h + 1.02, b.z - b.d * 0.15], s: [1.1, 1.8, 1.1] })), [])
  const slabItems = useMemo(() => slabs.map((s) => ({ p: [s.x, 0.06, s.z], s: [s.w, 0.12, s.d], c: s.plaza ? '#d9cfbf' : '#b9b2a3' })), [])
  const trunks = useMemo(() => trees.map((t) => ({ p: [t.x, 1.3, t.z], s: [0.2 * t.s, 2.6, 0.2 * t.s] })), [])
  const crowns = useMemo(() => trees.map((t, i) => ({ p: [t.x, 3.7 * t.s, t.z], s: [1.6 * t.s, 1.4 * t.s, 1.6 * t.s], c: ['#2f7d32', '#3b8f3a', '#2a6e3a', '#4a9a3f'][i % 4] })), [])
  const poles = useMemo(() => lamps.map((l) => ({ p: [l.x, 3, l.z], s: [0.14, 6, 0.14] })), [])
  const heads = useMemo(() => lamps.map((l) => ({ p: [l.x, 6.1, l.z], s: [0.7, 0.18, 0.4] })), [])
  return (
    <>
      <mesh geometry={PLANE} material={mat('#7d8f5b', { roughness: 1 })} rotation={[-Math.PI / 2, 0, 0]} scale={[900, 900, 1]} receiveShadow />
      <Roads />
      <Inst geo={BOX} mat={mat('#ffffff')} items={slabItems} />
      <mesh geometry={CYL} material={mat('#4f9d4a')} position={[FLAG.x, 0.14, FLAG.z]} scale={[9, 0.04, 9]} receiveShadow />
      <mesh geometry={CYL} material={mat('#cfcfcf')} position={[FLAG.x + 11, 5, FLAG.z + 11]} scale={[0.1, 10, 0.1]} castShadow />
      <mesh geometry={PLANE} position={[FLAG.x + 12.6, 8.6, FLAG.z + 11]} scale={[3.2, 2, 1]}>
        <meshBasicMaterial map={flagTex()} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {geos.map((g, i) => g && <mesh key={i} geometry={g} material={mats[i]} castShadow receiveShadow />)}
      <Inst geo={CYL} mat={mat('#8a9aa6')} items={tanks} shadow />
      <mesh geometry={signs.geo}>
        <meshBasicMaterial map={signs.tex} toneMapped={false} />
      </mesh>
      <Inst geo={BOX} mat={mat('#ffffff')} items={signs.awnings} shadow />
      <Inst geo={CYL} mat={mat('#6b4a2b')} items={trunks} shadow />
      <Inst geo={ICO} mat={mat('#ffffff')} items={crowns} shadow />
      <Landmarks />
      <Inst geo={BOX} mat={mat('#4a4f57')} items={poles} />
      <Inst geo={BOX} mat={mat('#fff1b0', { emissive: '#ffd966', emissiveIntensity: 1.6 })} items={heads} />
    </>
  )
}
