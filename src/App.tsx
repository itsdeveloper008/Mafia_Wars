import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import './App.css'
import cardBackImage from './Back side of the Card.png'
import landingPageImage from './Landing page Img..png'
import godfatherImage from './God Father.png'
import mafiaImage from './Mafia\'s.png'
import grandmotherImage from './Grand Mother.png'
import doctorImage from './Doctor.png'
import detectiveImage from './Detective.png'
import civiliansImage from './Civilians.png'

type Mode = 'landing' | 'mode-select' | 'lobby' | 'game' | 'summary'
type PlayType = 'online' | 'offline'

type Role =
  | 'Mafia'
  | 'Civilian'
  | 'Godfather'
  | 'Grandmother'
  | 'Doctor'
  | 'Detective'
  | 'Sniper'
  | 'Spy'
  | 'Mayor'
  | 'Serial Killer'

interface Player {
  id: string
  name: string
  role?: Role
  alive: boolean
  avatar: string
  lastWill: string
  sniperUsed?: boolean
  notes?: string[]
}

interface RoomConfig {
  roomName: string
  password: string
  type: PlayType
  includeGodfather: boolean
  includeGrandmother: boolean
}

type Theme = 'dark' | 'light'
type Phase = 'night' | 'day'
type NightStep = 'intro' | 'mafia' | 'serial' | 'doctor' | 'detective' | 'results'

interface GameSettings {
  defenseTimerSec: number
  allowSpy: boolean
  allowMayor: boolean
  allowSniper: boolean
  allowSerialKiller: boolean
}

interface GameEvent {
  id: string
  round: number
  phase: Phase
  message: string
  privateTo?: string
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function generateRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

function App() {
  const [mode, setMode] = useState<Mode>('landing')
  const [playType, setPlayType] = useState<PlayType | null>(null)
  const [roomConfig, setRoomConfig] = useState<RoomConfig>({
    roomName: '',
    password: '',
    type: 'online',
    includeGodfather: false,
    includeGrandmother: false,
  })
  const [isHost, setIsHost] = useState<boolean>(true)
  const [players, setPlayers] = useState<Player[]>([])
  const [pendingName, setPendingName] = useState('')
  const [pendingAvatar, setPendingAvatar] = useState('🕵️')
  const [autoAdvanceDone, setAutoAdvanceDone] = useState(false)
  const [generatedShareCode, setGeneratedShareCode] = useState<string>('')
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})
  const [phase, setPhase] = useState<Phase>('night')
  const [nightStep, setNightStep] = useState<NightStep>('intro')
  const [roundNumber, setRoundNumber] = useState(1)
  const [winner, setWinner] = useState<'mafia' | 'civilians' | 'serial' | null>(null)
  const [theme, setTheme] = useState<Theme>('dark')
  const [events, setEvents] = useState<GameEvent[]>([])
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [phaseTransitionText, setPhaseTransitionText] = useState('')
  const [nightChoices, setNightChoices] = useState<{
    mafiaTargetId?: string
    serialTargetId?: string
    doctorSaveId?: string
    detectiveTargetId?: string
  }>({})
  const [doctorLastSavedId, setDoctorLastSavedId] = useState<string | null>(null)
  const [nominations, setNominations] = useState<Record<string, number>>({})
  const [defenseCandidateId, setDefenseCandidateId] = useState<string | null>(null)
  const [defenseTimeLeft, setDefenseTimeLeft] = useState(0)
  const [finalVotes, setFinalVotes] = useState<Record<string, 'yes' | 'no'>>({})
  const [settings, setSettings] = useState<GameSettings>({
    defenseTimerSec: 30,
    allowSpy: true,
    allowMayor: true,
    allowSniper: true,
    allowSerialKiller: true,
  })
  const audioCtx = useRef<AudioContext | null>(null)

  // Automatically move from landing screen to mode select after 5 seconds
  useEffect(() => {
    if (mode !== 'landing' || autoAdvanceDone) return
    const timer = setTimeout(() => {
      setMode('mode-select')
      setAutoAdvanceDone(true)
    }, 5000)
    return () => clearTimeout(timer)
  }, [mode, autoAdvanceDone])

  // Derived flags for role-availability rules
  const canUseSpecialFamily = useMemo(() => {
    const count = players.length || 0
    if (count < 3) return false
    if (count < 6) return false
    return true
  }, [players.length])

  const minPlayersSatisfied = players.length >= 4
  const avatars = ['🕵️', '🧔', '👩', '👴', '👮', '🎩', '🧙', '🦹']

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const raw = localStorage.getItem('mafiaWars.history')
    if (raw) {
      try {
        setHistory(JSON.parse(raw))
      } catch {
        // ignore invalid localStorage payload
      }
    }
  }, [])

  useEffect(() => {
    if (defenseTimeLeft <= 0) return
    const t = setTimeout(() => setDefenseTimeLeft((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [defenseTimeLeft])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' && mode === 'game') {
        e.preventDefault()
        if (phase === 'night') handleNightNext()
      }
      if (e.key === 'Enter' && mode === 'lobby') {
        addPlayer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, phase, nightStep, pendingName]) // eslint-disable-line react-hooks/exhaustive-deps

  function playTone(kind: 'night' | 'kill' | 'vote') {
    if (!audioCtx.current) audioCtx.current = new AudioContext()
    const ctx = audioCtx.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    if (kind === 'night') osc.frequency.value = 180
    if (kind === 'kill') osc.frequency.value = 90
    if (kind === 'vote') osc.frequency.value = 380
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
    osc.start(now)
    osc.stop(now + 0.3)
  }

  function pushEvent(message: string, privateTo?: string) {
    setEvents((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        round: roundNumber,
        phase,
        message,
        privateTo,
      },
    ])
  }

  function addPlayer() {
    const name = pendingName.trim()
    if (!name) return
    setPlayers((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        name,
        alive: true,
        avatar: pendingAvatar,
        lastWill: '',
      },
    ])
    setPendingName('')
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  function startGame() {
    if (!minPlayersSatisfied) return
    const count = players.length

    // Determine number of mafias according to your rules
    let mafiaCount = 1
    if (count >= 5) {
      mafiaCount = 2
    }

    // Build the deck of roles for the current players
    const roles: Role[] = []

    // Mafia family
    // Ensure at least one plain Mafia even if we add Godfather
    for (let i = 0; i < mafiaCount; i++) {
      roles.push('Mafia')
    }

    if (roomConfig.includeGodfather && canUseSpecialFamily) {
      roles.push('Godfather')
    }
    if (roomConfig.includeGrandmother && canUseSpecialFamily) {
      roles.push('Grandmother')
    }
    if (settings.allowSpy && count >= 6) roles.push('Spy')
    if (settings.allowMayor && count >= 5) roles.push('Mayor')
    if (settings.allowSniper && count >= 6) roles.push('Sniper')
    if (settings.allowSerialKiller && count >= 7) roles.push('Serial Killer')

    // Add a Doctor and Detective if there is room
    if (count >= 4) {
      roles.push('Doctor')
    }
    if (count >= 5) {
      roles.push('Detective')
    }

    // Fill remaining with Civilians
    while (roles.length < count) {
      roles.push('Civilian')
    }

    const shuffledRoles = shuffle(roles)
    const withRoles = players.map((p, idx) => ({
      ...p,
      role: shuffledRoles[idx],
      alive: true,
      sniperUsed: false,
      notes: [],
    }))
    setPlayers(withRoles)
    setFlippedCards({})
    setPhase('night')
    setNightStep('intro')
    setNightChoices({})
    setRoundNumber(1)
    setDoctorLastSavedId(null)
    setNominations({})
    setDefenseCandidateId(null)
    setDefenseTimeLeft(0)
    setFinalVotes({})
    setEvents([])
    setWinner(null)
    setMode('game')
    pushEvent('Game started.')
  }

  function endGame() {
    setMode('summary')
  }

  function resetToLobby() {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        role: undefined,
        alive: true,
        sniperUsed: false,
        notes: [],
      })),
    )
    setFlippedCards({})
    setPhase('night')
    setNightStep('intro')
    setNightChoices({})
    setRoundNumber(1)
    setDoctorLastSavedId(null)
    setNominations({})
    setDefenseCandidateId(null)
    setDefenseTimeLeft(0)
    setFinalVotes({})
    setEvents([])
    setWinner(null)
    setMode('lobby')
  }

  function handleSelectPlayType(type: PlayType, asHost = true) {
    setPlayType(type)
    setRoomConfig((prev) => ({ ...prev, type }))
    setIsHost(asHost)
    setMode('lobby')
  }

  function handleGenerateShare() {
    const code = generatedShareCode || generateRoomCode()
    setGeneratedShareCode(code)
    const url = `${window.location.origin}?room=${encodeURIComponent(
      roomConfig.roomName || code,
    )}&code=${code}`
    if (navigator.share) {
      navigator
        .share({
          title: 'Join my Mafia Wars room',
          text: `Room: ${roomConfig.roomName || code}\nCode: ${code}`,
          url,
        })
        .catch(() => {
          // ignore
        })
    } else {
      navigator.clipboard.writeText(`Room: ${roomConfig.roomName || code}\nCode: ${code}\n${url}`)
      alert('Share info copied to clipboard')
    }
  }

  const roleDescriptions: Record<Role, string> = {
    Mafia: 'Kill one civilian each night.',
    Godfather: 'Immune to Detective. Leads the Mafia.',
    Grandmother: 'If killed, takes one Mafia with her.',
    Civilian: 'Find and vote out the Mafia.',
    Doctor: 'Save one player from death each night.',
    Detective: 'Investigate one player each night.',
    Sniper:
      'Civilian side. One shot per game. If they shoot an innocent, Sniper dies.',
    Spy: 'Appears in mafia circle but wins with civilians. Mafia does not know Spy.',
    Mayor: 'Vote counts double during day votes. Revealed to all when killed.',
    'Serial Killer': 'Neutral role. Kills one each night. Wins if last standing.',
  }

  function toggleCardFlip(id: string) {
    setFlippedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function evaluateWinConditions(currentPlayers: Player[]) {
    const aliveMafias = currentPlayers.filter(
      (p) => p.alive && (p.role === 'Mafia' || p.role === 'Godfather'),
    ).length
    const aliveSerial = currentPlayers.filter(
      (p) => p.alive && p.role === 'Serial Killer',
    ).length
    const aliveNonMafias = currentPlayers.filter(
      (p) =>
        p.alive &&
        p.role !== 'Mafia' &&
        p.role !== 'Godfather',
    ).length
    const aliveTotal = currentPlayers.filter((p) => p.alive).length

    if (aliveSerial === 1 && aliveTotal === 1) {
      setWinner('serial')
      return
    }

    if (aliveMafias === 0) {
      setWinner('civilians')
      return
    }

    if (aliveMafias >= aliveNonMafias) {
      setWinner('mafia')
    }
  }

  function markKilled(
    id: string,
    reason = 'eliminated',
    ignoreGrandmother = false,
    workingSet?: Player[],
  ): Player[] {
    const source = workingSet ?? players
    let updated = source.map((p) =>
      p.id === id ? { ...p, alive: false } : p,
    )
    const victim = source.find((p) => p.id === id)
    if (victim?.role === 'Mayor') {
      pushEvent(`The Mayor (${victim.name}) has been revealed!`)
    }
    if (victim?.role === 'Spy') {
      pushEvent(`Double-agent reveal: ${victim.name} was the Spy!`)
    }
    if (victim?.lastWill?.trim()) {
      pushEvent(`${victim.name}'s Last Will: "${victim.lastWill.trim()}"`)
    }
    if (!ignoreGrandmother && victim?.role === 'Grandmother') {
      const aliveMafias = updated.filter(
        (p) => p.alive && (p.role === 'Mafia' || p.role === 'Godfather'),
      )
      if (aliveMafias.length > 0) {
        const chosen = aliveMafias[Math.floor(Math.random() * aliveMafias.length)]
        updated = updated.map((p) =>
          p.id === chosen.id ? { ...p, alive: false } : p,
        )
        pushEvent(`${chosen.name} was taken down by the Grandmother!`)
      }
    }
    pushEvent(`${victim?.name ?? 'A player'} was ${reason}.`)
    evaluateWinConditions(updated)
    return updated
  }

  function resolveNight() {
    const mafiaTarget = nightChoices.mafiaTargetId
    const doctorSave = nightChoices.doctorSaveId
    const serialTarget = nightChoices.serialTargetId
    const detectiveTarget = nightChoices.detectiveTargetId
    let working = [...players]
    const notes: string[] = []
    if (mafiaTarget) {
      if (doctorSave && doctorSave === mafiaTarget) {
        notes.push('Someone was attacked last night... but survived!')
        pushEvent('Doctor saved the target.')
      } else {
        const targetName = players.find((p) => p.id === mafiaTarget)?.name ?? 'Unknown'
        notes.push(`A body was found... ${targetName} was killed.`)
        working = markKilled(mafiaTarget, 'killed by the Mafia', false, working)
      }
    }
    if (serialTarget) {
      if (doctorSave && doctorSave === serialTarget) {
        notes.push('A second attack was attempted... but the target survived!')
      } else if (working.find((p) => p.id === serialTarget)?.alive) {
        const targetName = players.find((p) => p.id === serialTarget)?.name ?? 'Unknown'
        notes.push(`${targetName} was murdered by an unknown killer.`)
        working = markKilled(serialTarget, 'killed by the Serial Killer', false, working)
      }
    }
    if (detectiveTarget) {
      const target = players.find((p) => p.id === detectiveTarget)
      if (target) {
        const suspicious =
          target.role === 'Mafia' || target.role === 'Spy' || target.role === 'Serial Killer'
        const result = target.role === 'Godfather' ? 'not suspicious' : suspicious ? 'suspicious' : 'not suspicious'
        const detective = players.find((p) => p.role === 'Detective')
        if (detective) {
          pushEvent(`Investigation: ${target.name} is ${result}.`, detective.id)
        }
      }
    }
    if (notes.length === 0) notes.push('The night was eerily quiet...')
    pushEvent(notes.join(' '))
    setPlayers(working)
    setDoctorLastSavedId(doctorSave ?? null)
    setNightChoices({})
    setPhaseTransitionText('Sunrise...')
    setTimeout(() => setPhaseTransitionText(''), 850)
    setPhase('day')
    setNightStep('intro')
    setNominations({})
    setDefenseCandidateId(null)
    setDefenseTimeLeft(0)
    setFinalVotes({})
  }

  function handleNightNext() {
    const order: NightStep[] = ['intro', 'mafia', 'serial', 'doctor', 'detective', 'results']
    const index = order.indexOf(nightStep)
    if (index === order.length - 1) {
      resolveNight()
      playTone('night')
      return
    }
    setNightStep(order[index + 1])
  }

  function nominatePlayer(id: string) {
    if (phase !== 'day' || defenseCandidateId) return
    setNominations((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  function beginDefense() {
    const top = Object.entries(nominations).sort((a, b) => b[1] - a[1])[0]
    if (!top) return
    setDefenseCandidateId(top[0])
    setDefenseTimeLeft(settings.defenseTimerSec)
    setFinalVotes({})
  }

  function castFinalVote(playerId: string, vote: 'yes' | 'no') {
    setFinalVotes((prev) => ({ ...prev, [playerId]: vote }))
    playTone('vote')
  }

  function finalizeDayVote() {
    if (!defenseCandidateId) return
    let yes = 0
    let no = 0
    players
      .filter((p) => p.alive)
      .forEach((p) => {
        const v = finalVotes[p.id]
        if (!v) return
        const weight = p.role === 'Mayor' ? 2 : 1
        if (v === 'yes') yes += weight
        else no += weight
      })
    const accused = players.find((p) => p.id === defenseCandidateId)
    if (yes > no && accused) {
      if (window.confirm(`Confirm elimination of ${accused.name}?`)) {
        const updated = markKilled(defenseCandidateId, 'voted out during the day')
        setPlayers(updated)
      }
    } else {
      pushEvent('Town failed to reach majority for elimination.')
    }
    setRoundNumber((r) => r + 1)
    setPhaseTransitionText('Night falls...')
    setTimeout(() => setPhaseTransitionText(''), 850)
    setPhase('night')
    setNightStep('intro')
    setNominations({})
    setDefenseCandidateId(null)
    setDefenseTimeLeft(0)
    setFinalVotes({})
  }

  function sniperAction(sniperId: string, targetId: string) {
    const sniper = players.find((p) => p.id === sniperId)
    if (!sniper || sniper.sniperUsed || !sniper.alive) return
    if (!window.confirm('Use Sniper one-time shot?')) return
    let updated = players.map((p) =>
      p.id === sniperId ? { ...p, sniperUsed: true } : p,
    )
    const target = players.find((p) => p.id === targetId)
    const innocent =
      target?.role === 'Civilian' ||
      target?.role === 'Mayor' ||
      target?.role === 'Doctor' ||
      target?.role === 'Detective' ||
      target?.role === 'Sniper' ||
      target?.role === 'Grandmother' ||
      target?.role === 'Spy'
    if (target?.alive) {
      updated = markKilled(targetId, 'shot by the Sniper', false, updated)
    }
    if (innocent) {
      updated = markKilled(sniperId, 'died from guilt after shooting an innocent', true, updated)
    }
    setPlayers(updated)
    playTone('kill')
  }

  function saveHistorySnapshot() {
    const snapshot = `Game ${new Date().toLocaleString()} - winner: ${
      winner ?? 'none'
    } - rounds: ${roundNumber}`
    const next = [snapshot, ...history].slice(0, 20)
    setHistory(next)
    localStorage.setItem('mafiaWars.history', JSON.stringify(next))
  }

  useEffect(() => {
    if (winner) saveHistorySnapshot()
  }, [winner]) // eslint-disable-line react-hooks/exhaustive-deps

  function roleBreakdownText() {
    const grouped: Record<string, number> = {}
    players.forEach((p) => {
      if (!p.role) return
      grouped[p.role] = (grouped[p.role] ?? 0) + 1
    })
    return Object.entries(grouped)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ')
  }

  function updateLastWill(id: string, text: string) {
    setPlayers((prev) => {
      return prev.map((p) => (p.id === id ? { ...p, lastWill: text } : p))
    })
  }

  // --- UI sections ---

  function renderLanding() {
    return (
      <div className="app-shell landing">
        <img
          src={landingPageImage}
          alt=""
          className="landing-hero-image"
        />
        <div className="landing-overlay" aria-hidden="true" />
        <div className="landing-smoke landing-smoke-1" aria-hidden="true" />
        <div className="landing-smoke landing-smoke-2" aria-hidden="true" />
        <div className="landing-smoke landing-smoke-3" aria-hidden="true" />
        <div className="landing-content hero-card-animate">
          <h1 className="hero-title">Mafia Wars</h1>
          <div className="hero-title-divider" aria-hidden="true" />
          <p className="tagline">Fast party nights. Secret roles. Perfect shuffle.</p>
          <p className="hint hint-fade-in">We&apos;ll take you to the game setup in a moment...</p>
        </div>
        <div className="landing-progress" aria-hidden="true" />
      </div>
    )
  }

  function renderModeSelect() {
    return (
      <div className="app-shell mode-select">
        <img
          src={landingPageImage}
          alt=""
          className="mode-select-bg-image"
        />
        <div className="mode-select-overlay" aria-hidden="true" />
        <div className="mode-select-content mode-select-panel-animate">
          <div className="mode-select-roles-row">
            <div className="mode-role-icon mode-role-gf">
              <img src={godfatherImage} alt="Godfather" />
              <span className="mode-role-label">Godfather</span>
            </div>
            <div className="mode-role-icon mode-role-m">
              <img src={mafiaImage} alt="Mafia" />
              <span className="mode-role-label">Mafia</span>
            </div>
            <div className="mode-role-icon mode-role-gm">
              <img src={grandmotherImage} alt="Grandmother" />
              <span className="mode-role-label">Grandmother</span>
            </div>
            <div className="mode-role-icon mode-role-dr">
              <img src={doctorImage} alt="Doctor" />
              <span className="mode-role-label">Doctor</span>
            </div>
            <div className="mode-role-icon mode-role-d">
              <img src={detectiveImage} alt="Detective" />
              <span className="mode-role-label">Detective</span>
            </div>
            <div className="mode-role-icon mode-role-c">
              <img src={civiliansImage} alt="Civilians" />
              <span className="mode-role-label">Civilians</span>
            </div>
          </div>
          <h1 className="mode-select-title">Mafia Wars</h1>
          <div className="mode-select-divider" aria-hidden="true" />
          <p className="mode-select-subtitle">How do you want to play?</p>

          <section
            className="online-panel"
            aria-labelledby="online-panel-title"
          >
            <div className="online-panel-border" aria-hidden="true" />
            <div className="online-panel-shine" aria-hidden="true" />
            <div className="online-panel-particles" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="online-panel-body">
              <header className="online-panel-top">
                <div className="online-panel-intro">
                  <div className="online-panel-globe" aria-hidden="true">
                    <svg viewBox="0 0 88 88" fill="none">
                      <defs>
                        <linearGradient
                          id="globeStroke"
                          x1="8"
                          y1="8"
                          x2="80"
                          y2="80"
                        >
                          <stop stopColor="#22d3ee" />
                          <stop offset="1" stopColor="#fbbf24" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="44"
                        cy="44"
                        r="28"
                        stroke="url(#globeStroke)"
                        strokeWidth="2"
                      />
                      <ellipse
                        cx="44"
                        cy="44"
                        rx="12"
                        ry="28"
                        stroke="url(#globeStroke)"
                        strokeWidth="2"
                      />
                      <path
                        d="M16 44h56M20 30h48M20 58h48"
                        stroke="url(#globeStroke)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18 22l14 10M70 20l-12 12M18 66l16-8M70 68l-14-10"
                        stroke="url(#globeStroke)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        opacity="0.7"
                      />
                      <circle cx="18" cy="22" r="2.5" fill="#22d3ee" />
                      <circle cx="70" cy="20" r="2.5" fill="#67e8f9" />
                      <circle cx="18" cy="66" r="2.5" fill="#fbbf24" />
                      <circle cx="70" cy="68" r="2.5" fill="#22d3ee" />
                      <circle cx="44" cy="16" r="2" fill="#a5f3fc" />
                    </svg>
                  </div>

                  <div className="online-panel-copy">
                    <h2 id="online-panel-title" className="online-panel-title">
                      Play Online
                    </h2>
                    <p className="online-panel-desc">
                      Share a{' '}
                      <span className="online-panel-highlight">room code</span>{' '}
                      and play with anyone, anywhere.{' '}
                      <span className="online-panel-highlight">Roles</span>,
                      votes, and the{' '}
                      <span className="online-panel-highlight">night phase</span>{' '}
                      all{' '}
                      <span className="online-panel-highlight">live sync</span>{' '}
                      — no host required.
                    </p>
                  </div>
                </div>

                <aside
                  className="online-live-badge"
                  role="status"
                  aria-label="Live rooms: 127 active"
                >
                  <span className="online-live-badge-shimmer" aria-hidden="true" />
                  <span className="online-live-pulse" aria-hidden="true" />
                  <svg
                    className="online-live-network"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="6"
                      cy="12"
                      r="2.2"
                      stroke="#4ade80"
                      strokeWidth="2"
                    />
                    <circle
                      cx="18"
                      cy="6"
                      r="2.2"
                      stroke="#4ade80"
                      strokeWidth="2"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="2.2"
                      stroke="#4ade80"
                      strokeWidth="2"
                    />
                    <path
                      d="M8 11.2l8-4.2M8 12.8l8 4.2"
                      stroke="#4ade80"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="online-live-text">
                    <span className="online-live-label">Live Rooms</span>
                    <span className="online-live-count">127 Active</span>
                  </div>
                </aside>
              </header>

              <div className="online-feature-grid">
                <article className="online-feature-card">
                  <span className="online-feature-glow" aria-hidden="true" />
                  <div className="online-feature-icon" aria-hidden="true">
                    <svg viewBox="0 0 48 48" fill="none">
                      <circle
                        cx="14"
                        cy="16"
                        r="5"
                        stroke="#22d3ee"
                        strokeWidth="2"
                      />
                      <path
                        d="M6 34c1.2-6 5-9 8-9s6.8 3 8 9"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="34"
                        cy="16"
                        r="5"
                        stroke="#67e8f9"
                        strokeWidth="2"
                      />
                      <path
                        d="M26 34c1.2-6 5-9 8-9s6.8 3 8 9"
                        stroke="#67e8f9"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="24"
                        cy="14"
                        r="5"
                        stroke="#fbbf24"
                        strokeWidth="2"
                      />
                      <path
                        d="M16 32c1.2-6 5-9 8-9s6.8 3 8 9"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M19 16h5M29 16h-5"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeLinecap="round"
                        opacity="0.55"
                      />
                    </svg>
                  </div>
                  <h3 className="online-feature-title">Up to 12 Players</h3>
                  <p className="online-feature-desc">
                    Invite friends into a synchronized multiplayer experience.
                  </p>
                </article>

                <article className="online-feature-card">
                  <span className="online-feature-glow" aria-hidden="true" />
                  <div
                    className="online-feature-icon online-feature-icon-cycle"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 48 48" fill="none">
                      <path
                        d="M24 8a16 16 0 0 1 0 32"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M24 8a16 16 0 0 0 0 32"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="16"
                        cy="18"
                        r="4"
                        stroke="#fbbf24"
                        strokeWidth="2"
                      />
                      <path
                        d="M16 12v2M16 22v2M10 18h2M20 18h2"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M30 28a5 5 0 1 0 0.1 0"
                        stroke="#67e8f9"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle
                        className="online-star"
                        cx="34"
                        cy="16"
                        r="1.4"
                        fill="#a5f3fc"
                      />
                      <circle
                        className="online-star"
                        cx="38"
                        cy="22"
                        r="1.1"
                        fill="#67e8f9"
                      />
                      <circle
                        className="online-star"
                        cx="32"
                        cy="20"
                        r="0.9"
                        fill="#e0f2fe"
                      />
                    </svg>
                  </div>
                  <h3 className="online-feature-title">Automatic Day &amp; Night</h3>
                  <p className="online-feature-desc">
                    Game phases progress without manual control.
                  </p>
                </article>

                <article className="online-feature-card">
                  <span className="online-feature-glow" aria-hidden="true" />
                  <div className="online-feature-icon" aria-hidden="true">
                    <svg viewBox="0 0 48 48" fill="none">
                      <path
                        d="M24 8l14 6v10c0 9-6 14-14 16-8-2-14-7-14-16V14l14-6z"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="19"
                        y="20"
                        width="10"
                        height="10"
                        rx="2"
                        stroke="#fbbf24"
                        strokeWidth="2"
                      />
                      <path
                        d="M22 20v-2a2 2 0 0 1 4 0v2"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="24" cy="25" r="1.3" fill="#fbbf24" />
                      <circle cx="12" cy="12" r="2" fill="#22d3ee" />
                      <circle cx="36" cy="14" r="2" fill="#67e8f9" />
                      <path
                        d="M14 12h8M34 14h-6"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeLinecap="round"
                        opacity="0.55"
                      />
                    </svg>
                  </div>
                  <h3 className="online-feature-title">Private Invite Rooms</h3>
                  <p className="online-feature-desc">
                    Share a secure room code with friends.
                  </p>
                </article>
              </div>

              <div className="online-panel-actions">
                <button
                  type="button"
                  className="online-btn online-btn-create"
                  onClick={() => handleSelectPlayType('online', true)}
                >
                  <span className="online-btn-shine" aria-hidden="true" />
                  <svg
                    className="online-btn-spark"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Create a Room
                </button>

                <button
                  type="button"
                  className="online-btn online-btn-join"
                  onClick={() => handleSelectPlayType('online', false)}
                >
                  Join with Code
                  <svg
                    className="online-btn-arrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12h12M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <footer className="online-info-bar" aria-label="Game requirements">
                <div className="online-info-item">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="#22d3ee"
                      strokeWidth="2"
                    />
                    <path
                      d="M6.5 10.2l2.2 2.2 4.8-5"
                      stroke="#22d3ee"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Minimum 4 Players</span>
                </div>
                <span className="online-info-dot" aria-hidden="true" />
                <div className="online-info-item">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M10 3l2 4.5L17 9l-4.2 1.8L10 16l-2.8-5.2L3 9l5-1.5L10 3z"
                      stroke="#fbbf24"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>
                    Godfather &amp; Grandmother unlock after 6 players
                  </span>
                </div>
                <span className="online-info-dot" aria-hidden="true" />
                <div className="online-info-item">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M10 3l2.2 5.2L18 10l-5.8 1.8L10 17l-2.2-5.2L2 10l5.8-1.8L10 3z"
                      stroke="#67e8f9"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Live synchronized gameplay</span>
                </div>
              </footer>
            </div>
          </section>
        </div>
      </div>
    )
  }

  function renderRoomOptionsOnline() {
    return (
      <div className="room-options">
        <h2>Online room</h2>
        <div className="field-row">
          <label>Suggest a room name</label>
          <input
            value={roomConfig.roomName}
            onChange={(e) =>
              setRoomConfig((prev) => ({ ...prev, roomName: e.target.value }))
            }
            placeholder="e.g. Friday Night Mafia"
          />
        </div>
        <div className="field-row">
          <label>Password / room code</label>
          <input
            value={roomConfig.password}
            onChange={(e) =>
              setRoomConfig((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="Create a simple join code"
          />
        </div>
        <button className="outline" onClick={handleGenerateShare}>
          Share room
        </button>
        {generatedShareCode && (
          <p className="code-display">
            Share this code: <strong>{generatedShareCode}</strong>
          </p>
        )}
        <p className="helper">
          Other players join by entering the same room name and password on
          their devices.
        </p>
      </div>
    )
  }

  function renderRoomOptionsOffline() {
    return (
      <div className="room-options">
        <h2>Offline game</h2>
        <p className="helper">
          A human at the table will act as the host. Everyone can still see their
          role on their own phone if you like.
        </p>
      </div>
    )
  }

  function renderLobby() {
    const count = players.length
    const canToggle = canUseSpecialFamily

    return (
      <div className="app-shell lobby">
        <div className="panel wide">
          <header className="panel-header">
            <div>
              <h1>Lobby</h1>
              <p className="subtitle">
                {playType === 'online'
                  ? isHost
                    ? 'You are the host. Add players then start the game.'
                    : 'Waiting for the host to start the game.'
                  : 'Add players and start when everyone is ready.'}
              </p>
            </div>
            <div className="badge-row">
              <span className="badge">
                {playType === 'online' ? 'Online' : 'Offline'} game
              </span>
              <span className="badge secondary-badge">
                {count} player{count === 1 ? '' : 's'}
              </span>
            </div>
          </header>

          {playType === 'online'
            ? renderRoomOptionsOnline()
            : renderRoomOptionsOffline()}

          <div className="divider" />

          <div className="players-section">
            <div className="field-row inline">
              <input
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                placeholder="Add player name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addPlayer()
                }}
              />
              <select
                className="avatar-select"
                value={pendingAvatar}
                onChange={(e) => setPendingAvatar(e.target.value)}
              >
                {avatars.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button className="primary" onClick={addPlayer}>
                Add
              </button>
            </div>

            <div className="players-list">
              {players.length === 0 ? (
                <p className="helper">No players yet. Add at least 3 to begin.</p>
              ) : (
                players.map((p, idx) => (
                  <div key={p.id} className="player-pill">
                    <span className="avatar-circle small">
                      {p.avatar || idx + 1}
                    </span>
                    <span className="name">{p.name}</span>
                    <button
                      className="ghost"
                      onClick={() => removePlayer(p.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="divider" />

          <div className="options-row">
            <div className="toggle-group">
              <label>
                <input
                  type="checkbox"
                  checked={roomConfig.includeGodfather && canToggle}
                  disabled={!canToggle}
                  onChange={(e) =>
                    setRoomConfig((prev) => ({
                      ...prev,
                      includeGodfather: e.target.checked,
                    }))
                  }
                />
                <span>Include Godfather</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={roomConfig.includeGrandmother && canToggle}
                  disabled={!canToggle}
                  onChange={(e) =>
                    setRoomConfig((prev) => ({
                      ...prev,
                      includeGrandmother: e.target.checked,
                    }))
                  }
                />
                <span>Include Grandmother</span>
              </label>
              {!canToggle && (
                <p className="helper tiny">
                  Godfather / Grandmother become available once you have 6 or more
                  players and at least 3 total.
                </p>
              )}
            </div>

            <button
              className="primary large"
              disabled={!minPlayersSatisfied}
              onClick={startGame}
            >
              Start game
            </button>
          </div>
          <div className="settings-row">
            <button className="secondary" onClick={() => setShowSettings((v) => !v)}>
              Game settings
            </button>
            <button className="outline" onClick={() => setShowHowToPlay(true)}>
              How to play
            </button>
            <button className="outline" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
              Theme: {theme}
            </button>
          </div>
          {showSettings && (
            <div className="settings-panel">
              <label>
                Defense timer (seconds)
                <input
                  type="number"
                  value={settings.defenseTimerSec}
                  min={10}
                  max={90}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, defenseTimerSec: Number(e.target.value) || 30 }))
                  }
                />
              </label>
              <label><input type="checkbox" checked={settings.allowSpy} onChange={(e) => setSettings((s) => ({ ...s, allowSpy: e.target.checked }))} />Allow Spy</label>
              <label><input type="checkbox" checked={settings.allowMayor} onChange={(e) => setSettings((s) => ({ ...s, allowMayor: e.target.checked }))} />Allow Mayor</label>
              <label><input type="checkbox" checked={settings.allowSniper} onChange={(e) => setSettings((s) => ({ ...s, allowSniper: e.target.checked }))} />Allow Sniper</label>
              <label><input type="checkbox" checked={settings.allowSerialKiller} onChange={(e) => setSettings((s) => ({ ...s, allowSerialKiller: e.target.checked }))} />Allow Serial Killer</label>
            </div>
          )}
        </div>
        {showHowToPlay && (
          <div className="win-overlay">
            <div className="win-modal">
              <h2>How to Play</h2>
              <p className="helper">Night is sequential: Mafia, Serial Killer, Doctor, Detective, then results.</p>
              <p className="helper">Day has nomination, defense timer, then weighted vote (Mayor = double).</p>
              <button className="primary" onClick={() => setShowHowToPlay(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderGame() {
    const alivePlayers = players.filter((p) => p.alive)
    const mafiaTeammates = alivePlayers.filter((p) => p.role === 'Mafia' || p.role === 'Godfather')
    const detective = players.find((p) => p.role === 'Detective')
    const privateNotes = detective ? events.filter((e) => e.privateTo === detective.id) : []
    const publicEvents = events.filter((e) => !e.privateTo)
    const nomineeName = players.find((p) => p.id === defenseCandidateId)?.name
    const yesVotes = alivePlayers.reduce((sum, p) => sum + (finalVotes[p.id] === 'yes' ? (p.role === 'Mayor' ? 2 : 1) : 0), 0)
    const noVotes = alivePlayers.reduce((sum, p) => sum + (finalVotes[p.id] === 'no' ? (p.role === 'Mayor' ? 2 : 1) : 0), 0)

    return (
      <div className="app-shell game">
        {phaseTransitionText && (
          <div className="phase-transition-overlay">{phaseTransitionText}</div>
        )}
        <div className="panel wide">
          <header className="panel-header">
            <div>
              <h1>Role cards</h1>
              <p className="subtitle">
                Structured game flow with role abilities, cooldowns, voting and logs.
              </p>
            </div>
            <div className="badge-row">
              <span className="badge">{phase === 'night' ? 'Night' : 'Day'} phase</span>
              <span className="badge secondary-badge">Round {roundNumber}</span>
            </div>
          </header>

          <div className="cards-grid">
            {players.map((p) => (
              <div
                key={p.id}
                className="card-role"
                onClick={() => toggleCardFlip(p.id)}
              >
                <div
                  className={`card-inner ${
                    flippedCards[p.id] ? 'flipped' : ''
                  }`}
                >
                  <div className="card-face back">
                    <img
                      src={cardBackImage}
                      alt="Card back"
                      className="card-back-image"
                    />
                  </div>
                  <div className="card-face front">
                    <div className="role-chip">{p.role}</div>
                    {p.role && (
                      <div className="role-description">
                        {roleDescriptions[p.role]}
                      </div>
                    )}
                    <div className="player-name">{p.name}</div>
                    <small>{p.avatar}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {phase === 'night' ? (
            <div className="phase-section">
              <div className="phase-header">
                <span className="phase-badge">🌙 Night sequence</span>
                <span className="round-badge">Step: {nightStep}</span>
              </div>
              {nightStep === 'intro' && <p className="phase-text">Everyone close your eyes.</p>}
              {nightStep === 'mafia' && (
                <>
                  <p className="phase-text">Mafia, open your eyes - choose your target.</p>
                  <p className="helper">Mafia teammates: {mafiaTeammates.map((p) => p.name).join(', ') || 'None'}</p>
                  <div className="kill-grid">
                    {alivePlayers.map((p) => (
                      <button key={p.id} className={`pill-button ${nightChoices.mafiaTargetId === p.id ? 'dead' : ''}`} onClick={() => setNightChoices((n) => ({ ...n, mafiaTargetId: p.id }))}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {nightStep === 'serial' && (
                <>
                  <p className="phase-text">Serial Killer, open your eyes - choose your target.</p>
                  <div className="kill-grid">
                    {alivePlayers.map((p) => (
                      <button key={p.id} className={`pill-button ${nightChoices.serialTargetId === p.id ? 'dead' : ''}`} onClick={() => setNightChoices((n) => ({ ...n, serialTargetId: p.id }))}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {nightStep === 'doctor' && (
                <>
                  <p className="phase-text">Doctor, open your eyes - choose who to save.</p>
                  <p className="helper">Cooldown: cannot save same player twice in a row.</p>
                  <div className="kill-grid">
                    {alivePlayers.map((p) => (
                      <button
                        key={p.id}
                        disabled={doctorLastSavedId === p.id}
                        className={`pill-button ${nightChoices.doctorSaveId === p.id ? 'dead' : ''}`}
                        onClick={() => setNightChoices((n) => ({ ...n, doctorSaveId: p.id }))}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {nightStep === 'detective' && (
                <>
                  <p className="phase-text">Detective, open your eyes - choose who to investigate.</p>
                  <div className="kill-grid">
                    {alivePlayers.map((p) => (
                      <button key={p.id} className={`pill-button ${nightChoices.detectiveTargetId === p.id ? 'dead' : ''}`} onClick={() => setNightChoices((n) => ({ ...n, detectiveTargetId: p.id }))}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {nightStep === 'results' && (
                <p className="phase-text">Everyone open your eyes - results will be revealed.</p>
              )}
              <button className="secondary" onClick={handleNightNext}>
                {nightStep === 'results' ? 'Reveal results and switch to day' : 'Next step'}
              </button>
            </div>
          ) : (
            <div className="phase-section">
              <div className="phase-header">
                <span className="phase-badge">☀️ Day voting</span>
                <span className="round-badge">Majority elimination</span>
              </div>
              {!defenseCandidateId ? (
                <>
                  <p className="phase-text">Nominate players. Live tally updates below.</p>
                  <div className="kill-grid">
                    {alivePlayers.map((p) => (
                      <button key={p.id} className="pill-button" onClick={() => nominatePlayer(p.id)}>
                        Nominate {p.name} ({nominations[p.id] ?? 0})
                      </button>
                    ))}
                  </div>
                  <button className="secondary" onClick={beginDefense}>Start defense speech</button>
                </>
              ) : (
                <>
                  <p className="phase-text">
                    {nomineeName} has 30 seconds to defend. Time left: {defenseTimeLeft}s
                  </p>
                  <div className="kill-grid">
                    {alivePlayers.map((p) => (
                      <div key={p.id} className="player-pill">
                        <span>{p.name} {p.role === 'Mayor' ? '(Mayor x2)' : ''}</span>
                        <button className="pill-button" onClick={() => castFinalVote(p.id, 'yes')}>Yes</button>
                        <button className="pill-button" onClick={() => castFinalVote(p.id, 'no')}>No</button>
                      </div>
                    ))}
                  </div>
                  <p className="helper">Vote tally: Yes {yesVotes} / No {noVotes}</p>
                  <button className="primary" onClick={finalizeDayVote}>Finalize vote</button>
                </>
              )}
            </div>
          )}

          <div className="divider" />

          <div className="bottom-row">
            <div className="kill-controls">
              <label className="helper">Role abilities and last will</label>
              <div className="kill-grid">
                {players.map((p) => (
                  <div key={p.id} className="player-pill">
                    <span>{p.name}</span>
                    {p.role === 'Sniper' && p.alive && (
                      <button
                        className="pill-button"
                        disabled={p.sniperUsed}
                        onClick={() => {
                          const target = prompt(`Sniper target by ${p.name} (type exact player name):`)
                          const targetPlayer = players.find((x) => x.name.toLowerCase() === target?.toLowerCase())
                          if (targetPlayer) sniperAction(p.id, targetPlayer.id)
                        }}
                      >
                        {p.sniperUsed ? 'Shot used' : 'Use Sniper shot'}
                      </button>
                    )}
                    <input
                      className="will-input"
                      placeholder="Last will..."
                      value={p.lastWill}
                      onChange={(e) => updateLastWill(p.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <button className="primary large" onClick={endGame}>
              End game & show summary
            </button>
          </div>
          <div className="divider" />
          <div className="summary-columns">
            <div>
              <h2>Game Event Log</h2>
              <ul className="summary-list">
                {publicEvents.slice(-8).map((e) => (
                  <li key={e.id}>
                    <span className="name">R{e.round} {e.phase}</span>
                    <span>{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Detective Notes (private)</h2>
              <ul className="summary-list">
                {privateNotes.length === 0 ? (
                  <li><span className="helper">No investigations yet.</span></li>
                ) : (
                  privateNotes.slice(-6).map((e) => (
                    <li key={e.id}><span>{e.message}</span></li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
        {winner && (
          <div className="win-overlay">
            <div className="win-modal">
              <h2>
                {winner === 'civilians'
                  ? '🎉 Civilians Win!'
                  : winner === 'serial'
                    ? '🔪 Serial Killer Wins Alone!'
                    : '💀 Mafia Wins!'}
              </h2>
              <button className="primary large" onClick={endGame}>
                See Summary
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderSummary() {
    const mafias = players.filter(
      (p) => p.role === 'Mafia' || p.role === 'Godfather',
    )
    const civilians = players.filter(
      (p) =>
        p.role === 'Civilian' ||
        p.role === 'Grandmother' ||
        p.role === 'Doctor' ||
        p.role === 'Detective' ||
        p.role === 'Spy' ||
        p.role === 'Sniper' ||
        p.role === 'Mayor',
    )
    const neutrals = players.filter((p) => p.role === 'Serial Killer')

    return (
      <div className="app-shell summary">
        <div className="panel wide">
          <header className="panel-header">
            <div>
              <h1>Game summary</h1>
              <p className="subtitle">
                Everyone sees who was Mafia, Civilian and special roles.
              </p>
            </div>
          </header>

          <div className="summary-columns">
            <div>
              <h2>Mafia family</h2>
              {mafias.length === 0 ? (
                <p className="helper">No mafias this game.</p>
              ) : (
                <ul className="summary-list">
                  {mafias.map((p) => (
                    <li key={p.id}>
                      <span className="name">{p.name}</span>
                      <span className="role-tag">{p.role}</span>
                      <span className={`status ${p.alive ? 'alive' : 'dead'}`}>
                        {p.alive ? 'Survived' : 'Killed'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2>Civilians & specials</h2>
              {civilians.length === 0 ? (
                <p className="helper">No civilians this game.</p>
              ) : (
                <ul className="summary-list">
                  {civilians.map((p) => (
                    <li key={p.id}>
                      <span className="name">{p.name}</span>
                      <span className="role-tag">{p.role}</span>
                      <span className={`status ${p.alive ? 'alive' : 'dead'}`}>
                        {p.alive ? 'Survived' : 'Killed'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2>Neutral</h2>
              {neutrals.length === 0 ? (
                <p className="helper">No neutral roles this game.</p>
              ) : (
                <ul className="summary-list">
                  {neutrals.map((p) => (
                    <li key={p.id}>
                      <span className="name">{p.name}</span>
                      <span className="role-tag">{p.role}</span>
                      <span className={`status ${p.alive ? 'alive' : 'dead'}`}>
                        {p.alive ? 'Survived' : 'Killed'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="divider" />
          <h2>Public Event History</h2>
          <ul className="summary-list">
            {events.filter((e) => !e.privateTo).map((e) => (
              <li key={e.id}>
                <span className="name">R{e.round}</span>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
          <div className="divider" />
          <h2>Saved Game History (localStorage)</h2>
          <ul className="summary-list">
            {history.map((h) => (
              <li key={h}><span>{h}</span></li>
            ))}
          </ul>
          <div className="divider" />
          <p className="helper">Role breakdown: {roleBreakdownText() || 'N/A'}</p>
          <div className="divider" />

          <div className="bottom-row">
            <button className="secondary" onClick={resetToLobby}>
              Play again with same lobby
            </button>
            <button
              className="ghost"
              onClick={() => {
                setPlayers([])
                setRoomConfig({
                  roomName: '',
                  password: '',
                  type: 'online',
                  includeGodfather: false,
                  includeGrandmother: false,
                })
                setPlayType(null)
                setGeneratedShareCode('')
                setMode('mode-select')
                setEvents([])
                setNightChoices({})
                setNominations({})
                setDefenseCandidateId(null)
                setFinalVotes({})
              }}
            >
              New game
            </button>
          </div>
        </div>
      </div>
    )
  }

  let content: ReactElement
  if (mode === 'landing') content = renderLanding()
  else if (mode === 'mode-select') content = renderModeSelect()
  else if (mode === 'lobby') content = renderLobby()
  else if (mode === 'game') content = renderGame()
  else content = renderSummary()

  return content
}

export default App
