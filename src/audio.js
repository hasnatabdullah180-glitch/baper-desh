// Tiny procedural WebAudio engine — no audio files, nothing to fail to load.
const KEY = 'baperdesh.muted'
let ctx = null, master = null, amb = null, sir = null
let muted = false
try { muted = localStorage.getItem(KEY) === '1' } catch { /* ignore */ }
let active = false, wantAmb = false, wantSiren = false

export const isMuted = () => muted

export function initAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination)
      // city ambience: looped low-passed noise
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0)
      let last = 0
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5 }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
      amb = ctx.createGain(); amb.gain.value = 0
      src.connect(amb); amb.connect(master); src.start()
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
}
export function setActive(a) { active = a; wantAmb = a || wantAmb; apply() }
export function siren(on) { wantSiren = on; apply() }

export function setMuted(m) {
  muted = m
  try { localStorage.setItem(KEY, m ? '1' : '0') } catch { /* ignore */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.03)
}

function tone(f, dur, type = 'sine', vol = 0.25, slide = 0, delay = 0) {
  if (!ctx || muted) return
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(f, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05)
}
function thud() {
  if (!ctx || muted) return
  const t = ctx.currentTime, n = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  n.buffer = b
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500
  const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
  n.connect(f); f.connect(g); g.connect(master); n.start(t)
  tone(110, 0.2, 'sine', 0.4, -60)
}

const ARP = (notes, step = 0.09, type = 'triangle') => notes.forEach((f, i) => tone(f, 0.25, type, 0.22, 0, i * step))
export function sfx(name) {
  switch (name) {
    case 'chaos': tone(660, 0.1, 'square', 0.12); tone(990, 0.14, 'square', 0.12, 0, 0.07); break
    case 'bad': thud(); break
    case 'level': ARP([523, 659, 784, 1047, 1319], 0.1); break
    case 'mission': tone(440, 0.12, 'triangle', 0.25); break
    case 'win': ARP([523, 659, 784, 659, 784, 1047], 0.11); break
    case 'fail': ARP([392, 330, 262, 196], 0.16, 'sawtooth'); break
    case 'jump': tone(300, 0.14, 'sine', 0.18, 280); break
    case 'horn': tone(311, 0.4, 'square', 0.1); tone(392, 0.4, 'square', 0.1); break
    default:
  }
}
