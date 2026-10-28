// Static city data (seeded), collision helpers.
export const ROADS = [-160, -80, 0, 80, 160]
export const RW = 14
export const LIM = 248
export const BX = [[-250, -167], [-153, -87], [-73, -7], [7, 73], [87, 153], [167, 250]]
const NB = BX.length

const PAL = ['#d8b48a', '#e3c9a8', '#c07a52', '#e9dcc0', '#9fb28a', '#cf8a73', '#8fa8bc', '#dba5a0', '#bfb5a3', '#e1b94f']
export const SIGNS = ['রহিম স্টোর', 'ঢাকা বিরিয়ানি হাউস', 'মা মিষ্টান্ন ভাণ্ডার', 'চাচার চা স্টল', 'সোনার বাংলা ফার্মেসি', 'কাচ্চি ঘর', 'ফুচকা কর্নার', 'আপন মোবাইল সেন্টার', 'হাজীর দোকান', 'বাপের দেশ ক্যাফে', 'নতুন বাজার', 'বিসমিল্লাহ হোটেল', 'তারা মনি টেইলার্স', 'জমজম ইলেকট্রনিক্স', 'পদ্মা বুক স্টল', 'মেঘনা ফ্যাশন', 'যমুনা ডিপার্টমেন্টাল', 'রূপসী বাংলা সেলুন']
export const SCOL = [['#006a4e', '#ffffff'], ['#f42a41', '#fff7d6'], ['#ffb703', '#1b1b1b'], ['#1d3557', '#ffe8a3'], ['#7b2cbf', '#ffffff'], ['#0b7285', '#ffffff']]

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry(7)

export const rects = [] // building colliders {x0,x1,z0,z1,h}
export const circles = [] // tree/lamp/pillar colliders
export const buildings = []
export const slabs = []
export const trees = []
export const lamps = []
export const stalls = []  // street-market stalls
export const wires = []   // overhead cables between lamp poles
export const METRO_X = 0  // elevated metro-rail runs down the x=0 avenue
export const bridges = [  // pedestrian foot-over-bridges (rot 0 spans along z, PI/2 along x)
  { x: -40, z: 0, rot: 0 }, { x: 120, z: 80, rot: 0 }, { x: -120, z: 160, rot: 0 }, { x: 40, z: -160, rot: 0 },
  { x: 80, z: -40, rot: Math.PI / 2 }, { x: -80, z: 120, rot: Math.PI / 2 }, { x: 160, z: 40, rot: Math.PI / 2 },
]
const bridgeBoxes = bridges.map((b) => (b.rot ? { x0: b.x - 19, x1: b.x + 19, z0: b.z - 2.4, z1: b.z + 2.4 } : { x0: b.x - 2.4, x1: b.x + 2.4, z0: b.z - 19, z1: b.z + 19 }))

export const PADS = [
  { id: 'boss', x: 27, z: 40, color: '#f42a41', label: 'ট্রাফিক বস' },
  { id: 'race', x: 53, z: 40, color: '#ffb703', label: 'রিকশা রেসার' },
  { id: 'chase', x: 40, z: 58, color: '#3a86ff', label: 'পুলিশ চেজ' },
  { id: 'cng', x: 40, z: 22, color: '#ff7b00', label: 'অটো ধর' },
]
export const FLAG = { x: 40, z: 40 }
circles.push({ x: FLAG.x, z: FLAG.z, r: 6.6 }) // Shapla fountain
for (let x = -320; x <= 250; x += 22) if (ROADS.every((r) => Math.abs(x - r) > 8)) circles.push({ x, z: -80, r: 0.9 }) // expressway piers
for (let z = -250; z <= 250; z += 20) if (ROADS.every((r) => Math.abs(z - r) > 8)) circles.push({ x: METRO_X, z, r: 1.2 }) // metro pillars
bridges.forEach((b) => { // foot-bridge pillars
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const o = [sx * 1.0, sz * 9]
    circles.push(b.rot ? { x: b.x + o[1], z: b.z + o[0], r: 0.5 } : { x: b.x + o[0], z: b.z + o[1], r: 0.5 })
  }
})

const STALL_COL = ['#e63946', '#2a9d8f', '#f4a261', '#118ab2', '#ffb703', '#8338ec', '#06d6a0', '#ef476f']
const GOODS = ['#ff7b00', '#d62828', '#7bc043', '#ffd23f', '#9d4edd', '#ff9fb2']

BX.forEach(([x0, x1], i) =>
  BX.forEach(([z0, z1], j) => {
    const plaza = i === 3 && j === 3
    slabs.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, plaza })

    // trees, lamps, wires and market stalls along each side that borders a road
    const sides = [
      i > 0 && { ax: 'z', fixed: x0 + 1.4, a0: z0, a1: z1, edge: x0 },
      i < NB - 1 && { ax: 'z', fixed: x1 - 1.4, a0: z0, a1: z1, edge: x1 },
      j > 0 && { ax: 'x', fixed: z0 + 1.4, a0: x0, a1: x1, edge: z0 },
      j < NB - 1 && { ax: 'x', fixed: z1 - 1.4, a0: x0, a1: x1, edge: z1 },
    ].filter(Boolean)
    sides.forEach((sd) => {
      let k = 0, prev = null
      const inward = sd.edge === (sd.ax === 'z' ? x0 : z0) ? 1 : -1
      for (let a = sd.a0 + 14; a < sd.a1 - 12; a += 15, k++) {
        const x = sd.ax === 'z' ? sd.fixed : a
        const z = sd.ax === 'z' ? a : sd.fixed
        if (k % 2 === 0) { trees.push({ x, z, s: 0.85 + rnd() * 0.5 }); circles.push({ x, z, r: 0.6 }) }
        else {
          lamps.push({ x, z }); circles.push({ x, z, r: 0.3 })
          if (prev) wires.push({ x1: prev.x, z1: prev.z, x2: x, z2: z })
          prev = { x, z }
        }
      }
      if (plaza) return
      // market stalls: shaded tarp over a table of fruit / cloth, 3m in from the kerb
      for (let a = sd.a0 + 10; a < sd.a1 - 8; a += 8 + rnd() * 6) {
        if (rnd() < 0.4) continue
        const off = sd.edge + inward * 3.4
        const sx = sd.ax === 'z' ? off : a, sz = sd.ax === 'z' ? a : off
        if (ROADS.some((r) => (sd.ax === 'z' ? Math.abs(a - r) : Math.abs(a - r)) < RW / 2 + 5)) continue
        stalls.push({ x: sx, z: sz, ax: sd.ax, tarp: STALL_COL[Math.floor(rnd() * STALL_COL.length)], goods: GOODS[Math.floor(rnd() * GOODS.length)] })
        circles.push({ x: sx, z: sz, r: 1.0 })
      }
    })

    if (plaza) {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2
        const x = 40 + Math.cos(a) * 21, z = 40 + Math.sin(a) * 21
        trees.push({ x, z, s: 1 + rnd() * 0.4 }); circles.push({ x, z, r: 0.6 })
      }
      circles.push({ x: FLAG.x, z: FLAG.z, r: 0.7 })
      return
    }

    const ax0 = x0 + 4, ax1 = x1 - 4, az0 = z0 + 4, az1 = z1 - 4
    const cw = (ax1 - ax0) / 3, cd = (az1 - az0) / 3
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) {
        const w = cw - 2 - rnd() * 2.5, d = cd - 2 - rnd() * 2.5
        const x = ax0 + cw * (a + 0.5), z = az0 + cd * (b + 0.5)
        const faces = []
        if (a === 0 && i > 0) faces.push('-x')
        if (a === 2 && i < NB - 1) faces.push('+x')
        if (b === 0 && j > 0) faces.push('-z')
        if (b === 2 && j < NB - 1) faces.push('+z')
        const shop = faces.length > 0
        const center = a === 1 && b === 1
        const h = shop ? 7 + rnd() * 6 : center ? 22 + rnd() * 20 : 12 + rnd() * 24
        const r1 = rnd(), r2 = rnd(), r3 = rnd() // keep the seeded sequence identical whether or not we place the building
        if (bridgeBoxes.some((q) => x + w / 2 > q.x0 && x - w / 2 < q.x1 && z + d / 2 > q.z0 && z - d / 2 < q.z1)) continue // keep foot-bridge stairs clear
        buildings.push({
          x, z, w, d, h,
          color: Math.floor(r1 * PAL.length),
          roof: r2 < 0.55,
          signs: faces.map((f) => ({ face: f, idx: Math.floor(r3 * SIGNS.length) })),
        })
        rects.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h })
      }
  })
)
export const PALETTE = PAL

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export function resolve(p, r) {
  for (const q of rects) {
    if (p.x < q.x0 - r || p.x > q.x1 + r || p.z < q.z0 - r || p.z > q.z1 + r) continue
    const cx = clamp(p.x, q.x0, q.x1), cz = clamp(p.z, q.z0, q.z1)
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz
    if (d2 >= r * r) continue
    if (d2 > 1e-6) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k }
    else {
      const l = p.x - q.x0, rr = q.x1 - p.x, t = p.z - q.z0, b = q.z1 - p.z, m = Math.min(l, rr, t, b)
      if (m === l) p.x = q.x0 - r; else if (m === rr) p.x = q.x1 + r; else if (m === t) p.z = q.z0 - r; else p.z = q.z1 + r
    }
  }
  for (const c of circles) {
    const dx = p.x - c.x, dz = p.z - c.z, rr = r + c.r
    if (dx > rr || dx < -rr || dz > rr || dz < -rr) continue
    const d2 = dx * dx + dz * dz
    if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d; p.x += dx * k; p.z += dz * k }
  }
  p.x = clamp(p.x, -LIM, LIM); p.z = clamp(p.z, -LIM, LIM)
}

export const onRoad = (x, z) => ROADS.some((r) => Math.abs(x - r) < RW / 2 || Math.abs(z - r) < RW / 2)
export const gY = (x, z) => (onRoad(x, z) ? 0 : 0.12)

export function camBlocked(x, y, z) {
  for (const q of rects) if (x > q.x0 - 0.4 && x < q.x1 + 0.4 && z > q.z0 - 0.4 && z < q.z1 + 0.4 && y < q.h + 0.5) return true
  return false
}
