import { useProgress } from '@react-three/drei'
import Minimap from './Minimap.jsx'
import { useHud, bn, levelOf, levelStart, toggleMute } from './store'
import { startGame, resumeGame, pauseGame, toMenu, dismissResult } from './controls'

const CONTROLS = [
  ['W A S D', 'চলো'], ['মাউস', 'ক্যামেরা ঘোরাও'], ['Space', 'লাফ দাও'],
  ['Shift', 'দৌড়াও'], ['E', 'ইন্টারঅ্যাক্ট / মিশন শুরু'], ['P / Esc', 'বিরতি'], ['M', 'শব্দ চালু/বন্ধ'],
]
const NAMES = { boss: 'ট্রাফিক বস', race: 'রিকশা রেসার', chase: 'পুলিশ চেজ' }

function Controls() {
  return (
    <div className="controls">
      {CONTROLS.map(([k, v]) => (
        <div key={k}><kbd>{k}</kbd><span>{v}</span></div>
      ))}
    </div>
  )
}

const fmt = (s) => `${bn(String(Math.floor(s / 60)).padStart(2, '0'))}:${bn(String(Math.floor(s % 60)).padStart(2, '0'))}`

function MuteLabel() {
  const m = useHud((s) => s.muted)
  return m ? '🔇 শব্দ বন্ধ (M)' : '🔊 শব্দ চালু (M)'
}

function MuteBtn() {
  const m = useHud((s) => s.muted)
  return <button className="pausebtn" onClick={toggleMute} title="M">{m ? '🔇' : '🔊'}</button>
}

function Start() {
  const ready = useHud((s) => s.ready)
  const err = useHud((s) => s.modelError)
  const xp = useHud((s) => s.xp)
  const chaos = useHud((s) => s.chaos)
  const best = useHud((s) => s.best)
  const pct = Math.round(useProgress((p) => p.progress))
  return (
    <div className="screen menu">
      <div className="titlebox">
        <h1>বাপের দেশ</h1>
        <p className="sub">BAPER DESH · ঢাকার রাস্তায় চরম গোলমাল!</p>
        <button className="big" disabled={!ready} onClick={startGame}>
          {ready ? 'খেলা শুরু করো ▶  Start Game' : `শহর লোড হচ্ছে… ${bn(pct)}%`}
        </button>
        <div><button className="ghost" onClick={toggleMute}><MuteLabel /></button></div>
        {err && <p className="warn">⚠ ক্যারেক্টার মডেল লোড হয়নি — সাময়িক ডামি মডেল দিয়ে চলছে।</p>}
      </div>
      <div className="panels">
        <section className="panel">
          <h3>কন্ট্রোল</h3>
          <Controls />
        </section>
        <section className="panel">
          <h3>তোমার রেকর্ড</h3>
          <div className="stat"><b>লেভেল {bn(levelOf(xp))}</b><span>{bn(xp)} XP</span></div>
          <div className="stat"><b>চাওস পয়েন্ট</b><span>{bn(chaos)}</span></div>
          {Object.keys(NAMES).map((k) => (
            <div className="stat" key={k}><b>{NAMES[k]}</b><span>{best[k] ? `সেরা ${bn(best[k])} সে.` : '—'}</span></div>
          ))}
        </section>
        <section className="panel">
          <h3>মিশন</h3>
          <p className="tiny">প্লাজার জ্বলজ্বলে প্যাডে গিয়ে <kbd>E</kbd> চাপো।<br />ট্রাফিক বস · রিকশা রেসার · পুলিশ চেজ<br />বেশি গোলমাল করলে পুলিশ নিজেই তাড়া করবে!</p>
        </section>
      </div>
    </div>
  )
}

function Hud() {
  const xp = useHud((s) => s.xp)
  const chaos = useHud((s) => s.chaos)
  const wanted = useHud((s) => s.wanted)
  const mission = useHud((s) => s.mission)
  const obj = useHud((s) => s.obj)
  const left = useHud((s) => s.left)
  const prompt = useHud((s) => s.prompt)
  const toasts = useHud((s) => s.toasts)
  const lv = levelOf(xp)
  const pct = ((xp - levelStart(lv)) / (levelStart(lv + 1) - levelStart(lv))) * 100
  return (
    <div className="hud">
      <div className="tl panel">
        <div className="lvl"><span className="badge">{bn(lv)}</span><div><small>লেভেল</small><div className="xpbar"><i style={{ width: pct + '%' }} /></div></div></div>
        <div className="chaos">🔥 চাওস পয়েন্ট <b>{bn(chaos)}</b></div>
      </div>
      <div className="tc">
        <div className={'panel mission' + (mission ? '' : ' idle')}>
          {mission ? (
            <>
              <small>{mission.title}</small>
              <div className="obj">{obj || '…'}</div>
              <div className={'timer' + (left <= 10 ? ' low' : '')}>{fmt(left)}</div>
            </>
          ) : (
            <><small>ফ্রি রোম</small><div className="obj">প্লাজার প্যাডে গিয়ে <kbd>E</kbd> চাপো</div></>
          )}
        </div>
        <div className="compass"><div id="objArrow">▲</div><span id="objDist" /></div>
      </div>
      <div className="tr">
        <div className="panel wanted">
          <small>ওয়ান্টেড</small>
          <div>{[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < wanted ? 'on' : ''}>★</span>)}</div>
        </div>
        <div className="btns"><MuteBtn /><button className="pausebtn" onClick={pauseGame}>⏸ বিরতি</button></div>
      </div>
      <div className="br"><Minimap /></div>
      <div className="bl panel"><Controls /></div>
      <div className="bc">
        {prompt && <div className="prompt">{prompt}</div>}
        {toasts.map((t) => <div key={t.id} className={'toast ' + t.kind}>{t.text}</div>)}
      </div>
    </div>
  )
}

function Pause() {
  return (
    <div className="screen pause">
      <div className="card">
        <h2>বিরতি</h2>
        <button className="big" onClick={resumeGame}>▶ চালিয়ে যাও (Resume)</button>
        <div><button className="ghost" onClick={toMenu}>মেনুতে ফিরে যাও</button></div>
        <div><button className="ghost" onClick={toggleMute}><MuteLabel /></button></div>
        <Controls />
      </div>
    </div>
  )
}

function Result() {
  const r = useHud((s) => s.result)
  if (!r) return null
  return (
    <div className="screen pause">
      <div className={'card result ' + (r.ok ? 'ok' : 'fail')}>
        <small>{r.title}</small>
        <h2>{r.ok ? 'মিশন সম্পন্ন!' : 'মিশন ব্যর্থ!'}</h2>
        <p className="msg">{r.msg}</p>
        <div className="rewards">
          <div><b>{fmt(r.time)}</b><span>সময়</span></div>
          <div><b>+{bn(r.xp)}</b><span>XP</span></div>
          <div><b>+{bn(r.chaos)}</b><span>চাওস</span></div>
        </div>
        <button className="big" onClick={dismissResult}>চালিয়ে যাও ↵</button>
      </div>
    </div>
  )
}

export default function UI() {
  const phase = useHud((s) => s.phase)
  return (
    <>
      {phase === 'menu' && <Start />}
      {phase !== 'menu' && <Hud />}
      {phase === 'pause' && <Pause />}
      <Result />
    </>
  )
}
