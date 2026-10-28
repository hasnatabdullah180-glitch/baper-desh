import { useEffect, useRef } from 'react'
import { G } from './sim'
import { useHud } from './store'

const R = 55 // joystick radius (px)

// On-screen controls for phones/tablets: floating joystick (left), camera drag (right), action buttons.
export default function Touch() {
  const prompt = useHud((s) => s.prompt)
  const ride = useHud((s) => s.ride)
  const base = useRef(), thumb = useRef()
  const joy = useRef(null), look = useRef(null)

  useEffect(() => () => { G.joy.x = G.joy.y = 0; G.keys.ShiftLeft = false }, [])

  const jDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    joy.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY }
    const b = base.current.style
    b.display = 'block'; b.left = e.clientX - R + 'px'; b.top = e.clientY - R + 'px'
    thumb.current.style.transform = 'translate(0,0)'
  }
  const jMove = (e) => {
    const j = joy.current
    if (!j || j.id !== e.pointerId) return
    let dx = e.clientX - j.ox, dy = e.clientY - j.oy
    const d = Math.hypot(dx, dy)
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R }
    G.joy.x = dx / R; G.joy.y = -dy / R
    thumb.current.style.transform = `translate(${dx}px,${dy}px)`
  }
  const jUp = (e) => {
    if (joy.current?.id !== e.pointerId) return
    joy.current = null; G.joy.x = G.joy.y = 0
    base.current.style.display = 'none'
  }

  const lDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); look.current = { id: e.pointerId, x: e.clientX, y: e.clientY } }
  const lMove = (e) => {
    const l = look.current
    if (!l || l.id !== e.pointerId) return
    G.lookT = G.t
    G.yaw -= (e.clientX - l.x) * 0.0065
    G.pitch = Math.max(-0.15, Math.min(1.2, G.pitch + (e.clientY - l.y) * 0.0055))
    l.x = e.clientX; l.y = e.clientY
  }
  const lUp = (e) => { if (look.current?.id === e.pointerId) look.current = null }

  // hold-to-repeat action buttons
  const hold = (fn, every = 0) => {
    let t
    return {
      onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); fn(true); if (every) t = setInterval(() => fn(true), every) },
      onPointerUp: () => { clearInterval(t); fn(false) },
      onPointerCancel: () => { clearInterval(t); fn(false) },
      onLostPointerCapture: () => { clearInterval(t); fn(false) },
    }
  }
  const punch = hold((d) => { if (d) G.punch = true }, 220)
  const jump = hold((d) => { G.keys.Space = d; if (d) G.jump = true })
  const act = hold((d) => { if (d) G.interact = true })
  const run = hold((d) => { G.keys.ShiftLeft = d })

  return (
    <div className="touchui">
      <div className="jzone tctl" onPointerDown={jDown} onPointerMove={jMove} onPointerUp={jUp} onPointerCancel={jUp} />
      <div className="lzone tctl" onPointerDown={lDown} onPointerMove={lMove} onPointerUp={lUp} onPointerCancel={lUp} />
      <div className="jbase" ref={base}><div className="jthumb" ref={thumb} /></div>
      <div className="tbtns">
        <button className={'tb act' + (prompt ? ' hot' : '')} {...act}>E</button>
        <button className="tb run" {...run}>{ride ? '🚀' : '⚡'}</button>
        <button className="tb jmp" {...jump}>{ride ? '🛑' : '⤴'}</button>
        <button className="tb pnch" {...punch}>{ride ? '📯' : '✊'}</button>
      </div>
    </div>
  )
}
