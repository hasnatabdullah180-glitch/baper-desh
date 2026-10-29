// WebAudio: procedural SFX + music loop, plus short Bengali voice clips (public/audio/voice, speechSynthesis fallback).
import VOICES from './voices.json'
const KEY = 'baperdesh.muted'
let ctx = null, master = null, amb = null, sir = null, mobG = null, eng = null, engG = null, engOn = false, engLvl = 0, engKind = 'car'
let muted = false
try { muted = localStorage.getItem(KEY) === '1' } catch { /* ignore */ }
let active = false, wantAmb = false, wantSiren = false, wantMob = false
let voiceG = null, musicG = null, comp = null

// user audio preferences (persisted): music / effects / voice on-off + volumes
const PREF_KEY = 'baperdesh.audio.v1'
const pref = { music: true, sfx: true, voice: true, mv: 0.6, sv: 0.8, vv: 1 }
try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF_KEY)) || {}) } catch { /* ignore */ }
export const getAudio = () => ({ ...pref })
export function setAudio(p) {
  Object.assign(pref, p)
  try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)) } catch { /* ignore */ }
  gains(); musicSync()
  if (!pref.sfx || !pref.voice) window.speechSynthesis?.cancel?.()
}
function gains() {
  if (!ctx) return
  const t = ctx.currentTime
  master.gain.setTargetAtTime(muted || !pref.sfx ? 0 : 0.625 * pref.sv, t, 0.03)
  voiceG.gain.setTargetAtTime(muted || !pref.sfx || !pref.voice ? 0 : 0.9 * pref.vv, t, 0.03)
  musicG.gain.setTargetAtTime(muted || !pref.music ? 0 : 0.35 * pref.mv, t, 0.1)
}

export const isMuted = () => muted

export function initAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = 0
      // limiter + soft low-pass: no clipping, no harsh hiss
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.2
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7500
      master.connect(comp); comp.connect(lp); lp.connect(ctx.destination)
      voiceG = ctx.createGain(); voiceG.gain.value = 0; voiceG.connect(comp)
      musicG = ctx.createGain(); musicG.gain.value = 0; musicG.connect(comp)
      if (import.meta.env.DEV) { const an = ctx.createAnalyser(); an.fftSize = 2048; lp.connect(an); window.__tap = an }
      // looped brown-ish noise: city ambience + crowd murmur share it
      const sr = ctx.sampleRate, len = sr * 3, fade = Math.floor(sr * 0.3), raw = new Float32Array(len + fade)
      let last = 0
      for (let i = 0; i < raw.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; raw[i] = last * 3.5 }
      const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = raw[i]
      for (let i = 0; i < fade; i++) { const w = i / fade; d[i] = raw[i] * w + raw[len + i] * (1 - w) } // seamless loop (no click)
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
      amb = ctx.createGain(); amb.gain.value = 0
      const alp = ctx.createBiquadFilter(); alp.type = 'lowpass'; alp.frequency.value = 380
      src.connect(alp); alp.connect(amb); amb.connect(master); src.start()
      // angry crowd: band-passed noise wobbling like shouting
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 1.4
      // shouting wobble lives on its OWN gain stage; the on/off gain (mobG) stays at exactly 0 when the crowd is absent
      // (before: the LFO swung mobG's gain around 0, so the noise was audible all the time)
      const wobG = ctx.createGain(); wobG.gain.value = 0.6
      const wob = ctx.createOscillator(), wg = ctx.createGain(); wob.frequency.value = 4.5; wg.gain.value = 0.4
      wob.connect(wg); wg.connect(wobG.gain); wob.start()
      mobG = ctx.createGain(); mobG.gain.value = 0
      src.connect(bp); bp.connect(wobG); wobG.connect(mobG); mobG.connect(master)
      // vehicle engine: soft low-passed saw whose pitch follows the speed (silent unless driving)
      eng = ctx.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 60
      const elp = ctx.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 380
      engG = ctx.createGain(); engG.gain.value = 0
      eng.connect(elp); elp.connect(engG); engG.connect(master); eng.start()
      // police siren: square wave swept by an LFO
      const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain()
      o.type = 'sawtooth'; o.frequency.value = 850; lfo.type = 'square'; lfo.frequency.value = 1.6; lg.gain.value = 300 // comic two-tone "ni-no ni-no"
      lfo.connect(lg); lg.connect(o.frequency)
      sir = ctx.createGain(); sir.gain.value = 0
      const slp = ctx.createBiquadFilter(); slp.type = 'lowpass'; slp.frequency.value = 1800
      o.connect(slp); slp.connect(sir); sir.connect(master); o.start(); lfo.start()
    } catch { ctx = null }
  }
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})
  gains(); apply(); musicSync(); preloadVoices()
}

function apply() {
  if (!ctx) return
  const t = ctx.currentTime
  amb.gain.setTargetAtTime(active && wantAmb ? 0.03 : 0, t, 0.15)
  sir.gain.setTargetAtTime(active && wantSiren ? 0.025 : 0, t, 0.1)
  mobG.gain.setTargetAtTime(active && wantMob ? 0.25 : 0, t, 0.25)
  const F = { car: [55, 120], bus: [38, 70], ezy: [70, 110], bike: [85, 210], rick: [0, 0] }[engKind] || [55, 110]
  engG.gain.setTargetAtTime(active && engOn && F[0] ? 0.03 + engLvl * 0.025 : 0, t, 0.08)
  eng.frequency.setTargetAtTime(F[0] + engLvl * F[1], t, 0.08)
}
// engine hum while driving: level 0..1 = speed, kind = vehicle type; engine(null) switches it off
export function engine(level, kind) {
  if (level == null) { if (engOn) { engOn = false; apply() } return }
  engOn = true; engLvl = Math.max(0, Math.min(1, level)); engKind = kind || engKind
  if (ctx) apply()
}
export function setActive(a) { active = a; wantAmb = a || wantAmb; apply(); musicSync() }
export function siren(on) { wantSiren = on; apply() }
export function crowdLoop(on) { if (on !== wantMob) { wantMob = on; apply() } }

export function setMuted(m) {
  muted = m
  try { localStorage.setItem(KEY, m ? '1' : '0') } catch { /* ignore */ }
  gains(); musicSync()
  if (m) window.speechSynthesis?.cancel?.()
}

// ---- building blocks ----
function tone(f, dur, type = 'sine', vol = 0.25, slide = 0, delay = 0, vib = 0) {
  if (!ctx || muted) return
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(f, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur)
  if (vib) { // wobble for cartoon "wah"
    const l = ctx.createOscillator(), lg = ctx.createGain()
    l.frequency.value = 9; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05)
  }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05)
}
function noise(dur, vol = 0.4, freq = 500, type = 'lowpass', delay = 0) {
  if (!ctx || muted) return
  const t = ctx.currentTime + delay, n = ctx.createBufferSource(), b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  n.buffer = b
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  n.connect(f); f.connect(g); g.connect(master); n.start(t)
}
const seq = (notes, step = 0.09, type = 'triangle', vol = 0.22, dur = 0.25) => notes.forEach((f, i) => f && tone(f, dur, type, vol, 0, i * step))
const rnd = (a) => a[Math.floor(Math.random() * a.length)]

const SFX = {
  chaos: () => { tone(660, 0.1, 'triangle', 0.12); tone(990, 0.14, 'triangle', 0.12, 0, 0.07) },
  bad: () => { noise(0.25, 0.5, 500); tone(110, 0.2, 'sine', 0.4, -60) },
  level: () => seq([523, 659, 784, 1047, 1319], 0.1),
  mission: () => tone(440, 0.12, 'triangle', 0.25),
  win: () => seq([523, 659, 784, 659, 784, 1047, 1047, 1319], 0.11),
  fail: () => { // sad trombone: wah wah wah waaah
    tone(233, 0.35, 'triangle', 0.18, -8, 0, 5); tone(220, 0.35, 'triangle', 0.18, -8, 0.4, 5)
    tone(208, 0.35, 'triangle', 0.18, -8, 0.8, 5); tone(196, 0.9, 'triangle', 0.18, -60, 1.2, 12)
  },
  jump: () => { tone(220, 0.22, 'sine', 0.2, 380); tone(660, 0.12, 'triangle', 0.08, -200, 0.18) }, // boing
  horn: () => { tone(311, 0.55, 'sawtooth', 0.05, 30, 0, 6); tone(392, 0.55, 'sawtooth', 0.05, 40, 0, 6); tone(311, 0.2, 'sawtooth', 0.04, 0, 0.6); tone(392, 0.2, 'sawtooth', 0.04, 0, 0.6) }, // pa-PAAAM
  honk: () => { tone(420, 0.14, 'sawtooth', 0.05); tone(420, 0.14, 'sawtooth', 0.05, 0, 0.2); tone(380, 0.45, 'sawtooth', 0.05, 90, 0.4, 8) }, // pam-pam-paaam?!
  bell: () => { tone(2200, 0.35, 'sine', 0.12); tone(2650, 0.35, 'sine', 0.1, 0, 0.12); tone(2200, 0.3, 'sine', 0.08, 0, 0.3) }, // ting-ting
  whoosh: () => noise(0.14, 0.18, 1800, 'bandpass'),
  punch: () => { noise(0.12, 0.7, 1200, 'bandpass'); tone(140, 0.16, 'sine', 0.55, -90); tone(90, 0.12, 'triangle', 0.12, -40) }, // dhum!
  slap: () => { noise(0.07, 0.45, 2200, 'bandpass'); tone(500, 0.06, 'triangle', 0.1, -300) }, // thash!
  ouch: () => { const f = rnd([420, 520, 620]); tone(f, 0.3, 'triangle', 0.14, -f * 0.55, 0, 14); tone(f * 1.5, 0.25, 'triangle', 0.08, -f * 0.5, 0.03) },
  scream: () => { tone(900, 0.5, 'triangle', 0.09, 500, 0, 25); tone(1200, 0.5, 'sine', 0.07, 400, 0.02, 30) },
  cash: () => { tone(1568, 0.08, 'triangle', 0.1); tone(2093, 0.35, 'triangle', 0.1, 0, 0.07) }, // ka-ching
  news: () => seq([659, 784, 659, 523, 784, 1047], 0.13, 'triangle', 0.1, 0.2), // breaking-news sting
  whistle: () => tone(2300, 0.5, 'sine', 0.14, 300, 0, 140),
  crash: () => { noise(0.5, 0.7, 700); tone(70, 0.4, 'triangle', 0.25, -30) },
  clang: () => { tone(880, 0.5, 'triangle', 0.1, -40); tone(1320, 0.5, 'sine', 0.1, 0, 0.01); noise(0.05, 0.4, 3000, 'highpass') },
  fart: () => { tone(90, 0.35, 'triangle', 0.2, -35, 0, 40) }, // classic gag for a missed punch on a bystander
  // ---- meme sounds (synthesised, no audio files) ----
  boom: () => { tone(120, 0.9, 'sine', 0.6, -85); tone(60, 1.2, 'sine', 0.45, -25, 0.02); noise(0.12, 0.35, 300) }, // "vine boom"
  airhorn: () => { for (const d of [0, 0.3, 0.6]) for (const f of [466, 587, 698]) tone(f, 0.22, 'sawtooth', 0.05, 0, d); for (const f of [466, 587, 698]) tone(f, 0.7, 'sawtooth', 0.05, 0, 0.9) },
  scratch: () => { noise(0.4, 0.3, 1600, 'bandpass'); tone(1000, 0.3, 'sawtooth', 0.06, -800) }, // record scratch
  bruh: () => { tone(190, 0.55, 'sawtooth', 0.09, -90, 0, 5); tone(95, 0.55, 'sine', 0.2, -30) },
  violin: () => { [440, 415, 392, 370].forEach((f, i) => tone(f, 0.5, 'triangle', 0.14, -6, i * 0.5, 7)) }, // sad violin
  sparkle: () => seq([1319, 1568, 1976, 2637], 0.07, 'sine', 0.08, 0.3),
  rimshot: () => { tone(180, 0.1, 'sine', 0.3, -60); tone(140, 0.1, 'sine', 0.3, -40, 0.14); noise(0.5, 0.25, 6000, 'highpass', 0.3) },
  screech: () => { noise(0.45, 0.16, 2600, 'bandpass'); tone(1500, 0.4, 'triangle', 0.03, -500) },
  chandaOpen: () => seq([392, 523, 659, 784], 0.07, 'square', 0.05, 0.14),
  caught: () => seq([880, 988, 1175, 1568], 0.08, 'triangle', 0.1, 0.18),
}
const lastSfx = {}
export function sfx(name) {
  const now = performance.now()
  if (now - (lastSfx[name] || 0) < 70) return // no machine-gun stacking
  lastSfx[name] = now
  try { SFX[name]?.() } catch { /* audio must never break the game */ }
}

// ---------- Bengali voice clips ----------
const clips = new Map() // id -> AudioBuffer | 'fail' | Promise
const lastPlay = new Map()
let lastSay = 0, bnVoice, preloading = false
const base = import.meta.env.BASE_URL || '/'
function loadClip(id) {
  const c = clips.get(id)
  if (c) return c instanceof Promise ? c : Promise.resolve(c)
  const pr = fetch(`${base}audio/voice/${id}.mp3`).then((r) => { if (!r.ok) throw new Error('http'); return r.arrayBuffer() })
    .then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)))
    .then((buf) => { clips.set(id, buf); return buf }, () => { clips.set(id, 'fail'); return 'fail' })
  clips.set(id, pr)
  return pr
}
function preloadVoices() { // gentle background preload after the first tap; skipped on weak phones (clips then load on demand)
  if (preloading || !ctx || navigator.connection?.saveData) return
  preloading = true
  const ids = Object.values(VOICES)
  let k = 0
  const next = () => { if (k >= ids.length || !ctx) return; loadClip(ids[k++]).finally(() => setTimeout(next, 60)) }
  setTimeout(next, 1500)
}
export function say(text) {
  if (muted || !pref.sfx || !pref.voice) return
  const now = performance.now()
  if (now - lastSay < 1800) return
  const id = VOICES[text]
  if (id && ctx) {
    if (now - (lastPlay.get(id) || -1e9) < 20000) return // don't repeat the same clip constantly
    const c = clips.get(id)
    if (c && c !== 'fail' && !(c instanceof Promise)) {
      lastSay = now; lastPlay.set(id, now)
      const src = ctx.createBufferSource(); src.buffer = c; src.playbackRate.value = 0.93 + Math.random() * 0.2
      const g = ctx.createGain(); g.gain.value = 1
      src.connect(g); g.connect(voiceG); src.onended = () => { src.disconnect(); g.disconnect() }; src.start()
      return
    }
    if (!c) loadClip(id) // not decoded yet: fetch for next time
    if (c !== 'fail') return
  }
  if (!window.speechSynthesis) return
  try { // fallback: browser's own Bengali voice, if it has one
    bnVoice ??= speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('bn'))
    if (!bnVoice) { bnVoice = undefined; return }
    lastSay = now
    const u = new SpeechSynthesisUtterance(text)
    u.voice = bnVoice; u.lang = bnVoice.lang; u.rate = 1.05; u.pitch = rnd([0.8, 1, 1.3]); u.volume = 0.9 * pref.vv
    speechSynthesis.cancel(); speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

// ---------- original background music: bhupali-style pentatonic pluck + tabla-ish groove + tanpura drone ----------
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21] // Bhupali (C D E G A …) in semitones
const ROOT = 293.66 // D4
const PHR = [
  [0, null, 1, null, 2, null, 3, 2, 1, null, 0, null, 1, 2, null, null],
  [2, null, 3, null, 4, 3, 2, null, 3, null, 2, 1, 0, null, 1, null],
  [4, null, 5, 4, 3, null, 2, null, 1, 2, 3, null, 2, 1, 0, null],
  [5, null, 4, 3, 4, null, 2, 3, 1, null, 0, 1, 2, null, null, 0],
]
let mTimer = null, mStep = 0, mNext = 0, mBar = 0, drone = null
const BPM = 104, STEP = 60 / BPM / 2
function pluck(f, t, vol = 0.14, dur = 0.5) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain()
  o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); o2.connect(g); g.connect(musicG); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05)
}
function drum(t, kind) {
  const g = ctx.createGain(); g.connect(musicG)
  if (kind === 'dha') { // bayan: low thump with pitch bend
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.18)
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g); o.start(t); o.stop(t + 0.3)
  } else { // dayan: bright ringing tick
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(kind === 'na' ? 640 : 480, t)
    g.gain.setValueAtTime(kind === 'na' ? 0.18 : 0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.connect(g); o.start(t); o.stop(t + 0.14)
  }
}
function schedule() {
  if (!ctx) return
  while (mNext < ctx.currentTime + 0.4) {
    const t = Math.max(mNext, ctx.currentTime), st = mStep % 16
    if (st === 0) mBar++
    if ([0, 6, 10].includes(st)) drum(t, 'dha')
    else if ([2, 4, 8, 12, 14].includes(st)) drum(t, 'na')
    else if (st % 2 === 1) drum(t, 'te')
    const ph = PHR[(mBar >> 1) % 2 === 0 ? (mBar % 2 ? 0 : 1) : (mBar % 2 ? 2 : 3)]
    const n = ph[st]
    if (n != null) pluck(ROOT * Math.pow(2, SCALE[n] / 12), t, 0.15, st % 4 === 0 ? 0.7 : 0.4)
    mNext += STEP; mStep++
  }
}
function musicSync() {
  const want = !!ctx && active && pref.music && !muted
  if (want && !mTimer) {
    mNext = ctx.currentTime + 0.1; mStep = 0
    mTimer = setInterval(schedule, 120)
    if (!drone) { // soft tanpura-like drone: root + fifth
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420
      const dg = ctx.createGain(); dg.gain.value = 0.05; lp.connect(dg); dg.connect(musicG)
      const os = [ROOT / 2, ROOT * 0.75].map((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); return o })
      drone = { os, dg, lp }
    }
  } else if (!want && mTimer) {
    clearInterval(mTimer); mTimer = null
    if (drone) { drone.os.forEach((o) => { try { o.stop() } catch { /* ignore */ } o.disconnect() }); drone.dg.disconnect(); drone.lp.disconnect(); drone = null }
  }
}
