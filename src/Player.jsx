import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { G } from './sim'
import { hud, bn } from './store'
import { SPH, mat } from './gfx.jsx'
import { camBlocked } from './world'
import { RickshawBody } from './Traffic.jsx'
import Hero from './Hero.jsx'

const fistM = mat('#e0a070', { emissive: '#ff9f1c', emissiveIntensity: 0.6 })
// where the hero sits on each vehicle (hips pivot is 0.85 above the root)
const SEAT = { car: [0, 0.1, 0.3], ezy: [0, 0.21, 0.2], bike: [0, 0.32, -0.2], rick: [0, 0.5, 0.6], bus: [0, 1, 3] }
export function Player() {
  const g = useRef(), r = useRef(), c = useRef(), fist = useRef(), side = useRef(0.22), prev = useRef(0)
  useFrame((s) => {
    const rk = G.mode === 'rick', ride = G.ride
    g.current.position.set(G.x, G.y, G.z)
    g.current.rotation.y = G.face
    g.current.rotation.z = rk ? Math.sin(s.clock.elapsedTime * 7) * 0.03 * Math.min(1, G.spd / 5) : 0
    r.current.visible = rk
    const pt = G.punchT, lunge = pt > 0 && !ride ? Math.sin((1 - pt / 0.28) * Math.PI) : 0
    if (pt > prev.current) side.current = -side.current
    prev.current = pt
    if (ride) c.current.position.set(...(SEAT[ride.type] || [0, 0, 0]))
    else c.current.position.set(0, rk ? 0.5 : 0, (rk ? 0.55 : 0) + lunge * 0.35)
    c.current.rotation.x = ride ? 0 : (G.grounded ? 0 : -0.22) + lunge * 0.5
    fist.current.visible = pt > 0 && !rk && !ride
    fist.current.position.set(side.current, 1.25, 0.5 + lunge * 0.9)
    fist.current.scale.setScalar(0.15 + lunge * 0.1)
  })
  return (
    <group ref={g}>
      <mesh ref={fist} geometry={SPH} material={fistM} visible={false} />
      <group ref={r} visible={false}><RickshawBody color="#e63946" /></group>
      <group ref={c}><Hero /></group>
    </group>
  )
}

const tgt = new THREE.Vector3(), des = new THREE.Vector3()
export function CameraRig() {
  const { camera } = useThree()
  useFrame((s, dt) => {
    const ph = hud.get().phase
    if (ph === 'pause') return
    dt = Math.min(dt, 0.05)
    let yaw = G.yaw, pitch = G.pitch, dist = G.ride ? G.ride.spec.cam : G.mode === 'rick' ? 8 : 5.6
    if (import.meta.env.DEV && window.__camDist) dist = window.__camDist
    if (ph === 'menu') { yaw = s.clock.elapsedTime * 0.15 + 0.6; pitch = 0.16; dist = 7 }
    tgt.set(G.x, G.y + (G.ride ? (G.ride.type === 'bus' ? 2.6 : 1.9) : 1.55), G.z)
    const cp = Math.cos(pitch), dx = Math.sin(yaw) * cp, dy = Math.sin(pitch), dz = Math.cos(yaw) * cp
    let d = dist
    for (let t = 0.6; t <= dist; t += 0.4) {
      if (camBlocked(tgt.x + dx * t, tgt.y + dy * t, tgt.z + dz * t)) { d = Math.max(1.2, t - 0.6); break }
    }
    des.set(tgt.x + dx * d, Math.max(0.6, tgt.y + dy * d), tgt.z + dz * d)
    camera.position.lerp(des, 1 - Math.exp(-(d < dist ? 25 : 12) * dt))
    camera.lookAt(tgt)

    // objective compass (direct DOM write, no React re-render)
    const arrow = document.getElementById('objArrow')
    if (arrow && G.target) {
      const tx = G.target[0] - G.x, tz = G.target[1] - G.z
      const sn = Math.sin(G.yaw), cs = Math.cos(G.yaw)
      arrow.style.transform = `rotate(${Math.atan2(tx * cs - tz * sn, -tx * sn - tz * cs)}rad)`
      const label = document.getElementById('objDist')
      if (label) {
        let txt = `${bn(Math.round(Math.hypot(tx, tz)))} মি`
        if (G.mission?.id === 'chase' && G.nearestCop) txt += ` · পুলিশ ${bn(Math.round(G.nearestCop))} মি`
        if (label.textContent !== txt) label.textContent = txt
      }
    }
  })
  return null
}
