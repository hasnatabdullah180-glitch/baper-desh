import { useProgress } from '@react-three/drei'
import Minimap from './Minimap.jsx'
import Touch from './Touch.jsx'
import { useHud, bn, levelOf, levelStart, toggleMute, taka, setAudioPref } from './store'
import { startGame, resumeGame, pauseGame, toMenu, dismissResult, chooseChanda } from './controls'

const CONTROLS = [
  ['W A S D', 'চলো'], ['মাউস', 'ক্যামেরা ঘোরাও'], ['Space', 'লাফ দাও'],
  ['Shift', 'দৌড়াও'], ['E', 'গাড়িতে ওঠো-নামো / মিশন'], ['F / ক্লিক', 'ঘুষি মারো'], ['H', 'হর্ন (গাড়িতে)'], ['Space', 'ব্রেক/ড্রিফট (গাড়িতে)'], ['P / Esc', 'বিরতি'], ['M', 'শব্দ চালু/বন্ধ'],
]
const TOUCH_CONTROLS = [['বাঁ দিকে স্লাইড', 'চলো (পুরো ঠেললে দৌড়)'], ['ডান দিকে ড্র্যাগ', 'ক্যামেরা ঘোরাও'], ['✊ (গাড়িতে 📯)', 'ঘুষি মারো / হর্ন'], ['⤴', 'লাফ / গাড়িতে ব্রেক'], ['⚡', 'দৌড় / নাইট্রো'], ['E', 'গাড়িতে ওঠো-নামো / মিশন']]
const NAMES = { boss: 'ট্রাফিক বস', race: 'রিকশা রেসার', chase: 'পুলিশ চেজ', cng: 'অটো ধর', chanda: 'ফুটপাত চাঁদা' }

function Controls() {
  const touch = useHud((s) => s.touch)
  return (
    <div className="controls">
      {(touch ? TOUCH_CONTROLS : CONTROLS).map(([k, v], i) => (
        <div key={i}><kbd>{k}</kbd><span>{v}</span></div>
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

function AudioPanel() {
  const a = useHud((s) => s.aud)
  const rows = [['music', 'mv', '🎵 গান'], ['sfx', 'sv', '🔊 ইফেক্ট'], ['voice', 'vv', '🗣 ভয়েস']]
  return (
    <div className="audpanel">
      {rows.map(([on, vol, label]) => (
        <label key={on} className="audrow">
          <button type="button" className={'audtog' + (a[on] ? ' on' : '')} onClick={() => setAudioPref({ [on]: !a[on] })}>{a[on] ? 'চালু' : 'বন্ধ'}</button>
          <span>{label}</span>
          <input type="range" min="0" max="1" step="0.05" value={a[vol]} onChange={(e) => setAudioPref({ [vol]: +e.target.value })} aria-label={label} />
        </label>
      ))}
    </div>
  )
}

function ChandaMenu() {
  const m = useHud((s) => s.menu)
  if (!m) return null
  const OPT = [['চাঁদা নিন', '৳৫০০'], ['বেশি চান', '৳১,০০০ (ঝুঁকি!)'], ['ছেড়ে দিন', '+২৫ XP'], ['ধমক দিন', '৳৩০০ + পুলিশের নজর']]
  return (
    <div className="chmenu" onPointerDown={(e) => e.stopPropagation()}>
      <small>{m.shop} · ভার্চুয়াল চাঁদা (শুধুই খেলা!)</small>
      <div className="chline">বিক্রেতা: “{m.line}”</div>
      {OPT.map(([t, sub], i) => (
        <button key={i} className={'chopt c' + i} onClick={() => chooseChanda(i)}><kbd>{bn(i + 1)}</kbd><b>{t}</b><span>{sub}</span></button>
      ))}
      <button className="chclose" onClick={() => chooseChanda(-1)}>পরে আসব (Esc)</button>
    </div>
  )
}

function ChandaMeter() {
  const cm = useHud((s) => s.cm)
  const mission = useHud((s) => s.mission)
  if (!cm || mission?.id !== 'chanda') return null
  return (
    <div className={'panel chmeter' + (cm.pct >= 70 ? ' hot' : '')}>
      <div>💰 ভার্চুয়াল চাঁদা <b>{taka(cm.cash)}</b></div>
      <div className="meter mob"><span>🚨 পুলিশ মামার সন্দেহ</span><div><i style={{ width: cm.pct + '%' }} /></div></div>
    </div>
  )
}

function Start() {
  const ready = useHud((s) => s.ready)
  const err = useHud((s) => s.modelError)
  const xp = useHud((s) => s.xp)
  const chaos = useHud((s) => s.chaos)
  const best = useHud((s) => s.best)
  const damage = useHud((s) => s.damage)
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
        <AudioPanel />
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
          <div className="stat"><b>দেশের মোট ক্ষতি</b><span>{taka(damage)}</span></div>
          {Object.keys(NAMES).map((k) => (
            <div className="stat" key={k}><b>{NAMES[k]}</b><span>{best[k] ? `সেরা ${bn(best[k])} সে.` : '—'}</span></div>
          ))}
        </section>
        <section className="panel">
          <h3>মিশন</h3>
          <p className="tiny">প্লাজার জ্বলজ্বলে প্যাডে গিয়ে <kbd>E</kbd> চাপো।<br />ট্রাফিক বস · রিকশা রেসার · পুলিশ চেজ · অটো ধর · ফুটপাত চাঁদা কালেকশন (ভার্চুয়াল, শুধুই মজা!)<br />যেকোনো গাড়ির কাছে গিয়ে <kbd>E</kbd> চাপলেই চালাতে পারবে — বাস, ইজি-বাইক, মোটরবাইক, রিকশা!<br />বেশি তাণ্ডব করলে জনতা গণধোলাই দেবে!</p>
        </section>
      </div>
    </div>
  )
}

function Meme() {
  const m = useHud((s) => s.meme)
  if (!m) return null
  return <div key={m.id} className="meme"><span>{m.text}</span></div>
}

function Speedo() {
  const ride = useHud((s) => s.ride)
  const speed = useHud((s) => s.speed)
  if (!ride) return null
  return <div className="speedo"><b>{bn(speed)}</b><small>কিমি/ঘ</small><em>{ride.label}</em></div>
}

function News() {
  const n = useHud((s) => s.news)
  if (!n) return null
  return (
    <div key={n.id} className={'news' + (n.big ? ' big' : '')}>
      <div className="ntag"><i />ব্রেকিং নিউজ</div>
      <b>{n.headline}</b>
      {n.sub && <span>{n.sub}</span>}
    </div>
  )
}

function Rotate() {
  const touch = useHud((s) => s.touch)
  if (!touch) return null
  return <div className="rotate"><div>📱↻</div><p>ফোনটা আড়াআড়ি করে ধরো</p></div>
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
  const damage = useHud((s) => s.damage)
  const hp = useHud((s) => s.hp)
  const mob = useHud((s) => s.mob)
  const touch = useHud((s) => s.touch)
  const lv = levelOf(xp)
  const pct = ((xp - levelStart(lv)) / (levelStart(lv + 1) - levelStart(lv))) * 100
  return (
    <div className="hud">
      <div className="tl panel">
        <div className="lvl"><span className="badge">{bn(lv)}</span><div><small>লেভেল</small><div className="xpbar"><i style={{ width: pct + '%' }} /></div></div></div>
        <div className="chaos">🔥 চাওস পয়েন্ট <b>{bn(chaos)}</b></div>
        <div className="meter hp"><span>❤ স্বাস্থ্য</span><div><i style={{ width: hp + '%' }} /></div></div>
        <div className={'meter mob' + (mob >= 70 ? ' hot' : '')}><span>😡 জনরোষ</span><div><i style={{ width: mob + '%' }} /></div></div>
        <div className="dmg">💥 দেশের ক্ষতি <b>{taka(damage)}</b></div>
      </div>
      <News />
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
      <Meme />
      <ChandaMeter />
      <ChandaMenu />
      <div className="br"><Speedo /><Minimap /></div>
      <div className="bl panel"><Controls /></div>
      {touch && <Touch />}
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
        <AudioPanel />
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
      <Rotate />
    </>
  )
}
