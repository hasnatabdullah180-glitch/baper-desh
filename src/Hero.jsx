import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOX, CYL, SPH, mat } from './gfx.jsx'
import { G } from './sim'

// Original cartoon hero, styled after the reference photos: bald head with a red tilak, huge bulging eyes,
// a big grin, orange kurta, white gamcha over the shoulders, gold chain, dhoti. Fully procedural — no model file to load.
const TOR = new THREE.TorusGeometry(1, 0.07, 6, 22)
const M = {
  skin: mat('#8a5a3c', { roughness: 0.7 }), kurta: mat('#ee8a2b'), dhoti: mat('#f4f1e8'), shawl: mat('#fbfaf5'),
  gold: mat('#ffcf3f', { metalness: 0.7, roughness: 0.25 }), eye: mat('#ffffff', { roughness: 0.25 }), pupil: mat('#0b0b0b'),
  tilak: mat('#d62828'), mouth: mat('#3a0d0d'), teeth: mat('#ffffff'), brow: mat('#101010'), sandal: mat('#3a2a1c'),
}
const damp = (c, t, dt, k = 14) => c + (t - c) * (1 - Math.exp(-k * dt))

export default function Hero() {
  const R = useRef({}), ph = useRef(0), side = useRef(1), prevP = useRef(0)
  const set = (k) => (e) => { R.current[k] = e }
  useFrame((s, dt) => {
    const A = R.current
    if (!A.root) return
    dt = Math.min(dt, 0.05)
    const t = s.clock.elapsedTime
    const ride = G.ride, rick = G.mode === 'rick'
    const sit = !!ride || rick
    A.root.visible = !(ride && ride.spec.hide)
    const spd = G.spd, air = !G.grounded && !sit
    const moving = !sit && !air && spd > 0.4
    ph.current += dt * (3 + spd * 1.25)
    const amp = moving ? Math.min(1, spd / 5) * (spd > 5.5 ? 1.15 : 0.7) : 0
    const sw = Math.sin(ph.current) * amp

    // punch: alternate fists, twist the torso
    const pt = G.punchT, lunge = pt > 0 && !ride ? Math.sin((1 - pt / 0.28) * Math.PI) : 0
    if (pt > prevP.current) side.current = -side.current
    prevP.current = pt
    const pL = side.current < 0 ? lunge : 0, pR = side.current > 0 ? lunge : 0

    // target pose
    let thL = sw * 0.9, thR = -sw * 0.9, shL = Math.max(0, sw) * 0.9, shR = Math.max(0, -sw) * 0.9
    let arL = -sw * 0.8, arR = sw * 0.8, foL = -(0.15 + amp * 0.7), foR = foL
    let lean = moving ? 0.08 + amp * 0.12 : 0, lz = 0
    if (sit) {
      thL = thR = -1.45; shL = shR = 1.5; arL = arR = -1.05; foL = foR = -0.3
      const st = ride ? ride.steer : 0
      lean = 0.1 + (ride ? Math.min(1, Math.abs(ride.sp) / 22) * 0.25 : 0); lz = -st * 0.15
      arL = -1.05 + st * 0.2; arR = -1.05 - st * 0.2
    } else if (air) {
      thL = -0.5; thR = -0.2; shL = 0.7; shR = 0.7; arL = arR = -2.5; foL = foR = -0.3
    }
    arL -= pL * 1.5; arR -= pR * 1.5; if (pL) foL = 0; if (pR) foR = 0

    A.thL.rotation.x = damp(A.thL.rotation.x, thL, dt); A.thR.rotation.x = damp(A.thR.rotation.x, thR, dt)
    A.shL.rotation.x = damp(A.shL.rotation.x, shL, dt); A.shR.rotation.x = damp(A.shR.rotation.x, shR, dt)
    A.arL.rotation.x = damp(A.arL.rotation.x, arL, dt, 22); A.arR.rotation.x = damp(A.arR.rotation.x, arR, dt, 22)
    A.foL.rotation.x = damp(A.foL.rotation.x, foL, dt); A.foR.rotation.x = damp(A.foR.rotation.x, foR, dt)
    A.torso.rotation.x = damp(A.torso.rotation.x, lean + lunge * 0.25, dt)
    A.torso.rotation.z = damp(A.torso.rotation.z, lz, dt)
    A.torso.rotation.y = side.current * lunge * 0.5
    A.torso.scale.y = 1 + Math.sin(t * 2.2) * 0.012
    A.root.position.y = moving ? Math.abs(Math.sin(ph.current)) * 0.06 * amp : 0

    // face: eyes bulge when angry/scared (mob meter) and on every punch; mouth opens when running / punching
    const bulge = 1 + Math.sin(t * 2.6) * 0.05 + Math.min(1, G.mob / 100) * 0.28 + lunge * 0.25
    A.eyes.scale.setScalar(bulge)
    A.mouth.scale.y = damp(A.mouth.scale.y, lunge > 0.1 || spd > 5.5 || air ? 2.3 : 1, dt, 20)
    A.head.rotation.x = damp(A.head.rotation.x, -lean * 0.8, dt)
  })
  return (
    <group ref={set('root')}>
      <group position={[0, 0.85, 0]}>
        {/* legs: dhoti thigh + bare shin + sandal */}
        {[-1, 1].map((sx) => {
          const k = sx < 0 ? 'L' : 'R'
          return (
            <group key={k} ref={set('th' + k)} position={[sx * 0.13, 0, 0]}>
              <mesh geometry={CYL} material={M.dhoti} position={[0, -0.23, 0]} scale={[0.15, 0.46, 0.15]} castShadow />
              <group ref={set('sh' + k)} position={[0, -0.45, 0]}>
                <mesh geometry={CYL} material={M.skin} position={[0, -0.2, 0]} scale={[0.085, 0.4, 0.085]} castShadow />
                <mesh geometry={BOX} material={M.sandal} position={[0, -0.41, 0.06]} scale={[0.13, 0.05, 0.26]} />
              </group>
            </group>
          )
        })}
        {/* body */}
        <group ref={set('torso')}>
          <mesh geometry={SPH} material={M.kurta} position={[0, 0.3, 0]} scale={[0.36, 0.4, 0.29]} castShadow />
          <mesh geometry={CYL} material={M.dhoti} position={[0, -0.02, 0]} scale={[0.3, 0.2, 0.25]} />
          <mesh geometry={BOX} material={M.shawl} position={[0, 0.63, 0]} scale={[0.74, 0.1, 0.4]} castShadow />
          <mesh geometry={BOX} material={M.shawl} position={[-0.17, 0.3, 0.24]} scale={[0.2, 0.7, 0.05]} rotation={[0, 0, -0.18]} />
          <mesh geometry={TOR} material={M.gold} position={[0, 0.56, 0.1]} rotation={[1.15, 0, 0]} scale={[0.21, 0.21, 0.21]} />
          <mesh geometry={SPH} material={M.gold} position={[0, 0.4, 0.24]} scale={[0.04, 0.04, 0.04]} />
          {/* arms */}
          {[-1, 1].map((sx) => {
            const k = sx < 0 ? 'L' : 'R'
            return (
              <group key={k} ref={set('ar' + k)} position={[sx * 0.38, 0.6, 0]}>
                <mesh geometry={CYL} material={M.kurta} position={[0, -0.15, 0]} scale={[0.085, 0.3, 0.085]} castShadow />
                <group ref={set('fo' + k)} position={[0, -0.3, 0]}>
                  <mesh geometry={CYL} material={M.skin} position={[0, -0.14, 0]} scale={[0.065, 0.28, 0.065]} />
                  <mesh geometry={SPH} material={M.skin} position={[0, -0.3, 0]} scale={[0.08, 0.08, 0.08]} />
                </group>
              </group>
            )
          })}
          {/* head */}
          <group ref={set('head')} position={[0, 0.86, 0]}>
            <mesh geometry={SPH} material={M.skin} scale={[0.2, 0.225, 0.2]} castShadow />
            {[-1, 1].map((sx) => <mesh key={sx} geometry={SPH} material={M.skin} position={[sx * 0.2, 0, 0]} scale={[0.04, 0.06, 0.04]} />)}
            <group ref={set('eyes')}>
              {[-1, 1].map((sx) => (
                <group key={sx} position={[sx * 0.078, 0.035, 0.165]}>
                  <mesh geometry={SPH} material={M.eye} scale={[0.075, 0.08, 0.075]} />
                  <mesh geometry={SPH} material={M.pupil} position={[0, 0, 0.065]} scale={[0.034, 0.034, 0.03]} />
                </group>
              ))}
            </group>
            {[-1, 1].map((sx) => <mesh key={sx} geometry={BOX} material={M.brow} position={[sx * 0.085, 0.125, 0.165]} rotation={[0, 0, sx * -0.28]} scale={[0.11, 0.024, 0.03]} />)}
            <mesh geometry={SPH} material={M.skin} position={[0, -0.03, 0.2]} scale={[0.04, 0.045, 0.04]} />
            <mesh geometry={BOX} material={M.tilak} position={[0, 0.155, 0.152]} rotation={[-0.7, 0, 0]} scale={[0.035, 0.075, 0.012]} />
            <mesh geometry={BOX} material={M.shawl} position={[0, 0.2, 0.1]} rotation={[-1.1, 0, 0]} scale={[0.14, 0.01, 0.02]} />
            <group ref={set('mouth')} position={[0, -0.105, 0.172]}>
              <mesh geometry={BOX} material={M.mouth} scale={[0.13, 0.04, 0.02]} />
              <mesh geometry={BOX} material={M.teeth} position={[0, 0.012, 0.012]} scale={[0.1, 0.014, 0.01]} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
