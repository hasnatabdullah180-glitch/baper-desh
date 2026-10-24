import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sky, PerformanceMonitor } from '@react-three/drei'
import City from './City.jsx'
import { Traffic, Npcs } from './Traffic.jsx'
import { Player, CameraRig } from './Player.jsx'
import Missions from './Missions.jsx'
import { G, step } from './sim'
import { hud } from './store'

function Sun({ shadows }) {
  const l = useRef()
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const light = l.current
    scene.add(light.target)
    return () => { scene.remove(light.target) }
  }, [scene])
  useFrame(() => {
    l.current.position.set(G.x + 38, 55, G.z + 24)
    l.current.target.position.set(G.x, 0, G.z)
    l.current.target.updateMatrixWorld()
  })
  return (
    <directionalLight ref={l} intensity={2.3} color="#fff0d2" castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004}
      shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-near={1} shadow-camera-far={160} />
  )
}

function Ready() {
  useEffect(() => { hud.set({ ready: true }) }, [])
  return null
}

function Sim() {
  const gl = useThree((s) => s.gl)
  useEffect(() => { if (import.meta.env.DEV) window.__gl = gl }, [gl])
  useFrame((_, dt) => step(dt), -10)
  return null
}

function Scene({ shadows }) {
  return (
    <>
      <hemisphereLight args={['#cfe4ff', '#6b6a52', 0.95]} />
      <Sun shadows={shadows} />
      <Sky distance={450000} sunPosition={[100, 45, 60]} turbidity={5} rayleigh={1.4} />
      <fog attach="fog" args={['#cfe0ec', 80, 320]} />
      <City />
      <Traffic />
      <Npcs />
      <Missions />
      <Player />
      <Sim />
      <CameraRig />
      <Ready />
    </>
  )
}

export default function Game() {
  const [fonts, setFonts] = useState(false)
  const [dpr, setDpr] = useState(1.25)
  const [shadows, setShadows] = useState(true)
  useEffect(() => {
    let on = true
    const done = () => on && setFonts(true)
    const load = document.fonts?.load('700 40px "Hind Siliguri"', 'অআকখ') ?? Promise.resolve()
    Promise.race([load, new Promise((r) => setTimeout(r, 2500))]).then(done, done)
    return () => { on = false }
  }, [])
  return (
    <Canvas shadows="percentage" dpr={dpr} camera={{ fov: 62, near: 0.1, far: 700, position: [40, 6, 56] }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <PerformanceMonitor ms={250} iterations={8} flipflops={3}
        onChange={({ factor }) => setDpr(Math.round((0.7 + 0.8 * factor) * 20) / 20)}
        onFallback={() => { setDpr(0.7); setShadows(false) }} />
      {fonts && <Suspense fallback={null}><Scene shadows={shadows} /></Suspense>}
    </Canvas>
  )
}
