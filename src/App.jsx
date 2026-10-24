import { lazy, Suspense } from 'react'
import UI from './UI.jsx'
import { useInput } from './controls'
import { G, startMission, step } from './sim'
import { hud } from './store'
import { rects } from './world'

// dev-only test hooks
if (import.meta.env.DEV) Object.assign(window, { __G: G, __hud: hud, __startMission: startMission, __step: step, __rects: rects })

const Game = lazy(() => import('./Game.jsx'))

export default function App() {
  useInput()
  return (
    <>
      <Suspense fallback={null}><Game /></Suspense>
      <UI />
    </>
  )
}
