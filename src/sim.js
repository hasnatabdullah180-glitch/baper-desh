import { hud, toast, addXp, addChaos, addDamage, news, recordBest, saveNow, bn } from './store'
import { ROADS, BX, resolve, gY, PADS, lamps, trees } from './world'
import { sfx, siren, say, crowdLoop } from './audio'

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
}

export const MISSIONS = {
  boss: { title: 'ট্রাফিক বস', time: 70, intro: 'সব চেকপয়েন্টে সময়মতো পৌঁছাও — রাস্তা এখন তোমার!' },
  race: { title: 'রিকশা রেসার', time: 60, intro: 'রিকশা নিয়ে সবাইকে হারিয়ে দাও!' },
  chase: { title: 'পুলিশ চেজ', time: 70, intro: 'পুলিশ মামা পিছনে! গোপন আড্ডায় পৌঁছাও!' },
  cng: { title: 'অটো ধর', time: 100, intro: 'ভাড়া নিয়ে ঝগড়া! বদমেজাজি অটোওয়ালা পালাচ্ছে — দৌড়ে ধরে ঘুষি মেরে থামাও!' },
}
const BOSS = [[0, 40], [0, -40], [-40, 0], [-80, 40], [-40, 80], [40, 80]]
const RACE = [[80, 0], [80, 80], [0, 80], [0, 0], [80, 0], [80, 40]]
const HIDE = [-80, -80]
export const HIDEOUT = HIDE

const VT = { car: { hl: 2.2, hw: 1.0 }, bus: { hl: 4.7, hw: 1.4 }, rick: { hl: 1.5, hw: 0.7 }, ezy: { hl: 1.4, hw: 0.75 }, bike: { hl: 1.0, hw: 0.45 } }
const CARCOL = ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#e9c46a', '#8d99ae', '#fb8500', '#6a4c93', '#f1faee']
const BUSCOL = ['#d62828', '#d62828', '#c1121f'] // BRTC red
const EZYCOL = ['#1b9e5a', '#1b9e5a', '#16a34a'] // green battery auto
const BIKECOL = ['#ff7b00', '#ff7b00', '#ff7b00', '#e63946'] // orange dirt bikes
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
        for (let k = 0; k < 3; k++) {
          const type = ['car', 'bus', 'ezy', 'car', 'bike', 'bus', 'rick', 'bike'][(n + k) % 8]
          const sp = VT[type]
          G.vehicles.push({
            ax, dir, off, speed, type, s: -170 + ((ph + k * 113) % 340),
            color: type === 'bus' ? pick(BUSCOL) : type === 'rick' ? pick(RICKCOL) : type === 'ezy' ? pick(EZYCOL) : type === 'bike' ? pick(BIKECOL) : pick(CARCOL),
            hx: ax === 'x' ? sp.hl : sp.hw, hz: ax === 'x' ? sp.hw : sp.hl,
            x: 0, z: 0, ry: 0, vx: ax === 'x' ? dir * speed : 0, vz: ax === 'z' ? dir * speed : 0, cd: 0,
          })
        }
        n++
      })
    })
  })
  G.vehicles.forEach((v) => placeVeh(v))

  for (let k = 0; k < 18; k++) {
    let i, j, side
    do { i = Math.floor(Math.random() * 4); j = Math.floor(Math.random() * 4); side = Math.floor(Math.random() * 4) }
    while ((side === 0 && i === 0) || (side === 1 && i === 3) || (side === 2 && j === 0) || (side === 3 && j === 3))
    const [x0, x1] = BX[i], [z0, z1] = BX[j]
    const ax = side < 2 ? 'z' : 'x'
    const c = [x0 + 1.6, x1 - 1.6, z0 + 1.6, z1 - 1.6][side]
    const a0 = (ax === 'z' ? z0 : x0) + 3, a1 = (ax === 'z' ? z1 : x1) - 3
    const a = rnd(a0, a1)
    G.npcs.push({ ax, c, a0, a1, a, dir: Math.random() < 0.5 ? 1 : -1, speed: rnd(1.1, 1.8), scare: 0, color: pick(NPCCOL), x: 0, z: 0, ry: 0, moving: true })
  }
  G.npcs.forEach((p) => placeNpc(p))
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
  Object.assign(G, { x: 40, y: 0.12, z: 46, vx: 0, vz: 0, vy: 0, grounded: true, face: Math.PI, spd: 0, yaw: 0, pitch: 0.38, stun: 0, mode: 'foot', heat: 0, wantedShown: 0, mission: null, cps: [], cpi: 0, cops: [], rivals: [], target: null, hp: 100, mob: 0, crowd: [], crowdCd: 0, cng: null, punchT: 0, fx: [] })
  siren(false); crowdLoop(false)
  hud.set({ hp: 100, mob: 0, news: null, wanted: 0, mission: null, obj: '', left: 0, prompt: '', result: null, toasts: [] })
}

export function startMission(id) {
  const m = MISSIONS[id]
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
  hud.set({ mission: { id, title: m.title }, left: m.time, obj: '', prompt: '', wanted: id === 'chase' ? 3 : hud.get().wanted })
  toast(m.intro, 'mission')
}

function end(ok, msg, xp, chaos) {
  const m = G.mission
  siren(false); sfx(ok ? 'win' : 'fail')
  if (ok) { addXp(xp); if (chaos) addChaos(chaos); recordBest(m.id, m.t) } else addXp(10)
  hud.set({ result: { ok, id: m.id, title: MISSIONS[m.id].title, msg, xp: ok ? Math.round(xp) : 10, chaos: ok ? chaos : 0, time: m.t }, mission: null, left: 0, obj: '', wanted: 0, prompt: '' })
  Object.assign(G, { mission: null, cps: [], cops: [], rivals: [], cng: null, mode: 'foot', heat: 0, wantedShown: 0, stun: 0, target: null })
  G.noPauseUntil = performance.now() + 500 // ignore the unlock event this triggers
  document.exitPointerLock?.()
}

function addHeat(h) { G.heat = Math.min(5.99, G.heat + h) }

// ---------- step ----------
export function step(dt) {
  const st = hud.get()
  if (st.phase !== 'play' || st.result) return
  dt = Math.min(dt, 0.05)
  G.t += dt
  vehicles(dt); npcs(dt); player(dt); crowd(dt); mission(dt); wanted(dt); syncMeters()
  G.jump = false; G.interact = false; G.punch = false
}

function vehicles(dt) {
  for (const v of G.vehicles) {
    if (v.halt > 0) { v.halt -= dt; v.cd -= dt; continue } // punched: stuck in a jam
    v.s += v.dir * v.speed * dt
    if (v.s > 170) v.s -= 340
    else if (v.s < -170) v.s += 340
    v.cd -= dt
    placeVeh(v)
  }
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
  const k = G.keys
  const rick = G.mode === 'rick'
  let ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
  let iz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
  const jx = Math.abs(G.joy.x) > 0.15 ? G.joy.x : 0, jy = Math.abs(G.joy.y) > 0.15 ? G.joy.y : 0
  ix = Math.max(-1, Math.min(1, ix + jx)); iz = Math.max(-1, Math.min(1, iz + jy))
  if (G.stun > 0) { G.stun -= dt; ix = iz = 0 }
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
    const ddx = G.x - v.x, ddz = G.z - v.z
    const px = v.hx + pr - Math.abs(ddx), pz = v.hz + pr - Math.abs(ddz)
    if (px > 0 && pz > 0 && G.y < 2) {
      if (px < pz) G.x += Math.sign(ddx || 1) * px; else G.z += Math.sign(ddz || 1) * pz
      if (G.stun <= 0 && v.cd <= 0) {
        v.cd = 1.5
        if (rick) { G.vx *= -0.3; G.vz *= -0.3; G.stun = 0.3 } else { G.vx = v.vx * 0.7; G.vz = v.vz * 0.7; G.stun = 0.8 }
        addHeat(0.6)
        toast(pick(['ধুর! গাড়ি ধাক্কা দিল!', 'আরে! রাস্তা কি তোর বাপের?', 'উফ! হর্ন শুনিস না নাকি?']), 'bad')
        if (G.mission && G.mission.id !== 'race') G.mission.left -= 2
      }
    } else if (v.cd <= 0 && G.spd > 2.5) {
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

  // interaction prompt
  let prompt = ''
  let pad = null
  if (!G.mission) pad = PADS.find((p) => Math.hypot(G.x - p.x, G.z - p.z) < 3.4)
  const npc = G.npcs.find((p) => Math.hypot(G.x - p.x, G.z - p.z) < 3.5)
  if (pad) prompt = `E চাপুন — ${pad.label} শুরু করো`
  else if (npc && G.mode === 'foot') prompt = 'E চাপুন — জোরে ধমক দাও!'
  if (prompt !== hud.get().prompt) hud.set({ prompt })
  if (G.interact) {
    if (pad) startMission(pad.id)
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
  } else if (m.id === 'chase') {
    G.heat = Math.max(G.heat, 3)
    obj = 'পুলিশ থেকে পালিয়ে গোপন আড্ডায় পৌঁছাও!'
    chase(dt)
    if (!G.mission) return
    if (Math.hypot(G.x - HIDE[0], G.z - HIDE[1]) < 5) return end(true, 'পালাইছো! পুলিশ মামা কাইন্দা দিল!', 250 + Math.max(0, m.left) * 2, 200)
  }
  if (obj !== hud.get().obj) hud.set({ obj })
  if (m.left <= 0) {
    const msgs = { boss: 'সময় শেষ! জ্যামে আটকাইলা নাকি?', race: 'রিকশা পিছনে পইড়া গেল! সময় শেষ!', chase: 'সময় শেষ! পুলিশ মামারা আড্ডায় ঘেরাও করছে!', cng: 'অটো পালাইছে! এখন মিটারের ভাড়াই দিতে হবে!' }
    end(false, msgs[m.id], 0, 0)
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
    if (w >= 4 && !G.mission) { G.mode = 'foot'; startMission('chase') }
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
    say(pick(NPC_LINES))
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
    r.hp--; r.halt = 0.9; r.speed = Math.max(4.2, r.speed - 0.5)
    fx(pick(POW), tx, 2.6, tz, '#ff9f1c'); sfx('punch'); setTimeout(() => sfx('clang'), 70)
    addDamage(rint(4000, 12000)); addChaos(20); toast(pick(CNG_LINES), 'chaos'); say(pick(CNG_LINES))
    if (r.hp <= 0) {
      sfx('crash')
      news('অটোওয়ালা ধরা!', 'যাত্রী বললেন: “ভাড়া কিন্তু মিটারে!”', true)
      end(true, 'অটো ধরা পড়ছে! ভাড়া এখন মিটারে!', 280 + Math.max(0, G.mission.left) * 2, 150)
    }
  }
}

// ---- runaway CNG auto-rickshaw: flees along the 3x3 road grid, away from the player ----
function nextNode(c) {
  const [fx0, fz0] = c.to
  let opts = [[80, 0], [-80, 0], [0, 80], [0, -80]].map(([dx, dz]) => [fx0 + dx, fz0 + dz]).filter(([x, z]) => Math.abs(x) <= 80 && Math.abs(z) <= 80)
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
    if (d < 1.5 && G.crowdHit <= 0 && G.stun <= 0.15) {
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
