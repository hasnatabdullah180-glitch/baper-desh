import { useSyncExternalStore } from 'react'
import { sfx, isMuted, setMuted } from './audio'

const KEY = 'baperdesh.save.v1'
let saved = {}
try { saved = JSON.parse(localStorage.getItem(KEY)) || {} } catch { /* ignore */ }

const subs = new Set()
let s = {
  phase: 'menu', // menu | play | pause
  ready: false,
  modelError: false,
  xp: saved.xp || 0,
  chaos: saved.chaos || 0,
  best: saved.best || {},
  wanted: 0,
  mission: null, // {id,title}
  obj: '',
  left: 0,
  prompt: '',
  toasts: [],
  result: null,
  muted: isMuted(),
}

export const hud = {
  get: () => s,
  set(p) { s = { ...s, ...p }; subs.forEach((f) => f()) },
}
export const useHud = (sel) => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb) }, () => sel(s))

export const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d])
export const levelStart = (n) => 120 * (n - 1) * (n - 1)
export const levelOf = (xp) => Math.floor(Math.sqrt(xp / 120)) + 1

export function saveNow() {
  try { localStorage.setItem(KEY, JSON.stringify({ xp: s.xp, chaos: s.chaos, best: s.best })) } catch { /* ignore */ }
}

let tid = 0
export function toast(text, kind = 'info') {
  const id = ++tid
  if (kind !== 'info') sfx(kind)
  hud.set({ toasts: [...s.toasts, { id, text, kind }].slice(-4) })
  setTimeout(() => hud.set({ toasts: s.toasts.filter((t) => t.id !== id) }), 3200)
}

export function addXp(n) {
  const before = levelOf(s.xp)
  hud.set({ xp: s.xp + Math.round(n) })
  const after = levelOf(s.xp)
  if (after > before) toast(`লেভেল আপ! তুমি এখন লেভেল ${bn(after)} — আসল ঢাকাইয়া!`, 'level')
  saveNow()
}

export function addChaos(n, text) {
  hud.set({ chaos: s.chaos + n })
  addXp(n * 0.25)
  if (text) toast(`${text} +${bn(n)}`, 'chaos')
}

export function recordBest(id, t) {
  const cur = s.best[id]
  if (!cur || t < cur) { hud.set({ best: { ...s.best, [id]: Math.round(t * 10) / 10 } }); saveNow() }
}

export function toggleMute() { const m = !s.muted; setMuted(m); hud.set({ muted: m }) }
