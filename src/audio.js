// Procedural WebAudio engine — no audio files, nothing to fail to load.
const KEY = 'baperdesh.muted'
let ctx = null, master = null, amb = null, sir = null, mobG = null
let muted = false
try { muted = localStorage.getItem(KEY) === '1' } catch { /* ignore */ }
let active = false, wantAmb = false, wantSiren = false, wantMob = false

export const isMuted = () => muted

export function initAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination)
      // looped brown-ish noise: city ambience + crowd murmur share it
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0)
      let last = 0
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5 }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
      amb = ctx.createGain(); amb.gain.value = 0
      src.connect(amb); amb.connect(master); src.start()
      // angry crowd: band-passed noise wobbling like shouting
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 1.4
      mobG = ctx.createGain(); mobG.gain.value = 0
      const wob = ctx.createOscillator(), wg = ctx.createGain(); wob.frequency.value = 4.5; wg.gain.value = 0.5
      wob.connect(wg); wg.connect(mobG.gain); wob.start()
      src.connect(bp); bp.connect(mobG); mobG.connect(master)
      // police siren: square wave swept by an LFO
      const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain()
      o.type = 'square'; o.frequency.value = 850; lfo.frequency.value = 1.4; lg.gain.value = 260
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
  amb.gain.setTargetAtTime(active && wantAmb ? 0.07 : 0, t, 0.15)
  sir.gain.setTargetAtTime(active && wantSiren ? 0.035 : 0, t, 0.1)
  mobG.gain.setTargetAtTime(active && wantMob ? 0.5 : 0, t, 0.25)
}
export function setActive(a) { active = a; wantAmb = a || wantAmb; apply() }
export function siren(on) { wantSiren = on; apply() }
export function crowdLoop(on) { if (on !== wantMob) { wantMob = on; apply() } }

export function setMuted(m) {
  muted = m
  try { localStorage.setItem(KEY, m ? '1' : '0') } catch { /* ignore */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.03)
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
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  n.connect(f); f.connect(g); g.connect(master); n.start(t)
}
const seq = (notes, step = 0.09, type = 'triangle', vol = 0.22, dur = 0.25) => notes.forEach((f, i) => f && tone(f, dur, type, vol, 0, i * step))
const rnd = (a) => a[Math.floor(Math.random() * a.length)]

const SFX = {
  chaos: () => { tone(660, 0.1, 'square', 0.12); tone(990, 0.14, 'square', 0.12, 0, 0.07) },
  bad: () => { noise(0.25, 0.5, 500); tone(110, 0.2, 'sine', 0.4, -60) },
  level: () => seq([523, 659, 784, 1047, 1319], 0.1),
  mission: () => tone(440, 0.12, 'triangle', 0.25),
  win: () => seq([523, 659, 784, 659, 784, 1047, 1047, 1319], 0.11),
  fail: () => { // sad trombone: wah wah wah waaah
    tone(233, 0.35, 'sawtooth', 0.18, -8, 0, 5); tone(220, 0.35, 'sawtooth', 0.18, -8, 0.4, 5)
    tone(208, 0.35, 'sawtooth', 0.18, -8, 0.8, 5); tone(196, 0.9, 'sawtooth', 0.18, -60, 1.2, 12)
  },
  jump: () => { tone(220, 0.22, 'sine', 0.2, 380); tone(660, 0.12, 'triangle', 0.08, -200, 0.18) }, // boing
  horn: () => { tone(311, 0.4, 'square', 0.1); tone(392, 0.4, 'square', 0.1) },
  honk: () => { tone(420, 0.16, 'square', 0.11); tone(420, 0.2, 'square', 0.11, 0, 0.22) }, // pam-pam
  bell: () => { tone(2200, 0.35, 'sine', 0.12); tone(2650, 0.35, 'sine', 0.1, 0, 0.12); tone(2200, 0.3, 'sine', 0.08, 0, 0.3) }, // ting-ting
  whoosh: () => noise(0.14, 0.18, 1800, 'bandpass'),
  punch: () => { noise(0.12, 0.7, 1200, 'bandpass'); tone(140, 0.16, 'sine', 0.55, -90); tone(90, 0.12, 'square', 0.12, -40) }, // dhum!
  slap: () => { noise(0.07, 0.8, 3000, 'highpass'); tone(500, 0.06, 'square', 0.1, -300) }, // thash!
  ouch: () => { const f = rnd([420, 520, 620]); tone(f, 0.3, 'sawtooth', 0.14, -f * 0.55, 0, 14); tone(f * 1.5, 0.25, 'triangle', 0.08, -f * 0.5, 0.03) },
  scream: () => { tone(900, 0.5, 'sawtooth', 0.09, 500, 0, 25); tone(1200, 0.5, 'sine', 0.07, 400, 0.02, 30) },
  cash: () => { tone(1568, 0.08, 'square', 0.1); tone(2093, 0.35, 'square', 0.1, 0, 0.07) }, // ka-ching
  news: () => seq([659, 784, 659, 523, 784, 1047], 0.13, 'square', 0.1, 0.2), // breaking-news sting
  whistle: () => tone(2300, 0.5, 'sine', 0.14, 300, 0, 140),
  crash: () => { noise(0.5, 0.7, 700); tone(70, 0.4, 'square', 0.25, -30) },
  clang: () => { tone(880, 0.5, 'square', 0.1, -40); tone(1320, 0.5, 'sine', 0.1, 0, 0.01); noise(0.05, 0.4, 3000, 'highpass') },
  fart: () => { tone(90, 0.35, 'sawtooth', 0.2, -35, 0, 40) }, // classic gag for a missed punch on a bystander
  caught: () => seq([880, 988, 1175, 1568], 0.08, 'square', 0.1, 0.18),
}
export function sfx(name) { try { SFX[name]?.() } catch { /* audio must never break the game */ } }

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
