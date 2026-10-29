import { useEffect, useRef } from 'react'
import { G } from './sim'
import { rects, ROADS, RW, PADS } from './world'
import { hud } from './store'

const S = 150, R = 62, K = S / 2 / R // canvas px, world radius, px per unit

// Heading-up minimap, redrawn at ~20 fps on its own timer (no React re-render).
export default function Minimap() {
  const ref = useRef()
  useEffect(() => {
    const c = ref.current, g = c.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = c.height = S * dpr; g.scale(dpr, dpr)
    const id = setInterval(() => {
      if (hud.get().phase !== 'play') return
      const sn = Math.sin(G.yaw), cs = Math.cos(G.yaw)
      // world offset -> minimap px (forward = up, same maths as the compass arrow)
      const P = (wx, wz) => { const dx = wx - G.x, dz = wz - G.z; return [S / 2 + (dx * cs - dz * sn) * K, S / 2 - (-dx * sn - dz * cs) * K] }
      g.clearRect(0, 0, S, S)
      g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, 7); g.clip()
      g.fillStyle = '#5d7348'; g.fillRect(0, 0, S, S)
      g.fillStyle = '#3b3e44'
      for (const r of ROADS) for (const h of [0, 1]) {
        const a = h ? P(r - RW / 2, -400) : P(-400, r - RW / 2), b = h ? P(r + RW / 2, -400) : P(-400, r + RW / 2)
        const e = h ? P(r - RW / 2, 400) : P(400, r - RW / 2), f = h ? P(r + RW / 2, 400) : P(400, r + RW / 2)
        g.beginPath(); g.moveTo(...a); g.lineTo(...e); g.lineTo(...f); g.lineTo(...b); g.closePath(); g.fill()
      }
      g.fillStyle = '#b9ab92'
      for (const q of rects) {
        if (Math.abs(q.x0 - G.x) > R * 1.5 && Math.abs(q.x1 - G.x) > R * 1.5) continue
        if (Math.abs(q.z0 - G.z) > R * 1.5 && Math.abs(q.z1 - G.z) > R * 1.5) continue
        const p1 = P(q.x0, q.z0), p2 = P(q.x1, q.z0), p3 = P(q.x1, q.z1), p4 = P(q.x0, q.z1)
        g.beginPath(); g.moveTo(...p1); g.lineTo(...p2); g.lineTo(...p3); g.lineTo(...p4); g.closePath(); g.fill()
      }
      const dot = (x, z, col, r = 4) => { const [px, py] = P(x, z); g.fillStyle = col; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill() }
      const sq = (x, z, col) => { const [px, py] = P(x, z); g.fillStyle = col; g.fillRect(px - 3.5, py - 3.5, 7, 7) }
      if (!G.mission) PADS.forEach((p) => sq(p.x, p.z, p.color))
      if (G.mission?.id === 'chanda') G.vendors.forEach((v) => { if (v.active && !v.done) dot(v.sx, v.sz, '#14b8a6', 4.5) })
      G.officers.forEach((o) => { const hot = o.st === 'run'; dot(o.x, o.z, hot ? '#ff3b4d' : '#4d8dff', hot ? 4 : 3) }) // police: blue on duty, red when chasing
      G.cops.forEach((c2) => dot(c2.x, c2.z, '#ff3b4d'))
      G.rivals.forEach((r) => dot(r.x, r.z, r.color))
      if (G.target) { // clamp objective to the rim so it is always findable
        let [px, py] = P(G.target[0], G.target[1])
        const vx = px - S / 2, vy = py - S / 2, d = Math.hypot(vx, vy), m = S / 2 - 8
        if (d > m) { px = S / 2 + (vx / d) * m; py = S / 2 + (vy / d) * m }
        g.fillStyle = '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 2
        g.beginPath(); g.arc(px, py, 5.5, 0, 7); g.fill(); g.stroke()
      }
      g.restore()
      // player (always centre, pointing up)
      g.fillStyle = '#fff'; g.strokeStyle = '#0d1224'; g.lineWidth = 2
      g.beginPath(); g.moveTo(S / 2, S / 2 - 8); g.lineTo(S / 2 + 6, S / 2 + 7); g.lineTo(S / 2, S / 2 + 3); g.lineTo(S / 2 - 6, S / 2 + 7); g.closePath(); g.fill(); g.stroke()
    }, 50)
    return () => clearInterval(id)
  }, [])
  return <canvas ref={ref} className="minimap" style={{ width: S, height: S }} />
}
