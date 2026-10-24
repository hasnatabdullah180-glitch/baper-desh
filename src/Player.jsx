import { Component, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { G } from './sim'
import { hud, bn } from './store'
import { camBlocked } from './world'
import { Person, RickshawBody } from './Traffic.jsx'

const URL = `${import.meta.env.BASE_URL}models/character.glb`
useGLTF.preload(URL)

export class ModelBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('Character model failed to load:', err); hud.set({ modelError: true }) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function Hero() {
  const { scene, animations } = useGLTF(URL)
  const root = useRef()
  const cur = useRef('Idle')
  const { actions, mixer } = useAnimations(animations, root)
  const k = useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene)
    const h = b.max.y - b.min.y
    return h > 0.3 && h < 20 ? 1.8 / h : 1
  }, [scene])
  useEffect(() => {
    scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false } })
    actions.Idle?.reset().play()
  }, [scene, actions])
  useFrame(() => {
    mixer.timeScale = hud.get().phase === 'pause' ? 0 : 1
    const rick = G.mode === 'rick'
    const want = !G.grounded ? 'Run' : rick ? (G.spd > 1.5 ? 'Walk' : 'Idle') : G.spd < 0.5 ? 'Idle' : G.spd < 5.5 ? 'Walk' : 'Run'
    if (want !== cur.current && actions[want]) {
      actions[want].reset().fadeIn(0.2).play()
      actions[cur.current]?.fadeOut(0.2)
      cur.current = want
    }
    if (actions.Walk) actions.Walk.timeScale = THREE.MathUtils.clamp(G.spd / 2.4, 0.8, 2)
    if (actions.Run) actions.Run.timeScale = THREE.MathUtils.clamp(G.spd / 6, 0.9, 1.6)
  })
  // the glTF faces -Z, game forward is +Z
  return <group ref={root}><group rotation={[0, Math.PI, 0]}><primitive object={scene} scale={k} /></group></group>
}

export function Player() {
  const g = useRef(), r = useRef(), c = useRef()
  useFrame((s) => {
    const rk = G.mode === 'rick'
    g.current.position.set(G.x, G.y, G.z)
    g.current.rotation.y = G.face
    g.current.rotation.z = rk ? Math.sin(s.clock.elapsedTime * 7) * 0.03 * Math.min(1, G.spd / 5) : 0
    r.current.visible = rk
    c.current.position.set(0, rk ? 0.5 : 0, rk ? 0.55 : 0)
    c.current.rotation.x = G.grounded ? 0 : -0.22
  })
  return (
    <group ref={g}>
      <group ref={r} visible={false}><RickshawBody color="#e63946" /></group>
      <group ref={c}>
        <ModelBoundary fallback={<Person c="#2a9d8f" />}>
          <Hero />
        </ModelBoundary>
      </group>
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
    let yaw = G.yaw, pitch = G.pitch, dist = G.mode === 'rick' ? 8 : 5.6
    if (ph === 'menu') { yaw = s.clock.elapsedTime * 0.15 + 0.6; pitch = 0.16; dist = 7 }
    tgt.set(G.x, G.y + 1.55, G.z)
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
