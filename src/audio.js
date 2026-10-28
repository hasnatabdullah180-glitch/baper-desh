// Procedural WebAudio engine — no audio files, nothing to fail to load.
const KEY = 'baperdesh.muted'
let ctx = null, master = null, amb = null, sir = null, mobG = null, eng = null, engG = null, engOn = false, engLvl = 0, engKind = 'car'
let muted = false
try { muted = localStorage.getItem(KEY) === '1' } catch { /* ignore */ }
let active = false, wantAmb = false, wantSiren = false, wantMob = false

export const isMuted = () => muted

export function initAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5
      // limiter + soft low-pass: no clipping, no harsh hiss
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.2
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7500
      master.connect(comp); comp.connect(lp); lp.connect(ctx.destination)
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
      o.type = 'triangle'; o.frequency.value = 850; lfo.frequency.value = 1.4; lg.gain.value = 260
      lfo.connect(lg); lg.connect(o.frequency)
      sir = ctx.createGain(); sir.gain.value = 0
      o.connect(sir); sir.connect(master); o.start(); lfo.start()
    } catch { ctx = null }
  }
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})
  apply()
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
export function setActive(a) { active = a; wantAmb = a || wantAmb; apply() }
export function siren(on) { wantSiren = on; apply() }
export function crowdLoop(on) { if (on !== wantMob) { wantMob = on; apply() } }

export function setMuted(m) {
  muted = m
  try { localStorage.setItem(KEY, m ? '1' : '0') } catch { /* ignore */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.03)
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
  horn: () => { tone(311, 0.4, 'triangle', 0.1); tone(392, 0.4, 'triangle', 0.1) },
  honk: () => { tone(420, 0.16, 'triangle', 0.11); tone(420, 0.2, 'triangle', 0.11, 0, 0.22) }, // pam-pam
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
  caught: () => seq([880, 988, 1175, 1568], 0.08, 'triangle', 0.1, 0.18),
}
const lastSfx = {}
export function sfx(name) {
  const now = performance.now()
  if (now - (lastSfx[name] || 0) < 70) return // no machine-gun stacking
  lastSfx[name] = now
  try { SFX[name]?.() } catch { /* audio must never break the game */ }
}

// Bengali voice lines (only if the browser has a bn voice installed; silently skipped otherwise)
let lastSay = 0, bnVoice
export function say(text) {
  if (muted || !window.speechSynthesis) return
  const now = performance.now()
  if (now - lastSay < 1800) return
  try {
    bnVoice ??= speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('bn'))
    if (!bnVoice) { bnVoice = undefined; return }
    lastSay = now
    const u = new SpeechSynthesisUtterance(text)
    u.voice = bnVoice; u.lang = bnVoice.lang; u.rate = 1.05; u.pitch = rnd([0.8, 1, 1.3]); u.volume = 0.9
    speechSynthesis.cancel(); speechSynthesis.speak(u)
  } catch { /* ignore */ }
}
