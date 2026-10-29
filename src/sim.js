import { hud, toast, addXp, addChaos, addDamage, news, recordBest, saveNow, bn, memeLine, taka } from './store'
import { LINES } from './lines'
import { Q } from './quality'
import { ROADS, BX, resolve, gY, PADS, lamps, trees, SIG, signalState, districtAt, stalls } from './world'
import { sfx, siren, crowdLoop, engine } from './audio'

const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const angLerp = (a, b, t) => a + ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * t

export const G = {
  x: 40, y: 0.12, z: 46, vx: 0, vz: 0, vy: 0, grounded: true, face: Math.PI, spd: 0,
  yaw: 0, pitch: 0.38, keys: {}, jump: false, interact: false, noLock: false,
  stun: 0, mode: 'foot', t: 0, heat: 0, wantedShown: 0,
  mission: null, cps: [], cpi: 0, cops: [], rivals: [], target: null,
  vehicles: [], npcs: [], cdNpc: 0,
  hp: 100, mob: 0, crowd: [], crowdCd: 0, crowdAge: 0, crowdHit: 0, lastHurt: 0, punch: false, punchCd: 0, punchT: 0, joy: { x: 0, y: 0 }, fx: [], cng: null,
  ride: null, lookT: 0, horn: false,
  officers: [], vendors: [], copAlert: 0, bustCd: 0, menuOpen: false,
}

export const MISSIONS = {
  boss: { title: 'ট্রাফিক বস', time: 70, intro: 'সব চেকপয়েন্টে সময়মতো পৌঁছাও — রাস্তা এখন তোমার!' },
  race: { title: 'রিকশা রেসার', time: 60, intro: 'রিকশা নিয়ে সবাইকে হারিয়ে দাও!' },
  chase: { title: 'পুলিশ চেজ', time: 70, intro: 'পুলিশ মামা পিছনে! গোপন আড্ডায় পৌঁছাও!' },
  chanda: { title: 'ফুটপাত চাঁদা কালেকশন', time: 150, intro: 'বাজারের ৫ দোকানে ঘুরে ভার্চুয়াল চাঁদা তোলো — তবে বেশি তাণ্ডব করলে পুলিশ মামা আসবে!' },
  cng: { title: 'অটো ধর', time: 100, intro: 'ভাড়া নিয়ে ঝগড়া! বদমেজাজি অটোওয়ালা পালাচ্ছে — দৌড়ে ধরে ঘুষি মেরে থামাও!' },
}
const BOSS = [[0, 40], [0, -40], [-40, 0], [-80, 40], [-40, 80], [40, 80]]
const RACE = [[80, 0], [80, 80], [0, 80], [0, 0], [80, 0], [80, 40]]
const HIDE = [-80, -80]
export const HIDEOUT = HIDE

// drivable vehicle specs: top speed, reverse, acceleration, steering rate, half length/width, chase-cam distance
const SPEC = {
  car: { label: 'গাড়ি', max: 24, rev: -8, acc: 15, turn: 2.1, hl: 2.2, hw: 1.0, cam: 8.5 },
  bus: { label: 'BRTC বাস', max: 16, rev: -5, acc: 7, turn: 1.25, hl: 4.7, hw: 1.4, cam: 13, hide: true },
  ezy: { label: 'ইজি-বাইক', max: 15, rev: -5, acc: 10, turn: 2.5, hl: 1.4, hw: 0.75, cam: 7.5 },
  bike: { label: 'মোটরবাইক', max: 30, rev: -4, acc: 18, turn: 3.0, hl: 1.0, hw: 0.45, cam: 6.5 },
  rick: { label: 'রিকশা', max: 9, rev: -3, acc: 5, turn: 2.3, hl: 1.5, hw: 0.7, cam: 7 },
  taxi: { label: 'হলুদ ট্যাক্সি', max: 23, rev: -8, acc: 14, turn: 2.1, hl: 2.2, hw: 1.0, cam: 8.5 },
  van: { label: 'ডেলিভারি ভ্যান', max: 19, rev: -6, acc: 9, turn: 1.7, hl: 2.5, hw: 1.0, cam: 9.5 },
  scooter: { label: 'স্কুটার', max: 24, rev: -4, acc: 14, turn: 3.2, hl: 1.0, hw: 0.4, cam: 6.5 },
}
const VT = SPEC
const CARCOL = ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#e9c46a', '#8d99ae', '#fb8500', '#6a4c93', '#f1faee']
const BUSCOL = ['#d62828', '#d62828', '#c1121f'] // BRTC red
const EZYCOL = ['#1b9e5a', '#1b9e5a', '#16a34a'] // green battery auto
const BIKECOL = ['#ff7b00', '#ff7b00', '#ff7b00', '#e63946'] // orange dirt bikes
const SCOOTCOL = ['#ff5d8f', '#4cc9f0', '#f1f1f1', '#8338ec', '#06d6a0']
const RICKCOL = ['#e63946', '#ffb703', '#06d6a0', '#118ab2', '#ef476f', '#8338ec']
const NPCCOL = ['#e76f51', '#2a9d8f', '#264653', '#e9c46a', '#8338ec', '#ffffff', '#06d6a0', '#f4a261']

// ---------- init ----------
function initWorld() {
  let n = 0
  ROADS.forEach((r) => {
    ;['x', 'z'].forEach((ax) => {
      ;[1, -1].forEach((dir) => {
        // left-hand traffic
        const off = ax === 'x' ? (dir > 0 ? r - 3.2 : r + 3.2) : dir > 0 ? r + 3.2 : r - 3.2
        const speed = rnd(5, 8.5), ph = Math.random() * 113
        for (let k = 0; k < Q.vehPerLane; k++) {
          const KINDS = ['rick', 'car', 'ezy', 'rick', 'bus', 'bike', 'taxi', 'ezy', 'van', 'rick', 'scooter', 'car']
          const type = KINDS[(n + k) % KINDS.length]
          const sp = VT[type]
          G.vehicles.push({
            ax, dir, off, speed, type, s: -255 + ((ph + k * 173) % 510), parked: false, player: false, parkT: 0,
            color: type === 'bus' ? pick(BUSCOL) : type === 'rick' ? pick(RICKCOL) : type === 'ezy' ? pick(EZYCOL) : type === 'bike' ? pick(BIKECOL) : type === 'scooter' ? pick(SCOOTCOL) : type === 'taxi' ? '#f2c200' : type === 'van' ? '#f4f4f0' : pick(CARCOL),
            hx: ax === 'x' ? sp.hl : sp.hw, hz: ax === 'x' ? sp.hw : sp.hl,
            x: 0, z: 0, ry: 0, vx: ax === 'x' ? dir * speed : 0, vz: ax === 'z' ? dir * speed : 0, cd: 0,
          })
        }
        n++
      })
    })
  })
  G.vehicles.forEach((v) => placeVeh(v))
  G.vehicles.forEach((v) => { v.lane = G.vehicles.filter((u) => u.ax === v.ax && u.dir === v.dir && u.off === v.off && !u.player) })

  for (let k = 0; k < Q.npcCount; k++) {
    let i, j, side
    do { i = Math.floor(Math.random() * BX.length); j = Math.floor(Math.random() * BX.length); side = Math.floor(Math.random() * 4) }
    while ((side === 0 && i === 0) || (side === 1 && i === BX.length - 1) || (side === 2 && j === 0) || (side === 3 && j === BX.length - 1))
    const [x0, x1] = BX[i], [z0, z1] = BX[j]
    const ax = side < 2 ? 'z' : 'x'
    const c = [x0 + 1.6, x1 - 1.6, z0 + 1.6, z1 - 1.6][side]
    const a0 = (ax === 'z' ? z0 : x0) + 3, a1 = (ax === 'z' ? z1 : x1) - 3
    const a = rnd(a0, a1)
    G.npcs.push({ ax, c, a0, a1, a, dir: Math.random() < 0.5 ? 1 : -1, speed: rnd(1.1, 1.8), scare: 0, color: pick(NPCCOL), x: 0, z: 0, ry: 0, moving: true })
  }
  G.npcs.forEach((p) => placeNpc(p))
  initPolice()
}

const VCOL = ['#e9c46a', '#ffffff', '#8ecae6', '#f4a261', '#b5e48c', '#ffb4a2']
function initPolice() {
  // traffic police direct junctions; patrol officers walk the footpaths; vendors stand behind the nearest market stalls
  const J = Q.mobile ? [[0, 0], [80, 80], [0, 80]] : [[0, 0], [80, 0], [0, 80], [80, 80], [-80, 0], [80, -80]]
  J.forEach(([cx, cz], i) => {
    const x = cx + (i % 2 ? -11.5 : 11.5), z = cz + 11.5
    G.officers.push({ kind: 'traffic', st: 'point', x, z, hx: x, hz: z, ry: Math.atan2(cx - x, cz - z), hry: Math.atan2(cx - x, cz - z), t: i * 1.7, react: 0, whistleT: -99 })
  })
  for (let k = 0; k < (Q.mobile ? 3 : 6); k++) {
    let i, j, side
    do { i = Math.floor(Math.random() * BX.length); j = Math.floor(Math.random() * BX.length); side = Math.floor(Math.random() * 4) }
    while ((side === 0 && i === 0) || (side === 1 && i === BX.length - 1) || (side === 2 && j === 0) || (side === 3 && j === BX.length - 1))
    const [x0, x1] = BX[i], [z0, z1] = BX[j]
    const ax = side < 2 ? 'z' : 'x'
    const c = [x0 + 2.6, x1 - 2.6, z0 + 2.6, z1 - 2.6][side]
    const a0 = (ax === 'z' ? z0 : x0) + 4, a1 = (ax === 'z' ? z1 : x1) - 4
    const o = { kind: 'patrol', st: 'walk', ax, c, a0, a1, a: rnd(a0, a1), dir: Math.random() < 0.5 ? 1 : -1, speed: 1.3, x: 0, z: 0, ry: 0, t: k * 2.3, react: 0, whistleT: -99 }
    placeNpc(o); G.officers.push(o)
  }
  const pad = PADS.find((p) => p.id === 'chanda')
  stalls.map((s, idx) => ({ s, idx, d: Math.hypot(s.x - pad.x, s.z - pad.z) })).sort((a, b) => a.d - b.d).slice(0, Q.mobile ? 12 : 24).forEach(({ s, idx }) => {
    const per = s.inward, z = s.ax === 'z'
    G.vendors.push({ sx: s.x, sz: s.z, x: z ? s.x + per * 1.3 : s.x, z: z ? s.z : s.z + per * 1.3, ry: Math.atan2(z ? -per : 0, z ? 0 : -per), idx, active: false, done: false, scare: 0, color: VCOL[idx % VCOL.length], kind: s.kind })
  })
}

function placeVeh(v) {
  if (v.ax === 'x') { v.x = v.s; v.z = v.off; v.ry = v.dir > 0 ? Math.PI / 2 : -Math.PI / 2 }
  else { v.z = v.s; v.x = v.off; v.ry = v.dir > 0 ? 0 : Math.PI }
}
function placeNpc(p) {
  if (p.ax === 'x') { p.x = p.a; p.z = p.c; p.ry = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2 }
  else { p.z = p.a; p.x = p.c; p.ry = p.dir > 0 ? 0 : Math.PI }
}
initWorld()

// ---------- game flow ----------
export function resetGame() {
  Object.assign(G, { x: 40, y: 0.12, z: 46, vx: 0, vz: 0, vy: 0, grounded: true, face: Math.PI, spd: 0, yaw: 0, pitch: 0.38, stun: 0, mode: 'foot', heat: 0, wantedShown: 0, mission: null, cps: [], cpi: 0, cops: [], rivals: [], target: null, hp: 100, mob: 0, crowd: [], crowdCd: 0, cng: null, punchT: 0, fx: [], ride: null, copAlert: 0, bustCd: 0, menuOpen: false })
  G.officers = G.officers.filter((o) => o.kind !== 'raid'); G.vendors.forEach((v) => { v.active = false; v.done = false })
  G.vehicles.forEach((v) => { if (v.player || v.parked) respawnVeh(v, rnd(-250, 250)) })
  siren(false); crowdLoop(false); engine(null)
  hud.set({ ride: null, speed: 0, meme: null, hp: 100, mob: 0, news: null, wanted: 0, mission: null, obj: '', left: 0, prompt: '', result: null, toasts: [], menu: null, cm: null })
}

export function startMission(id) {
  const m = MISSIONS[id]
  if (id === 'race' && G.ride) leaveRide()
  G.mission = { id, t: 0, left: m.time, cd: 0, lastObj: '' }
  G.cpi = 0; G.stun = 0; G.vx = G.vz = 0
  if (id === 'boss') G.cps = BOSS
  if (id === 'race') {
    G.mode = 'rick'; G.cps = RACE
    G.x = 34; G.z = 0; G.face = Math.PI / 2; G.yaw = -Math.PI / 2; G.y = 0
    G.mission.cd = 3.2
    G.rivals = [-4, 4].map((z, k) => ({ x: 34, z, ry: Math.PI / 2, idx: 0, speed: 9.2 + k * 1.1, done: false, color: k ? '#06d6a0' : '#8338ec' }))
  }
  if (id === 'cng') {
    G.cng = { x: 0, z: 0, ry: 0, from: [0, 0], to: [0, 0], hp: 6, halt: 0, speed: 7.2 }
    G.cng.to = nextNode(G.cng); G.cps = [[0, 0]]
    toast('অটোওয়ালা: “মিটারে যামু না!” বলে পালাইছে!', 'mission')
  }
  if (id === 'chase') {
    G.cps = [HIDE]; G.heat = 3; siren(true)
    G.cops = [[80, 40], [40, 80], [80, 80]].map(([x, z]) => ({ x, z, ry: 0, nudge: 0, side: Math.random() < 0.5 ? 1 : -1 }))
  }
  if (id === 'chanda') {
    const pad = PADS.find((p) => p.id === 'chanda'), chosen = []
    G.vendors.forEach((v) => { v.active = false; v.done = false; v.scare = 0 })
    for (const v of G.vendors.slice().sort((a, b) => Math.hypot(a.sx - pad.x, a.sz - pad.z) - Math.hypot(b.sx - pad.x, b.sz - pad.z))) {
      if (chosen.every((c) => Math.hypot(c.sx - v.sx, c.sz - v.sz) > 14)) chosen.push(v)
      if (chosen.length >= 5) break
    }
    chosen.forEach((v, i) => { v.active = true; v.ci = i })
    Object.assign(G.mission, { cash: 0, cm: 0, done: 0, total: chosen.length, alarm: false, escape: 0 })
    G.cps = chosen.map((v) => [v.sx, v.sz])
    memeLine('start', true)
  }
  hud.set({ mission: { id, title: m.title }, left: m.time, obj: '', prompt: '', wanted: id === 'chase' ? 3 : hud.get().wanted })
  toast(m.intro, 'mission')
}

function end(ok, msg, xp, chaos) {
  const m = G.mission
  siren(false); sfx(ok ? 'win' : 'fail'); memeLine(ok ? 'win' : 'fail', true)
  if (ok) { addXp(xp); if (chaos) addChaos(chaos); recordBest(m.id, m.t) } else addXp(10)
  hud.set({ result: { ok, id: m.id, title: MISSIONS[m.id].title, msg, xp: ok ? Math.round(xp) : 10, chaos: ok ? chaos : 0, time: m.t }, mission: null, left: 0, obj: '', wanted: 0, prompt: '' })
  Object.assign(G, { mission: null, cps: [], cops: [], rivals: [], cng: null, mode: G.ride ? 'ride' : 'foot', heat: 0, wantedShown: 0, stun: 0, target: null })
  G.noPauseUntil = performance.now() + 500 // ignore the unlock event this triggers
  G.officers = G.officers.filter((o) => o.kind !== 'raid'); G.menuOpen = false; G.vendors.forEach((v) => { v.active = false })
  hud.set({ menu: null, cm: null })
  document.exitPointerLock?.()
}

function addHeat(h) { G.heat = Math.min(5.99, G.heat + h); if (h >= 0.3) G.copAlert = Math.max(G.copAlert, 5) }

// ---------- step ----------
export function step(dt) {
  const st = hud.get()
  if (st.phase !== 'play' || st.result) return
  dt = Math.min(dt, 0.05)
  G.t += dt; SIG.t += dt
  vehicles(dt); npcs(dt); player(dt); officers(dt); crowd(dt); mission(dt); wanted(dt); syncMeters()
  G.jump = false; G.interact = false; G.punch = false; G.horn = false
}

function vehicles(dt) {
  for (const v of G.vehicles) {
    if (v.player) { v.braking = false; continue }
    if (v.parked) { v.braking = false // left behind by the player: a roadblock for a while, then back into circulation
      v.cd -= dt; v.parkT += dt
      if (v.parkT > 40 && Math.hypot(v.x - G.x, v.z - G.z) > 70) respawnVeh(v, v.dir > 0 ? -255 : 255)
      continue
    }
    if (v.halt > 0) { v.halt -= dt; v.cd -= dt; continue } // punched: stuck in a jam
    v.braking = stopHere(v)
    if (v.braking) { v.cd -= dt; continue }
    v.s += v.dir * v.speed * dt
    if (v.s > 258) v.s -= 516
    else if (v.s < -258) v.s += 516
    v.cd -= dt
    placeVeh(v)
  }
}

// obey junction signals and queue politely behind a stopped leader (brake lights come on while v.braking)
function stopHere(v) {
  const sg = signalState(v.ax)
  if (sg !== 'g') for (const c of ROADS) { const d = (c - v.s) * v.dir; if (d > 8.4 && d < 8.4 + v.speed * 0.12 + 0.6) return true }
  for (const u of v.lane) {
    if (u === v || !u.braking) continue
    const gap = (((u.s - v.s) * v.dir) % 516 + 516) % 516
    if (gap < VT[u.type].hl + VT[v.type].hl + 1.6) return true
  }
  return false
}

function npcs(dt) {
  G.cdNpc -= dt
  for (const p of G.npcs) {
    p.scare -= dt
    if (p.down > 0) { p.down -= dt; continue } // knocked flat
    const sp = p.speed * (p.scare > 0 ? 3 : 1)
    p.a += p.dir * sp * dt
    if (p.a > p.a1) { p.a = p.a1; p.dir = -1 } else if (p.a < p.a0) { p.a = p.a0; p.dir = 1 }
    placeNpc(p)
  }
}

const NPC_LINES = ['আরে ভাই কী করেন!', 'পুলিশ ডাকমু কিন্তু!', 'চাচা, এইডা কী হইল!', 'ওরে বাবা! সরেন সরেন!', 'মিয়া ভাই, আস্তে!', 'এই ছেলে, বাপের দেশে এমন করে?']

function player(dt) {
  if (G.ride) {
    drive(dt)
    G.punchCd -= dt; G.punchT = Math.max(0, G.punchT - dt)
    interact()
    return
  }
  const k = G.keys
  const rick = G.mode === 'rick'
  let ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
  let iz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
  const jx = Math.abs(G.joy.x) > 0.15 ? G.joy.x : 0, jy = Math.abs(G.joy.y) > 0.15 ? G.joy.y : 0
  ix = Math.max(-1, Math.min(1, ix + jx)); iz = Math.max(-1, Math.min(1, iz + jy))
  if (G.stun > 0) { G.stun -= dt; ix = iz = 0 }
  if (G.menuOpen) { ix = iz = 0; G.vx = G.vz = 0 }
  if (G.mission && G.mission.cd > 0) ix = iz = 0
  const s = Math.sin(G.yaw), c = Math.cos(G.yaw)
  let dx = ix * c - iz * s, dz = -ix * s - iz * c
  const len = Math.hypot(dx, dz), moving = len > 0.01
  if (moving) { dx /= len; dz /= len }
  const sprint = k.ShiftLeft || k.ShiftRight || Math.hypot(jx, jy) > 0.9
  const maxV = rick ? 12.5 : sprint ? 8.8 : 4.2
  const acc = 1 - Math.exp(-(rick ? 2.2 : 10) * dt)
  G.vx += ((moving ? dx * maxV : 0) - G.vx) * acc
  G.vz += ((moving ? dz * maxV : 0) - G.vz) * acc
  G.x += G.vx * dt; G.z += G.vz * dt
  const pr = rick ? 1.1 : 0.45
  resolve(G, pr)

  // vehicles
  for (const v of G.vehicles) {
    if (v.player) continue
    const ddx = G.x - v.x, ddz = G.z - v.z
    const px = v.hx + pr - Math.abs(ddx), pz = v.hz + pr - Math.abs(ddz)
    if (px > 0 && pz > 0 && G.y < 2) {
      if (px < pz) G.x += Math.sign(ddx || 1) * px; else G.z += Math.sign(ddz || 1) * pz
      if (!v.parked && G.stun <= 0 && v.cd <= 0) {
        v.cd = 1.5
        if (rick) { G.vx *= -0.3; G.vz *= -0.3; G.stun = 0.3 } else { G.vx = v.vx * 0.7; G.vz = v.vz * 0.7; G.stun = 0.8 }
        addHeat(0.6)
        toast(pick(['ধুর! গাড়ি ধাক্কা দিল!', 'আরে! রাস্তা কি তোর বাপের?', 'উফ! হর্ন শুনিস না নাকি?']), 'bad')
        if (G.mission && G.mission.id !== 'race') G.mission.left -= 2
      }
    } else if (!v.parked && v.cd <= 0 && G.spd > 2.5) {
      const ox = Math.max(Math.abs(ddx) - v.hx, 0), oz = Math.max(Math.abs(ddz) - v.hz, 0)
      if (Math.hypot(ox, oz) < pr + 0.8) { v.cd = 2.5; sfx(v.type === 'rick' ? 'bell' : v.type === 'bus' ? 'horn' : 'honk'); addChaos(20, pick(['বাপরে বাপ! অল্পের জন্য বাঁচলাম!', 'নিয়ার মিস! কলিজা ঠান্ডা!', 'ঢাকার রাস্তায় এটাই নিয়ম!'])) }
    }
  }
  if (G.cng) {
    const dx = G.x - G.cng.x, dz = G.z - G.cng.z, d = Math.hypot(dx, dz), mn = 1.4 + pr
    if (d < mn && d > 0.01) { G.x += (dx / d) * (mn - d); G.z += (dz / d) * (mn - d) }
  }
  resolve(G, pr)

  G.punchCd -= dt; G.punchT = Math.max(0, G.punchT - dt)
  if (G.punch && !rick && G.punchCd <= 0 && G.stun <= 0 && !(G.mission && G.mission.cd > 0)) doPunch()

  if (G.jump && G.grounded && !rick && G.stun <= 0) { G.vy = 7.8; G.grounded = false; sfx('jump') }
  G.vy -= 24 * dt; G.y += G.vy * dt
  const gy = gY(G.x, G.z)
  if (G.y <= gy) { G.y = gy; G.vy = 0; G.grounded = true }
  G.spd = Math.hypot(G.vx, G.vz)
  if (G.spd > 0.5) G.face = angLerp(G.face, Math.atan2(G.vx, G.vz), 1 - Math.exp(-12 * dt))

  interact()
}

// ================= driving =================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
let lastScreech = 0

function respawnVeh(v, s) {
  const sp = SPEC[v.type]
  v.player = false; v.parked = false; v.parkT = 0; v.halt = 0
  v.hx = v.ax === 'x' ? sp.hl : sp.hw; v.hz = v.ax === 'x' ? sp.hw : sp.hl
  v.s = s; placeVeh(v)
}

function nearVehicle() {
  let best = null, bd = 2.6
  for (const v of G.vehicles) {
    if (v.player) continue
    const ox = Math.max(Math.abs(G.x - v.x) - v.hx, 0), oz = Math.max(Math.abs(G.z - v.z) - v.hz, 0)
    const d = Math.hypot(ox, oz)
    if (d < bd) { bd = d; best = v }
  }
  return best
}

function enterRide(v) {
  const sp = SPEC[v.type]
  v.player = true; v.parked = false
  G.ride = { v, type: v.type, spec: sp, sp: v.halt > 0 ? 0 : v.speed, steer: 0, crashCd: 0, hornCd: 0, cngCd: 0 }
  G.x = v.x; G.z = v.z; G.face = v.ry; G.y = 0.12; G.vx = G.vz = 0; G.vy = 0; G.grounded = true; G.mode = 'ride'
  G.yaw = G.face + Math.PI; G.lookT = -9
  hud.set({ ride: { label: sp.label }, prompt: '' })
  memeLine('enter', true)
}

function leaveRide() {
  const r = G.ride
  if (!r) return
  const v = r.v, sp = r.spec
  v.player = false; v.parked = true; v.parkT = 0; v.halt = 0
  const sn = Math.abs(Math.sin(G.face)), cs = Math.abs(Math.cos(G.face)) // axis-aligned bounds of the rotated vehicle
  v.hx = sn * sp.hl + cs * sp.hw; v.hz = cs * sp.hl + sn * sp.hw
  v.x = G.x; v.z = G.z; v.ry = G.face
  const off = sp.hw + 1.2 // step out on the left
  G.x += Math.cos(G.face) * off; G.z -= Math.sin(G.face) * off
  G.ride = null; G.mode = G.mission?.id === 'race' ? 'rick' : 'foot'
  G.vx = G.vz = 0; G.spd = 0
  resolve(G, 0.45)
  engine(null)
  hud.set({ ride: null, speed: 0 })
  memeLine('exit')
}

function horn() {
  const r = G.ride
  if (!r || r.hornCd > 0) return
  r.hornCd = 0.45
  sfx(r.type === 'bus' ? 'horn' : r.type === 'rick' || r.type === 'ezy' ? 'bell' : 'honk')
  addChaos(2)
  for (const p of G.npcs) if (p.scare <= 0 && Math.hypot(p.x - G.x, p.z - G.z) < 14) p.scare = 2.5 // pedestrians scatter
  memeLine('honk')
}

function cngHit(r, ram) {
  r.hp--; r.halt = ram ? 1.2 : 0.9; r.speed = Math.max(4.2, r.speed - 0.5)
  fx(pick(POW), r.x, 2.6, r.z, '#ff9f1c'); sfx('punch'); setTimeout(() => sfx('clang'), 70)
  addDamage(rint(4000, 12000)); addChaos(20); toast(pick(CNG_LINES), 'chaos'); memeLine('cng')
  if (r.hp <= 0) {
    sfx('crash')
    news('অটোওয়ালা ধরা!', 'যাত্রী বললেন: “ভাড়া কিন্তু মিটারে!”', true)
    end(true, 'অটো ধরা পড়ছে! ভাড়া এখন মিটারে!', 280 + Math.max(0, G.mission.left) * 2, 150)
  }
}

function drive(dt) {
  const r = G.ride, sp = r.spec, k = G.keys
  let thr = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
  let st = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
  if (Math.abs(G.joy.y) > 0.15) thr = clamp(thr + G.joy.y, -1, 1)
  if (Math.abs(G.joy.x) > 0.15) st = clamp(st + G.joy.x, -1, 1)
  if (G.stun > 0) { G.stun -= dt; thr = st = 0 }
  if (G.mission && G.mission.cd > 0) thr = st = 0
  r.hornCd -= dt; r.crashCd -= dt; r.cngCd -= dt
  if (G.punch || G.horn) horn()

  const boost = (k.ShiftLeft || k.ShiftRight) && r.type !== 'rick' && thr > 0, brake = !!k.Space
  const maxV = sp.max * (boost ? 1.35 : 1)
  if (thr > 0) r.sp += (r.sp < 0 ? sp.acc * 2.5 : sp.acc * (boost ? 1.6 : 1)) * thr * dt
  else if (thr < 0) r.sp -= (r.sp > 0.5 ? sp.acc * 2 : sp.acc * 0.6) * -thr * dt
  else r.sp -= Math.sign(r.sp) * Math.min(Math.abs(r.sp), 4 * dt)
  r.braking = brake || thr < 0
  if (brake) r.sp -= Math.sign(r.sp) * Math.min(Math.abs(r.sp), 28 * dt)
  r.sp = clamp(r.sp, sp.rev, maxV)

  r.steer += (st - r.steer) * (1 - Math.exp(-9 * dt))
  const drift = brake && Math.abs(r.sp) > 6
  G.face -= r.steer * sp.turn * Math.min(1, Math.abs(r.sp) / 5) * (r.sp >= 0 ? 1 : -1) * (drift ? 1.6 : 1) * dt
  if (drift && G.t - lastScreech > 0.7) { lastScreech = G.t; sfx('screech') }

  const fx0 = Math.sin(G.face), fz0 = Math.cos(G.face)
  G.x += fx0 * r.sp * dt; G.z += fz0 * r.sp * dt
  const hw = sp.hw, offs = [sp.hl - hw, 0, -(sp.hl - hw)] // three circles along the body
  const imp = Math.abs(r.sp)
  let ip = 0
  for (const o of offs) { // buildings, trees, pillars…
    const pt = { x: G.x + fx0 * o, z: G.z + fz0 * o }, bx = pt.x, bz = pt.z
    resolve(pt, hw)
    G.x += pt.x - bx; G.z += pt.z - bz; ip += Math.hypot(pt.x - bx, pt.z - bz)
  }
  for (const v of G.vehicles) { // other traffic and parked vehicles
    if (v === r.v) continue
    let hit = false
    for (const o of offs) {
      const cx = G.x + fx0 * o, cz = G.z + fz0 * o
      const qx = clamp(cx, v.x - v.hx, v.x + v.hx), qz = clamp(cz, v.z - v.hz, v.z + v.hz)
      let dx = cx - qx, dz = cz - qz
      const d2 = dx * dx + dz * dz
      if (d2 >= hw * hw) continue
      if (d2 < 1e-6) { dx = cx - v.x; dz = cz - v.z }
      const d = Math.hypot(dx, dz) || 1, push = d2 < 1e-6 ? hw + 0.3 : hw - Math.sqrt(d2)
      G.x += (dx / d) * push; G.z += (dz / d) * push; ip += push; hit = true
    }
    if (hit && v.cd <= 0) {
      v.cd = 1.4
      if (imp > 3) {
        v.halt = v.parked ? 0 : 1.4
        sfx('crash'); addDamage(rint(8000, 25000)); addHeat(0.5); G.mob += 10
        toast(pick(['ঠুসস! গাড়ি-গাড়ি খেলা!', 'আরে! লাইসেন্স আছে তো?', 'হর্ন নাই নাকি রে!']), 'bad')
        memeLine('crash')
      }
    } else if (!hit && v.cd <= 0 && imp > 8) {
      const ox = Math.max(Math.abs(G.x - v.x) - v.hx - hw, 0), oz = Math.max(Math.abs(G.z - v.z) - v.hz - hw, 0)
      if (Math.hypot(ox, oz) < 0.8) { v.cd = 2.5; addChaos(20, 'নিয়ার মিস! কলিজা ঠান্ডা!'); memeLine('nearmiss') }
    }
  }
  if (ip > 0.01) {
    r.sp *= 1 - Math.min(0.5, ip * 1.5)
    if (imp > 9 && r.crashCd <= 0) { r.crashCd = 1.2; sfx('crash'); addDamage(rint(6000, 20000)); addHeat(0.3); G.mob += 6; memeLine('crash') }
  }

  // run over pedestrians
  const fxp = G.x + fx0 * (sp.hl - 0.3), fzp = G.z + fz0 * (sp.hl - 0.3)
  if (imp > 3) for (const p of G.npcs) {
    if (p.down > 0.3 || Math.hypot(p.x - fxp, p.z - fzp) > hw + 0.9) continue
    p.down = 2.2; p.scare = 4
    fx(pick(POW), p.x, 1.9, p.z)
    sfx('punch'); setTimeout(() => sfx('ouch'), 90)
    addDamage(rint(1500, 4000)); addChaos(15); G.mob += 28; addHeat(0.7)
    memeLine('runover')
  }
  // ram the runaway CNG
  if (G.cng && r.cngCd <= 0 && imp > 5 && Math.hypot(G.cng.x - fxp, G.cng.z - fzp) < 2.4) { r.cngCd = 0.9; cngHit(G.cng, true); r.sp *= -0.3 }

  r.v.x = G.x; r.v.z = G.z; r.v.ry = G.face
  G.y = 0.12; G.vy = 0; G.grounded = true
  G.vx = fx0 * r.sp; G.vz = fz0 * r.sp; G.spd = Math.abs(r.sp)
  if (G.t - G.lookT > 1.4) G.yaw = angLerp(G.yaw, G.face + Math.PI, 1 - Math.exp(-3 * dt)) // chase camera swings behind
  engine(G.spd / sp.max, r.type)
  const kmh = Math.round(G.spd * 3.6)
  if (kmh !== hud.get().speed) hud.set({ speed: kmh })
}

// ================= interaction prompt / E key =================
function interact() {
  const ride = G.ride
  let pad = null, car = null, npc = null
  if (!G.mission) pad = PADS.find((p) => Math.hypot(G.x - p.x, G.z - p.z) < 3.4)
  if (!ride) { car = nearVehicle(); npc = G.npcs.find((p) => Math.hypot(G.x - p.x, G.z - p.z) < 3.5) }
  let prompt = ''
  const vend = G.mission?.id === 'chanda' && !G.mission.alarm && !ride && !G.menuOpen ? G.vendors.find((v) => v.active && !v.done && Math.hypot(G.x - v.sx, G.z - v.sz) < 3.9) : null
  if (vend) prompt = 'E চাপুন / ট্যাপ — বিক্রেতার সাথে কথা বলো'
  else if (G.menuOpen) prompt = ''
  else if (pad) prompt = `E চাপুন — ${pad.label} শুরু করো`
  else if (ride) prompt = 'E চাপুন — গাড়ি থেকে নামো · H হর্ন'
  else if (car) prompt = `E চাপুন — ${SPEC[car.type].label} চালাও`
  else if (npc && G.mode === 'foot') prompt = 'E চাপুন — জোরে ধমক দাও!'
  if (prompt !== hud.get().prompt) hud.set({ prompt })
  if (G.interact) {
    if (vend) openChanda(vend)
    else if (G.menuOpen) { /* menu handles input */ }
    else if (pad) startMission(pad.id)
    else if (ride) leaveRide()
    else if (car) enterRide(car)
    else if (npc && G.mode === 'foot' && G.cdNpc <= 0) {
      G.cdNpc = 0.6; npc.scare = 3; addHeat(0.35)
      addChaos(10, pick(NPC_LINES))
    }
  }

  // arrow target
  if (G.mission && G.cps.length) G.target = G.cps[Math.min(G.cpi, G.cps.length - 1)]
  else { const np = PADS.reduce((a, b) => (Math.hypot(G.x - a.x, G.z - a.z) < Math.hypot(G.x - b.x, G.z - b.z) ? a : b)); G.target = [np.x, np.z] }
}

function mission(dt) {
  const m = G.mission
  if (!m) return
  if (m.cd > 0) {
    const before = Math.ceil(m.cd)
    m.cd -= dt
    const after = Math.ceil(Math.max(m.cd, 0))
    if (after !== before) toast(after > 0 ? bn(after) + '…' : 'যাও যাও যাও!', 'mission')
    return
  }
  m.t += dt; m.left -= dt
  const left = Math.max(0, Math.ceil(m.left))
  if (left !== hud.get().left) hud.set({ left })

  let obj = ''
  if (m.id === 'boss') {
    const [cx, cz] = G.cps[G.cpi]
    obj = `চেকপয়েন্ট ${bn(G.cpi + 1)}/${bn(G.cps.length)}`
    if (Math.hypot(G.x - cx, G.z - cz) < 5) {
      G.cpi++; m.left += 2
      addChaos(15, 'দারুণ! পরের চেকপয়েন্ট!')
      if (G.cpi >= G.cps.length) return end(true, 'ট্রাফিক বস! রাস্তা এখন তোমার!', 150 + Math.max(0, m.left) * 2, 120)
    }
  } else if (m.id === 'race') {
    const [cx, cz] = G.cps[G.cpi]
    rivals(dt)
    const d = Math.hypot(G.x - cx, G.z - cz)
    if (d < 9) {
      G.cpi++
      toast('চেকপয়েন্ট পার!', 'chaos')
      if (G.cpi >= G.cps.length) {
        const place = 1 + G.rivals.filter((r) => r.done).length
        const xp = [0, 300, 200, 120][place]
        const msg = place === 1 ? 'রিকশা কিং! প্যাডেলে আগুন!' : place === 2 ? 'দুই নম্বর! আরেকটু জোরে প্যাডেল মারো!' : 'শেষ হইলেও রেস তো শেষ করছো!'
        return end(true, msg, xp, 100 + (4 - place) * 50)
      }
    }
    const tgt = G.cps[Math.min(G.cpi, G.cps.length - 1)]
    const dp = Math.hypot(G.x - tgt[0], G.z - tgt[1])
    const ahead = G.rivals.filter((r) => r.idx > G.cpi || (r.idx === G.cpi && Math.hypot(r.x - tgt[0], r.z - tgt[1]) < dp)).length
    obj = `চেকপয়েন্ট ${bn(Math.min(G.cpi + 1, G.cps.length))}/${bn(G.cps.length)} · অবস্থান ${bn(ahead + 1)}/${bn(3)}`
  } else if (m.id === 'cng') {
    obj = `অটো ধরো! আর ${bn(G.cng.hp)}টি ঘুষি বাকি`
    cngStep(dt)
  } else if (m.id === 'chanda') {
    chandaStep(m, dt); if (!G.mission) return
    obj = m.alarm ? `পুলিশ আসছে! পালাও — ${bn(Math.ceil(Math.max(0, m.escape)))} সে.` : `বিক্রেতা ${bn(m.done)}/${bn(m.total)} · ${taka(m.cash)}`
  } else if (m.id === 'chase') {
    G.heat = Math.max(G.heat, 3)
    obj = 'পুলিশ থেকে পালিয়ে গোপন আড্ডায় পৌঁছাও!'
    chase(dt)
    if (!G.mission) return
    if (Math.hypot(G.x - HIDE[0], G.z - HIDE[1]) < 5) return end(true, 'পালাইছো! পুলিশ মামা কাইন্দা দিল!', 250 + Math.max(0, m.left) * 2, 200)
  }
  if (obj !== hud.get().obj) hud.set({ obj })
  if (m.left <= 0) {
    const msgs = { boss: 'সময় শেষ! জ্যামে আটকাইলা নাকি?', race: 'রিকশা পিছনে পইড়া গেল! সময় শেষ!', chase: 'সময় শেষ! পুলিশ মামারা আড্ডায় ঘেরাও করছে!', cng: 'অটো পালাইছে! এখন মিটারের ভাড়াই দিতে হবে!', chanda: 'সময় শেষ! বিক্রেতারা সব দোকান গুটিয়ে পালাইছে!' }
    end(false, msgs[m.id], 0, 0)
  }
}

// ================= police officers (humans) =================
const COP_WARN = LINES.cop
function officers(dt) {
  G.copAlert = Math.max(0, G.copAlert - dt); G.bustCd -= dt
  const alert = G.heat >= 1 || G.copAlert > 0, reach = G.heat >= 3 ? 55 : 32
  for (const o of G.officers) {
    o.t += dt
    const dx = G.x - o.x, dz = G.z - o.z, d = Math.hypot(dx, dz) || 1
    if (o.react > 0) { o.react -= dt; o.st = 'cheer'; continue }
    const hunt = o.kind === 'raid' || (alert && d < reach && G.bustCd <= 0)
    if (hunt) {
      if (o.st !== 'run' && d < 45 && G.t - (G.lastShout || -99) > 5) { G.lastShout = G.t; memeLine('siren'); sfx('whistle') }
      o.st = 'run'
      const sp = o.kind === 'raid' ? 5.2 : 4.4 + Math.min(G.heat, 4) * 0.35
      o.x += (dx / d) * sp * dt; o.z += (dz / d) * sp * dt
      for (const q of G.officers) if (q !== o) { const ex = o.x - q.x, ez = o.z - q.z, ed = Math.hypot(ex, ez); if (ed < 1.0 && ed > 0.01) { o.x += (ex / ed) * (1 - ed) * 0.5; o.z += (ez / ed) * (1 - ed) * 0.5 } }
      resolve(o, 0.5)
      o.ry = angLerp(o.ry, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt))
      if (d < 1.9 && (!G.ride || Math.abs(G.ride.sp) < 3)) caught(o)
      if (!G.mission && G.heat < 1 && !G.copAlert) o.st = 'walk'
      continue
    }
    if (o.kind === 'traffic') {
      const hd = Math.hypot(o.hx - o.x, o.hz - o.z)
      if (hd > 0.6) { o.st = 'walk'; o.x += ((o.hx - o.x) / hd) * 2.6 * dt; o.z += ((o.hz - o.z) / hd) * 2.6 * dt; o.ry = angLerp(o.ry, Math.atan2(o.hx - o.x, o.hz - o.z), 1 - Math.exp(-8 * dt)) }
      else { o.st = Math.floor(o.t / 4) % 2 ? 'stand' : 'point'; o.ry = angLerp(o.ry, o.hry, 1 - Math.exp(-6 * dt)) }
    } else {
      o.a += o.dir * o.speed * dt
      if (o.a > o.a1) { o.a = o.a1; o.dir = -1 } else if (o.a < o.a0) { o.a = o.a0; o.dir = 1 }
      const t = { ax: o.ax, c: o.c, a: o.a, dir: o.dir }; placeNpc(t)
      const k = Math.min(1, 3 * dt); o.x += (t.x - o.x) * k; o.z += (t.z - o.z) * k; o.ry = angLerp(o.ry, t.ry, 0.2); o.st = 'walk'
    }
    if (G.heat > 0.3 && d < 12 && G.t - o.whistleT > 10) { o.whistleT = G.t; sfx('whistle'); fx(pick(COP_WARN), o.x, 2.7, o.z, '#7db8ff') }
  }
}

function caught(o) {
  const id = G.mission?.id
  if (id === 'chase') return end(false, 'ধরা খাইলা! থানায় চলো, চা-বিস্কুট দিমু!', 0, 0)
  if (id === 'chanda' && G.mission.alarm) return end(false, 'পুলিশ ধরছে! সব ভার্চুয়াল চাঁদা বাজেয়াপ্ত!', 0, 0)
  if (G.bustCd > 0) return
  G.bustCd = 10; G.heat = 0; G.copAlert = 0; G.stun = 1.4
  const lose = Math.min(hud.get().chaos, 40)
  hud.set({ chaos: hud.get().chaos - lose }); saveNow()
  toast(`পুলিশ ধরেছে! জরিমানা −${bn(lose)} চাওস (ভার্চুয়াল)`, 'bad'); memeLine('busted', true)
  G.officers.forEach((q) => { if (q.kind !== 'raid') q.react = 2.2 })
}

// ================= footpath chanda mission (all virtual money, comedy only) =================
function openChanda(v) {
  G.menuOpen = true; G.vx = G.vz = 0
  G.noPauseUntil = performance.now() + 1500
  document.exitPointerLock?.()
  hud.set({ menu: { v: G.vendors.indexOf(v), line: pick(LINES.vendor), shop: ['ফলের দোকান', 'চা-পান-সিগারেট', 'জামা-কাপড়', 'ঝালমুড়ি · ফুচকা', 'সবজি বাজার'][v.kind] || 'দোকান' } })
}
export function chandaChoose(k) {
  const m = G.mission, menu = hud.get().menu
  if (!m || m.id !== 'chanda' || !menu) return
  const v = G.vendors[menu.v]
  G.menuOpen = false; hud.set({ menu: null })
  if (k < 0) return
  v.done = true; m.done++; v.scare = 2.5
  if (k === 0) { m.cash += 500; m.cm += 12; addChaos(15, '৳৫০০ চাঁদা — ভার্চুয়াল!'); sfx('cash'); memeLine('take', true) }
  else if (k === 1) {
    if (Math.random() < 0.55) { m.cash += 1000; m.cm += 28; addChaos(30, '৳১,০০০! বিক্রেতা কাঁদো কাঁদো!'); sfx('cash'); memeLine('more', true) }
    else { m.cm += 18; addHeat(0.5); toast('বিক্রেতা চিল্লাচিল্লি করে দোকান গুটাইছে — কিছুই পাইলা না!', 'bad'); sfx('scratch'); memeLine('more', true) }
  } else if (k === 2) { m.cm = Math.max(0, m.cm - 8); addXp(25); toast('ছেড়ে দিলে — ভালো মানুষ! +২৫ XP', 'chaos'); memeLine('spare', true) }
  else { m.cash += 300; m.cm += 24; addHeat(0.6); addChaos(20, 'ধমক দিয়ে ৳৩০০!'); memeLine('threat', true) }
  fx(['+৳৫০০', '+৳১,০০০ / ✗', 'ধন্যবাদ!', '+৳৩০০'][k], v.x, 2.6, v.z, '#ffd23f')
  hud.set({ cm: { cash: m.cash, pct: Math.min(100, Math.round(m.cm)) } })
}
function chandaStep(m, dt) {
  if (hud.get().cm?.cash !== m.cash || hud.get().cm?.pct !== Math.min(100, Math.round(m.cm))) hud.set({ cm: { cash: m.cash, pct: Math.min(100, Math.round(m.cm)) } })
  for (const v of G.vendors) if (v.scare > 0) v.scare -= dt
  if (!m.alarm) {
    let best = -1, bd = 1e9
    G.vendors.forEach((v) => { if (v.active && !v.done) { const d = Math.hypot(G.x - v.sx, G.z - v.sz); if (d < bd) { bd = d; best = v.ci } } })
    if (best >= 0) G.cpi = best
    if (m.cm >= 100) { // cartoon police raid
      m.alarm = true; m.escape = 22; G.menuOpen = false; hud.set({ menu: null })
      for (let i = 0; i < 3; i++) { const a = G.face + Math.PI + (i - 1) * 0.75, o = { kind: 'raid', st: 'run', x: G.x + Math.sin(a) * 30, z: G.z + Math.cos(a) * 30, ry: 0, t: 0, react: 0, whistleT: 0 }; resolve(o, 0.6); G.officers.push(o) }
      G.heat = Math.max(G.heat, 3.2); siren(true); G.cps = [HIDE]; G.cpi = 0
      news('ব্রেকিং: ফুটপাতে হুলস্থুল! পুলিশ ছুটছে', 'ভার্চুয়াল চাঁদাবাজ যুবককে ধরতে মাঠে ৩ পুলিশ মামা', true); memeLine('siren', true)
      return
    }
    if (best < 0) end(true, m.done && m.cash >= 1500 ? 'চাঁদা কিং! বাজারে তোমার নামে সবাই ভয় পায়!' : 'সব দোকান ঘুরে ফেললে — এইবার চা খাও!', 120 + m.cash * 0.12 + Math.max(0, m.left) * 2, 60 + Math.round(m.cash / 25))
  } else {
    m.escape -= dt
    if (Math.hypot(G.x - HIDE[0], G.z - HIDE[1]) < 5 || m.escape <= 0) { memeLine('copgone', true); end(true, 'পুলিশ মামা ফেল! পালাইছো ভার্চুয়াল টাকা নিয়ে!', 80 + m.cash * 0.05, 40) }
  }
}

function rivals(dt) {
  for (const r of G.rivals) {
    if (r.done) continue
    const [tx, tz] = G.cps[r.idx]
    const dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz)
    if (d < 4) { r.idx++; if (r.idx >= G.cps.length) r.done = true; continue }
    r.x += (dx / d) * r.speed * dt; r.z += (dz / d) * r.speed * dt
    r.ry = angLerp(r.ry, Math.atan2(dx, dz), 1 - Math.exp(-6 * dt))
  }
}

function chase(dt) {
  const m = G.mission
  const base = Math.min(10.5, 8 + 0.07 * m.t)
  let nearest = 1e9
  for (const c of G.cops) {
    const dx = G.x - c.x, dz = G.z - c.z, d = Math.hypot(dx, dz)
    nearest = Math.min(nearest, d)
    let ux = dx / (d || 1), uz = dz / (d || 1)
    if (c.nudge > 0) { c.nudge -= dt; const nx = -uz * c.side, nz = ux * c.side; ux = nx; uz = nz }
    const ox = c.x, oz = c.z
    c.x += ux * base * dt; c.z += uz * base * dt
    for (const o of G.cops) if (o !== c) { const ex = c.x - o.x, ez = c.z - o.z, ed = Math.hypot(ex, ez); if (ed < 3.2 && ed > 0.01) { c.x += (ex / ed) * (3.2 - ed) * 0.5; c.z += (ez / ed) * (3.2 - ed) * 0.5 } }
    resolve(c, 1.5)
    if (Math.hypot(c.x - ox, c.z - oz) < base * dt * 0.35 && c.nudge <= 0) c.nudge = 0.7
    c.ry = angLerp(c.ry, Math.atan2(c.x - ox, c.z - oz), 1 - Math.exp(-8 * dt))
    if (d < 2.4) { end(false, 'ধরা খাইলা! থানায় চলো, চা-বিস্কুট দিমু!', 0, 0); return }
  }
  if (nearest < 9 && G.t % 4 < dt) toast('পুলিশ ঘাড়ের কাছে! দৌড়াও!', 'bad')
  G.nearestCop = nearest
}

function wanted(dt) {
  if (!G.mission || G.mission.id !== 'chase') G.heat = Math.max(0, G.heat - 0.1 * dt)
  const w = Math.min(5, Math.floor(G.heat))
  if (w !== G.wantedShown) {
    if (w === 5 && G.wantedShown < 5) news('ব্রেকিং: দেশজুড়ে হাই-অ্যালার্ট!', 'পুলিশ খুঁজছে রাস্তার তাণ্ডবকারী যুবককে', true)
    if (w > G.wantedShown) toast(`ওয়ান্টেড লেভেল ${bn(w)} ★ পুলিশ মামা নজর রাখছে!`, 'bad')
    G.wantedShown = w; hud.set({ wanted: w })
    if (w >= 4 && !G.mission) { if (!G.ride) G.mode = 'foot'; startMission('chase') }
  }
}

// ================= punching, damage, mob, CNG =================
const rint = (a, b) => Math.floor(rnd(a, b))
const POW = ['ধুম!', 'ঠাস!', 'দড়াম!', 'ধপাস!', 'ফটাস!', 'বুম!']
const fx = (text, x, y, z, color = '#ffd23f') => { G.fx.push({ text, x, y, z, color }); if (G.fx.length > 8) G.fx.shift() }
const CNG_LINES = ['আরে ভাই মারেন কেন!', 'মিটারে গেলে লস হয় ভাই!', 'ভাড়া তো ৫০০ই ঠিক ছিল!', 'পুলিশ ডাকমু কিন্তু!', 'ওরে বাবা আমার CNG!']
const JAM_LINES = ['জ্যাম! সবাই হর্ন বাজাচ্ছে!', 'গাড়ি আটকে গেল! ঢাকার জ্যাম!', 'ড্রাইভার চিৎকার করছে!']

function doPunch() {
  G.punchCd = 0.42; G.punchT = 0.28
  // find the nearest thing in reach (auto-aim, so it works from any direction — great on touch)
  let best = null, bd = 1e9
  const cand = (d, kind, ref, lim) => { if (d < lim && d < bd) { bd = d; best = { kind, ref } } }
  if (G.cng) cand(Math.hypot(G.cng.x - G.x, G.cng.z - G.z) - 1.3, 'cng', G.cng, 2.0)
  for (const c of G.crowd) if (c.down <= 0) cand(Math.hypot(c.x - G.x, c.z - G.z), 'mob', c, 2.1)
  for (const p of G.npcs) if (!(p.down > 0.3)) cand(Math.hypot(p.x - G.x, p.z - G.z), 'npc', p, 2.1)
  for (const v of G.vehicles) {
    if (v.player) continue
    const ox = Math.max(Math.abs(G.x - v.x) - v.hx, 0), oz = Math.max(Math.abs(G.z - v.z) - v.hz, 0)
    cand(Math.hypot(ox, oz), 'veh', v, 1.5)
  }
  for (const l of lamps) cand(Math.hypot(l.x - G.x, l.z - G.z) - 0.3, 'lamp', l, 1.6)
  for (const t of trees) cand(Math.hypot(t.x - G.x, t.z - G.z) - 0.5, 'tree', t, 1.6)
  if (!best) { sfx('whoosh'); return }

  const r = best.ref, tx = r.x, tz = r.z
  G.face = Math.atan2(tx - G.x, tz - G.z)
  const k = best.kind
  if (k === 'npc') {
    r.down = 1.6; r.scare = 4
    fx(pick(POW), tx, 1.9, tz)
    sfx('punch'); setTimeout(() => sfx(Math.random() < 0.5 ? 'ouch' : 'scream'), 90)
    addDamage(rint(500, 2500)); addChaos(12, Math.random() < 0.45 ? pick(NPC_LINES) : '')
    memeLine(Math.random() < 0.6 ? 'punch' : 'hurt')
    G.mob += 22; addHeat(0.5)
    for (const o of G.npcs) if (o !== r && Math.hypot(o.x - tx, o.z - tz) < 10) { o.scare = 3; G.mob += 3 } // witnesses panic
  } else if (k === 'mob') {
    r.down = 1.8
    fx(pick(POW), tx, 1.9, tz, '#ff7b7b'); sfx('punch'); setTimeout(() => sfx('ouch'), 90)
    addChaos(10)
  } else if (k === 'veh') {
    r.halt = 2.5
    const [a, b] = r.type === 'bus' ? [60000, 120000] : r.type === 'car' ? [25000, 60000] : r.type === 'bike' ? [4000, 9000] : [6000, 15000]
    fx(pick(['ঠং!', 'দড়াম!', 'ক্যাঁচ!']), tx, 2.4, tz); sfx('punch'); setTimeout(() => sfx(r.type === 'rick' ? 'bell' : 'honk'), 120)
    addDamage(rint(a, b)); addChaos(25, Math.random() < 0.5 ? pick(JAM_LINES) : '')
    G.mob += 12; addHeat(0.45)
  } else if (k === 'lamp') {
    fx('ঠং!', tx, 4, tz, '#9ad1ff'); sfx('clang'); addDamage(3000); addChaos(5); G.mob += 3
  } else if (k === 'tree') {
    fx('ফটাস!', tx, 3.2, tz, '#7ef2a0'); sfx('slap'); addDamage(800); addChaos(3); G.mob += 1
  } else if (k === 'cng') {
    cngHit(r)
  }
}

// ---- runaway CNG auto-rickshaw: flees along the 3x3 road grid, away from the player ----
function nextNode(c) {
  const [fx0, fz0] = c.to
  let opts = [[80, 0], [-80, 0], [0, 80], [0, -80]].map(([dx, dz]) => [fx0 + dx, fz0 + dz]).filter(([x, z]) => Math.abs(x) <= 160 && Math.abs(z) <= 160)
  const back = opts.filter(([x, z]) => !(x === c.from[0] && z === c.from[1]))
  if (back.length) opts = back
  let bestN = opts[0], bs = -1
  for (const o of opts) { const sc = Math.hypot(o[0] - G.x, o[1] - G.z) + rnd(0, 45); if (sc > bs) { bs = sc; bestN = o } }
  return bestN
}
function cngStep(dt) {
  const c = G.cng
  if (!c) return
  if (c.halt > 0) c.halt -= dt
  else {
    const dx = c.to[0] - c.x, dz = c.to[1] - c.z, d = Math.hypot(dx, dz)
    if (d < 1.6) { c.from = c.to; c.to = nextNode(c) }
    else {
      const turn = Math.abs(((Math.atan2(dx, dz) - c.ry + Math.PI * 3) % (Math.PI * 2)) - Math.PI) // slow down while turning
      const sp = c.speed * (turn > 0.5 ? 0.6 : 1)
      c.x += (dx / d) * sp * dt; c.z += (dz / d) * sp * dt
      c.ry = angLerp(c.ry, Math.atan2(dx, dz), 1 - Math.exp(-5 * dt))
    }
  }
  G.cps[0][0] = c.x; G.cps[0][1] = c.z
}

// ---- angry public ----
function crowd(dt) {
  G.crowdCd -= dt
  const n = G.crowd.length
  G.mob = Math.max(0, Math.min(100, G.mob) - (n ? 0.6 : 2.2) * dt)
  if (!n && G.mob >= 70 && G.crowdCd <= 0 && G.mission?.id !== 'race') spawnCrowd()
  crowdLoop(G.crowd.length > 0)
  if (!n) {
    if (G.t - G.lastHurt > 6 && G.hp < 100) G.hp = Math.min(100, G.hp + 5 * dt)
    return
  }
  G.crowdAge += dt; G.crowdHit -= dt
  let allFar = true
  for (const c of G.crowd) {
    if (c.down > 0) { c.down -= dt; continue }
    const dx = G.x - c.x, dz = G.z - c.z, d = Math.hypot(dx, dz)
    if (d < 50) allFar = false
    const ox = c.x, oz = c.z
    if (d > 1.1) { c.x += (dx / d) * c.sp * dt; c.z += (dz / d) * c.sp * dt }
    for (const o of G.crowd) if (o !== c) { const ex = c.x - o.x, ez = c.z - o.z, ed = Math.hypot(ex, ez); if (ed < 1.1 && ed > 0.01) { c.x += (ex / ed) * (1.1 - ed) * 0.5; c.z += (ez / ed) * (1.1 - ed) * 0.5 } }
    resolve(c, 0.5)
    c.moving = Math.hypot(c.x - ox, c.z - oz) > 0.01
    c.ry = angLerp(c.ry, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt))
    if (G.ride && Math.abs(G.ride.sp) > 4 && d < 2.6) { // run them over!
      c.down = 2; sfx('punch'); fx(pick(POW), c.x, 1.9, c.z, '#ff7b7b'); addChaos(25); addDamage(rint(800, 2000)); memeLine('runover')
      continue
    }
    if (d < (G.ride ? 2.2 : 1.5) && G.crowdHit <= 0 && G.stun <= 0.15) {
      G.crowdHit = 0.55; G.hp -= 6; G.stun = 0.25; G.lastHurt = G.t
      G.vx = (dx / (d || 1)) * 6; G.vz = (dz / (d || 1)) * 6
      sfx('slap'); sfx('ouch'); fx(pick(POW), G.x, 2, G.z, '#ff7b7b')
      if (!G.crowdHint) { G.crowdHint = true; toast('গণধোলাই চলছে! দৌড়াও বা ঘুষি মারো!', 'bad') }
      if (G.hp <= 0) return beaten()
    }
  }
  if (G.crowdAge > 45 || allFar) {
    G.crowd = []; G.mob = 15; G.crowdCd = 10
    addChaos(60, 'জনতার হাত থেকে পালিয়েছো!')
    news('জনতার হাত থেকে পালালো সেই যুবক', 'এলাকায় থমথমে অবস্থা, খুঁজছে পুলিশ')
  }
}
function spawnCrowd() {
  const cnt = G.mission ? 4 : 5
  G.crowd = []
  for (let i = 0; i < cnt; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(22, 30)
    const c = { x: G.x + Math.cos(a) * r, z: G.z + Math.sin(a) * r, ry: 0, sp: rnd(5.0, 6.2), down: 0, moving: true }
    resolve(c, 0.6); G.crowd.push(c)
  }
  G.crowdAge = 0; G.crowdHint = false
  sfx('whistle'); toast('জনতা তেড়ে আসছে! দৌড়াও!', 'bad')
  news('ব্রেকিং নিউজ: তাণ্ডবে ক্ষুব্ধ জনতা!', 'এলাকাবাসী ঘিরে ধরছে অজ্ঞাতনামা এক যুবককে')
}
function beaten() {
  leaveRide()
  const had = !!G.mission
  news('গণপিটুনির শিকার তাণ্ডবকারী!', 'এলাকাবাসী: “বাপের দেশে এইসব চলবে না!”', true)
  sfx('fail')
  hud.set({ chaos: Math.max(0, hud.get().chaos - 50), wanted: 0 }); saveNow()
  if (had) end(false, 'গণধোলাই খাইলা! মিশন শেষ!', 0, 0)
  Object.assign(G, { x: 40, z: 46, y: 0.12, vx: 0, vz: 0, hp: 100, mob: 0, crowd: [], crowdCd: 12, stun: 1.5, heat: 0, wantedShown: 0 })
  toast('হাসপাতাল থেকে ফিরলে… চাওস −৫০', 'bad')
}
function syncMeters() {
  const hp = Math.round(G.hp), mb = Math.round(Math.min(100, G.mob)), h = hud.get()
  if (hp !== h.hp || mb !== h.mob) hud.set({ hp, mob: mb })
}
