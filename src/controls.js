import { useEffect } from 'react'
import { G, resetGame, chandaChoose } from './sim'
import { hud, toggleMute } from './store'
import { initAudio, setActive, siren, sfx } from './audio'

export function lock() {
  const c = document.querySelector('canvas:not(.minimap)')
  if (!c?.requestPointerLock) { G.noLock = true; return }
  try {
    const p = c.requestPointerLock()
    p?.catch?.(() => { G.noLock = true })
  } catch { G.noLock = true }
}
export function setTouch() {
  if (hud.get().touch) return
  G.noLock = true
  document.body.classList.add('touch')
  hud.set({ touch: true })
}
function goFullscreen() {
  if (!hud.get().touch) return
  try { document.documentElement.requestFullscreen?.()?.catch?.(() => {}) } catch { /* ignore */ }
  try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}) } catch { /* ignore */ }
}
export function startGame() { resetGame(); initAudio(); setActive(true); goFullscreen(); hud.set({ phase: 'play' }); lock() }
export function pauseGame() { if (hud.get().phase !== 'play') return; hud.set({ phase: 'pause' }); setActive(false); document.exitPointerLock?.() }
export function resumeGame() { initAudio(); setActive(true); hud.set({ phase: 'play' }); lock() }
export function toMenu() { resetGame(); setActive(false); siren(false); hud.set({ phase: 'menu' }); document.exitPointerLock?.() }
export function chooseChanda(k) { chandaChoose(k); sfx('chandaOpen'); lock() }
export function dismissResult() { hud.set({ result: null }); lock() }

export function useInput() {
  useEffect(() => {
    const kd = (e) => {
      const st = hud.get()
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
      G.keys[e.code] = true
      if (e.repeat) return
      if (e.code === 'KeyM') toggleMute()
      if (st.menu) { const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Escape: -1, KeyE: -1 }[e.code]; if (k !== undefined) { chooseChanda(k); return } }
      if (st.phase === 'play' && !st.result) {
        if (e.code === 'Space') G.jump = true
        if (e.code === 'KeyE') G.interact = true
        if (e.code === 'KeyF') G.punch = true
        if (e.code === 'KeyH') G.horn = true
        if (e.code === 'KeyP') pauseGame()
      } else if (e.code === 'KeyP' && st.phase === 'pause') resumeGame()
      if (e.code === 'Enter' && st.result) dismissResult()
    }
    const ku = (e) => { G.keys[e.code] = false }
    const mm = (e) => {
      if (hud.get().phase !== 'play') return
      if (document.pointerLockElement || e.buttons) {
        G.lookT = G.t
        G.yaw -= e.movementX * 0.0026
        G.pitch = Math.max(-0.15, Math.min(1.2, G.pitch + e.movementY * 0.0022))
      }
    }
    const md = (e) => {
      const st = hud.get()
      if (st.touch) return
      if (st.phase === 'play' && !st.result && e.button === 0 && document.pointerLockElement) { G.punch = true; return }
      if (st.phase === 'play' && !st.result && !document.pointerLockElement && !G.noLock && e.target.tagName === 'CANVAS' && !e.target.classList.contains('minimap')) lock()
    }
    const plc = () => {
      const st = hud.get()
      if (!document.pointerLockElement && st.phase === 'play' && !st.result && !st.menu && !G.menuOpen && !G.noLock && performance.now() > (G.noPauseUntil || 0)) pauseGame()
    }
    const plerr = () => { G.noLock = true }
    const blur = () => { G.keys = {}; pauseGame() }
    if (window.matchMedia?.('(pointer: coarse)').matches) setTouch()
    const ts = () => setTouch()
    window.addEventListener('touchstart', ts, { once: true, passive: true })
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mousedown', md)
    window.addEventListener('blur', blur)
    document.addEventListener('pointerlockchange', plc)
    document.addEventListener('pointerlockerror', plerr)
    return () => {
      window.removeEventListener('touchstart', ts)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mousedown', md)
      window.removeEventListener('blur', blur)
      document.removeEventListener('pointerlockchange', plc)
      document.removeEventListener('pointerlockerror', plerr)
    }
  }, [])
}
