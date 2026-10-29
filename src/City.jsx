import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BOX, CYL, ICO, PLANE, mat, facadeTex, flagTex, signAtlas, Inst } from './gfx.jsx'
import Landmarks from './Landmarks.jsx'
import { ROADS, RW, buildings, slabs, trees, lamps, stalls, wires, PALETTE, FLAG, SIGNS, SCOL, SIG, signalState, STALL_KINDS } from './world'

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

// Dhaka street life: market stalls with tarps, overhead cables
function StreetLife() {
  const d = useMemo(() => {
    const table = [], goods = [], tarp = [], poles = []
    stalls.forEach((s) => {
      const L = s.ax === 'z' ? [1.3, 2.4] : [2.4, 1.3]
      table.push({ p: [s.x, 0.55, s.z], s: [L[0], 0.8, L[1]] })
      goods.push({ p: [s.x, 1.05, s.z], s: [L[0] - 0.2, 0.28, L[1] - 0.2], c: s.goods })
      tarp.push({ p: [s.x, 2.45, s.z], s: [L[0] + 0.7, 0.07, L[1] + 0.7], c: s.tarp })
      for (const a of [-1, 1]) for (const b of [-1, 1]) poles.push({ p: [s.x + a * (L[0] / 2 + 0.25), 1.3, s.z + b * (L[1] / 2 + 0.25)], s: [0.07, 2.5, 0.07] })
    })
    const cab = []
    wires.forEach((w) => {
      const dx = w.x2 - w.x1, dz = w.z2 - w.z1, len = Math.hypot(dx, dz), r = -Math.atan2(dz, dx)
      for (const y of [5.75, 5.5, 5.25]) cab.push({ p: [(w.x1 + w.x2) / 2, y, (w.z1 + w.z2) / 2], s: [len, 0.035, 0.035], r })
    })
    return { table, goods, tarp, poles, cab }
  }, [])
  return (
    <>
      <Inst geo={BOX} mat={mat('#8a6a4a')} items={d.table} shadow />
      <Inst geo={BOX} mat={mat('#ffffff')} items={d.goods} />
      <Inst geo={BOX} mat={mat('#ffffff')} items={d.tarp} shadow />
      <Inst geo={BOX} mat={mat('#555a60')} items={d.poles} />
      <Inst geo={BOX} mat={mat('#1c1f24')} items={d.cab} />
    </>
  )
}

const ADS = [['বাপের দেশ কোলা — ঠান্ডা মাথায় ঢাকা!', '#d62828', '#ffffff'], ['ঝালমুড়ি এক্সপ্রেস · ১০ মিনিটে ডেলিভারি', '#ffb703', '#1b1b1b'], ['মেট্রোতে চলুন, জ্যাম এড়ান!', '#006a4e', '#ffffff'], ['পদ্মা ৫জি ডাটা প্যাক · ৯৯ টাকা', '#1d3557', '#ffe8a3'], ['সোনালী চা — আড্ডার আসল স্বাদ', '#7b2cbf', '#ffffff'], ['ঈদ অফার! সব পাঞ্জাবি ৩০% ছাড়', '#0b7285', '#ffffff']]
const MIDS = [-120, -40, 40, 120]

// Dhaka street furniture: kerbs, mid-block zebras, medians, working traffic lights, rooftop billboards, stall signs
function Dhaka() {
  const d = useMemo(() => {
    const curbs = [], zebra = [], median = [], shrub = [], pole = [], head = [], stools = [], bb = [], bbLeg = [], stalk = []
    slabs.forEach((sl) => {
      for (const sg of [-1, 1]) {
        curbs.push({ p: [sl.x + sg * (sl.w / 2 - 0.17), 0.1, sl.z], s: [0.34, 0.2, sl.d] })
        curbs.push({ p: [sl.x, 0.1, sl.z + sg * (sl.d / 2 - 0.17)], s: [sl.w, 0.2, 0.34] })
      }
    })
    ROADS.forEach((r) => {
      MIDS.forEach((m) => {
        for (let k = -5.5; k <= 5.5; k += 1.6) { zebra.push({ p: [m, 0.07, r + k], s: [3.2, 0.04, 0.8] }); zebra.push({ p: [r + k, 0.07, m], s: [0.8, 0.04, 3.2] }) }
      })
      if (r === 0) return
      for (let a = -250; a < 250; a += 5) {
        if (ROADS.some((q) => Math.abs(a + 2.5 - q) < RW / 2 + 5) || MIDS.some((q) => Math.abs(a + 2.5 - q) < 5)) continue
        median.push({ p: [a + 2.5, 0.16, r], s: [4.7, 0.32, 0.7], c: Math.floor(a / 5) % 2 ? '#e8e2d0' : '#c9c2ae' }); median.push({ p: [r, 0.16, a + 2.5], s: [0.7, 0.32, 4.7], c: Math.floor(a / 5) % 2 ? '#e8e2d0' : '#c9c2ae' })
        if (Math.floor(a / 5) % 3 === 0) { shrub.push({ p: [a + 2.5, 0.55, r], s: [1.1, 0.8, 0.6] }); shrub.push({ p: [r, 0.55, a + 2.5], s: [0.6, 0.8, 1.1] }) }
      }
    })
    ROADS.forEach((cx) => ROADS.forEach((cz) => {
      for (const [sx, sz, ax] of [[1, 1, 'x'], [-1, -1, 'x'], [-1, 1, 'z'], [1, -1, 'z']]) {
        const x = cx + sx * 8.6, z = cz + sz * 8.6
        pole.push({ p: [x, 2.1, z], s: [0.16, 4.2, 0.16] })
        head.push({ p: [x, 4.5, z], s: [0.5, 1.4, 0.5], ax, x, z })
      }
    }))
    stalls.forEach((st, i) => {
      const L = st.ax === 'z' ? [1.3, 2.4] : [2.4, 1.3]
      if (st.kind === 1) { stools.push({ p: [st.x + (st.ax === 'z' ? 1.6 : 0.4), 0.28, st.z + (st.ax === 'z' ? 0.4 : 1.6)], s: [0.45, 0.45, 0.45] }); stools.push({ p: [st.x + (st.ax === 'z' ? 1.6 : -0.7), 0.28, st.z + (st.ax === 'z' ? -0.7 : 1.6)], s: [0.45, 0.45, 0.45] }) }
      const f = st.ax === 'z' ? [1, 0] : [0, 1]
      stalk.push({ p: [st.x + f[0] * (L[0] / 2 + 0.4), 2.1, st.z + f[1] * (L[1] / 2 + 0.4)], s: st.ax === 'z' ? [0.05, 0.5, 2.4] : [2.4, 0.5, 0.05], k: st.kind, ax: st.ax, i })
    })
    const tall = buildings.filter((b) => b.h > 18 && b.signs.length).slice(0, 18)
    tall.forEach((b, i) => {
      const f = b.signs[0].face, [ry, nx, nz] = FACE[f], off = signOff(b, f), w = Math.min(signW(b, f), 12)
      const cx = b.x + nx * (off - 0.4), cz = b.z + nz * (off - 0.4)
      bb.push({ p: [cx, b.h + 3.4, cz], w, ry, ad: i % ADS.length })
      bbLeg.push({ p: [cx, b.h + 1.2, cz], s: [w * 0.8, 2.4, 0.2] })
    })
    return { curbs, zebra, median, shrub, pole, head, stools, bb, bbLeg, stalk }
  }, [])
  const adTex = useMemo(() => signAtlas(ADS), [])
  const kindTex = useMemo(() => signAtlas(STALL_KINDS.map(([t, c]) => [t, c, '#ffffff'])), [])
  const bbGeo = useMemo(() => {
    const list = d.bb.map((b) => { const g = new THREE.PlaneGeometry(b.w, b.w / 4), uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setY(i, 1 - (b.ad + 1) / ADS.length + uv.getY(i) / ADS.length); g.rotateY(b.ry); g.translate(...b.p); return g })
    return list.length ? mergeGeometries(list) : null
  }, [d])
  const stalkGeo = useMemo(() => {
    const N = STALL_KINDS.length
    const list = d.stalk.map((b) => { const g = new THREE.PlaneGeometry(b.ax === 'z' ? b.s[2] : b.s[0], 0.5), uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setY(i, 1 - (b.k + 1) / N + uv.getY(i) / N); g.rotateY(b.ax === 'z' ? Math.PI / 2 : 0); g.translate(...b.p); return g })
    return list.length ? mergeGeometries(list) : null
  }, [d])
  // lamps: 3 lamps per head, red/green/yellow, brightness follows the shared signal clock
  const lamps = useMemo(() => {
    const L = { rx: [], gx: [], yx: [], rz: [], gz: [], yz: [] }
    d.head.forEach((h) => { L['r' + h.ax].push({ p: [h.x, 4.95, h.z], s: [0.4, 0.34, 0.6] }); L['y' + h.ax].push({ p: [h.x, 4.5, h.z], s: [0.4, 0.34, 0.6] }); L['g' + h.ax].push({ p: [h.x, 4.05, h.z], s: [0.4, 0.34, 0.6] }) })
    return L
  }, [d])
  const M = useMemo(() => ({
    r: mat('#ff2a2a', { emissive: '#ff0000', emissiveIntensity: 0.1 }), g: mat('#2aff6a', { emissive: '#00ff40', emissiveIntensity: 0.1 }), y: mat('#ffd400', { emissive: '#ffcc00', emissiveIntensity: 0.1 }),
    r2: mat('#ff2a2b', { emissive: '#ff0000', emissiveIntensity: 0.1 }), g2: mat('#2aff6b', { emissive: '#00ff40', emissiveIntensity: 0.1 }), y2: mat('#ffd401', { emissive: '#ffcc00', emissiveIntensity: 0.1 }),
  }), [])
  const last = useRef('')
  useFrame(() => {
    const sx = signalState('x'), sz = signalState('z'), key = sx + sz
    if (key === last.current) return
    last.current = key
    const on = (v) => (v ? 2.2 : 0.08)
    M.r.emissiveIntensity = on(sx === 'r'); M.g.emissiveIntensity = on(sx === 'g'); M.y.emissiveIntensity = on(sx === 'y')
    M.r2.emissiveIntensity = on(sz === 'r'); M.g2.emissiveIntensity = on(sz === 'g'); M.y2.emissiveIntensity = on(sz === 'y')
  }, -5)
  void SIG
  return (
    <>
      <Inst geo={BOX} mat={mat('#d6d0c4')} items={d.curbs} />
      <Inst geo={BOX} mat={mat('#f2f2f2')} items={d.zebra} />
      <Inst geo={BOX} mat={mat('#ffffff')} items={d.median} shadow />
      <Inst geo={ICO} mat={mat('#2f7d32')} items={d.shrub} />
      <Inst geo={BOX} mat={mat('#2b2f36')} items={d.pole} />
      <Inst geo={BOX} mat={mat('#15181d')} items={d.head} />
      <Inst geo={BOX} mat={M.r} items={lamps.rx} /><Inst geo={BOX} mat={M.g} items={lamps.gx} /><Inst geo={BOX} mat={M.y} items={lamps.yx} />
      <Inst geo={BOX} mat={M.r2} items={lamps.rz} /><Inst geo={BOX} mat={M.g2} items={lamps.gz} /><Inst geo={BOX} mat={M.y2} items={lamps.yz} />
      <Inst geo={CYL} mat={mat('#c0392b')} items={d.stools} />
      {stalkGeo && <mesh geometry={stalkGeo}><meshBasicMaterial map={kindTex} toneMapped={false} side={THREE.DoubleSide} /></mesh>}
      {bbGeo && <mesh geometry={bbGeo}><meshBasicMaterial map={adTex} toneMapped={false} side={THREE.DoubleSide} /></mesh>}
      <Inst geo={BOX} mat={mat('#4a4f57')} items={d.bbLeg} />
    </>
  )
}

function Roads() {
  const dashes = useMemo(() => {
    const out = []
    ROADS.forEach((r) => {
      for (let a = -256; a <= 256; a += 7) {
        if (ROADS.some((q) => Math.abs(a - q) < RW / 2 + 2)) continue
        if (r === 0) { out.push({ p: [a, 0.06, r], s: [3, 0.04, 0.22] }) } else if (MIDS.every((m) => Math.abs(a - m) > 6)) { out.push({ p: [a, 0.06, r + 0.9], s: [3, 0.04, 0.12] }) }
        if (r !== 0) { /* median instead of a dashed centre line */ } else out.push({ p: [r, 0.06, a], s: [0.22, 0.04, 3] })
      }
    })
    return out
  }, [])
  const zebra = useMemo(() => {
    const out = []
    ROADS.forEach((cx) => ROADS.forEach((cz) => {
      for (let k = -6; k <= 6; k += 1.7) {
        ;[-1, 1].forEach((sg) => {
          out.push({ p: [cx + sg * 9, 0.06, cz + k], s: [3, 0.04, 0.8] })
          out.push({ p: [cx + k, 0.06, cz + sg * 9], s: [0.8, 0.04, 3] })
        })
      }
    }))
    return out
  }, [])
  return (
    <>
      {ROADS.map((r) => (
        <group key={r}>
          <mesh geometry={PLANE} material={asphalt} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, r]} scale={[560, RW, 1]} receiveShadow />
          <mesh geometry={PLANE} material={asphalt} rotation={[-Math.PI / 2, 0, 0]} position={[r, 0.035, 0]} scale={[RW, 560, 1]} receiveShadow />
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
      <StreetLife />
      <Dhaka />
      <Landmarks />
      <Inst geo={BOX} mat={mat('#4a4f57')} items={poles} />
      <Inst geo={BOX} mat={mat('#fff1b0', { emissive: '#ffd966', emissiveIntensity: 1.6 })} items={heads} />
    </>
  )
}
