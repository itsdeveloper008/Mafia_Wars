'use client'

import {
  CheckCircle2,
  Copy,
  Mic,
  MicOff,
  Play,
  Share2,
  Video,
  VideoOff,
} from 'lucide-react'
import { GAME_PRESETS } from '@/constants/settings'
import type { GamePreset, GameSession, RoomSettings } from '@/types/game'
import { SoundManager } from '@/services/audio/SoundManager'
import { HostBadge, PlayerCard } from './PlayerCard'
import {
  FadeIn,
  GhostButton,
  GlassPanel,
  PrimaryButton,
  ScreenShell,
} from './ui'

export function LobbyScreen({
  session,
  busy,
  error,
  onUpdateSettings,
  onToggleReady,
  onToggleMic,
  onToggleCamera,
  onKick,
  onStart,
  onToggleAutoMode,
}: {
  session: GameSession
  busy: boolean
  error: string
  onUpdateSettings: (s: RoomSettings) => void
  onToggleReady: () => void
  onToggleMic: () => void
  onToggleCamera: () => void
  onKick: (id: string) => void
  onStart: () => void
  onToggleAutoMode: (auto: boolean) => void
}) {
  const { room, players, isHost, me } = session
  const s = room.settings
  const readyCount = players.filter((p) => p.isReady).length

  async function copyCode() {
    await navigator.clipboard.writeText(room.roomCode)
  }

  async function share() {
    const url = `${window.location.origin}?code=${room.roomCode}`
    const text = `Join my Mafia Wars room!\nCode: ${room.roomCode}\n${url}`
    if (navigator.share) {
      await navigator.share({ title: 'Mafia Wars', text, url }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <ScreenShell>
      <FadeIn className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-glow">
              {room.roomName}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white">Lobby</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isHost ? <HostBadge /> : null}
              <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-slate-300">
                {players.length}/{s.maxPlayers} players · {readyCount} ready
              </span>
            </div>
          </div>

          <GlassPanel className="min-w-[240px] text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Room Code
            </p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-[0.2em] text-white">
              {room.roomCode}
            </p>
            <div className="mt-3 flex gap-2">
              <GhostButton className="flex-1 py-2" onClick={() => void copyCode()}>
                <Copy className="h-4 w-4" /> Copy
              </GhostButton>
              <GhostButton className="flex-1 py-2" onClick={() => void share()}>
                <Share2 className="h-4 w-4" /> Invite
              </GhostButton>
            </div>
          </GlassPanel>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Players
            </h2>
            {players.length === 0 ? (
              <GlassPanel>
                <p className="text-sm text-slate-400">
                  Waiting for players to join with the room code…
                </p>
              </GlassPanel>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {players.map((p) => (
                  <div key={p.playerId} className="relative">
                    <PlayerCard player={p} isYou={p.uid === session.uid} />
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => onKick(p.playerId)}
                        className="absolute right-3 top-3 text-xs text-rose-300 hover:text-rose-200"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isHost && me && (
              <GlassPanel className="flex flex-wrap gap-2">
                <GhostButton onClick={onToggleReady}>
                  <CheckCircle2 className="h-4 w-4" />
                  {me.isReady ? 'Unready' : 'Ready Up'}
                </GhostButton>
                <GhostButton onClick={onToggleMic}>
                  {me.micEnabled ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4" />
                  )}
                  Mic
                </GhostButton>
                <GhostButton onClick={onToggleCamera}>
                  {me.cameraEnabled ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <VideoOff className="h-4 w-4" />
                  )}
                  Camera
                </GhostButton>
              </GlassPanel>
            )}
          </section>

          <aside className="space-y-4">
            <GlassPanel>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                Game Settings
              </h2>
              <div className="mt-4 space-y-3">
                {isHost && (
                  <div>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                      Preset
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        Object.keys(GAME_PRESETS) as Exclude<
                          GamePreset,
                          'custom'
                        >[]
                      ).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            SoundManager.play('click')
                            onUpdateSettings({
                              ...s,
                              ...GAME_PRESETS[key],
                            })
                          }}
                          className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                            s.preset === key
                              ? 'bg-amber-glow text-navy-950'
                              : 'bg-white/5 text-slate-300'
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
                  <span>Discussion mode</span>
                  <select
                    disabled={!isHost}
                    value={s.discussionMode}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...s,
                        discussionMode: e.target
                          .value as RoomSettings['discussionMode'],
                      })
                    }
                    className="rounded-lg border border-white/10 bg-navy-950 px-2 py-1 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="moderated">Moderated</option>
                    <option value="push_to_talk">Push-to-talk</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
                  <span>Narrator</span>
                  <select
                    disabled={!isHost}
                    value={s.narratorStyle}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...s,
                        narratorStyle: e.target
                          .value as RoomSettings['narratorStyle'],
                      })
                    }
                    className="rounded-lg border border-white/10 bg-navy-950 px-2 py-1 text-sm"
                  >
                    <option value="classic">Classic</option>
                    <option value="dark">Dark</option>
                    <option value="female">Female</option>
                    <option value="deep">Deep</option>
                    <option value="robotic">Robotic</option>
                  </select>
                </label>
                <Toggle
                  label="Anonymous mode"
                  checked={s.anonymousMode}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, anonymousMode: v })}
                />
                <TimerField
                  label="Discussion (sec)"
                  value={s.discussionTime}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, discussionTime: v })}
                />
                <TimerField
                  label="Voting (sec)"
                  value={s.votingTime}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, votingTime: v })}
                />
                <TimerField
                  label="Night (sec)"
                  value={s.nightTime}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, nightTime: v })}
                />
                <Toggle
                  label="Auto Mode"
                  checked={s.autoMode}
                  disabled={!isHost}
                  onChange={onToggleAutoMode}
                />
                <Toggle
                  label="Voice channel"
                  checked={s.voiceEnabled}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, voiceEnabled: v })}
                />
                <Toggle
                  label="Video channel"
                  checked={s.videoEnabled}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, videoEnabled: v })}
                />
                <Toggle
                  label="Godfather (10+)"
                  checked={s.includeGodfather}
                  disabled={!isHost}
                  onChange={(v) =>
                    onUpdateSettings({ ...s, includeGodfather: v })
                  }
                />
                <Toggle
                  label="Grandma"
                  checked={s.includeGrandma}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, includeGrandma: v })}
                />
                <Toggle
                  label="Jester"
                  checked={s.includeJester}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, includeJester: v })}
                />
              </div>
            </GlassPanel>

            {isHost ? (
              <PrimaryButton
                className="w-full py-4 text-base"
                disabled={busy || players.length < 4}
                onClick={onStart}
              >
                <Play className="h-5 w-5" />
                {busy ? 'Starting…' : 'Start Game'}
              </PrimaryButton>
            ) : (
              <GlassPanel>
                <p className="text-sm text-slate-300">
                  You are a player. Ready up and wait for the Game Master.
                </p>
              </GlassPanel>
            )}
            {error && <p className="text-sm text-rose-300">{error}</p>}
          </aside>
        </div>
      </FadeIn>
    </ScreenShell>
  )
}

function TimerField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
      <span>{label}</span>
      <input
        type="number"
        min={15}
        max={300}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || value)}
        className="w-20 rounded-lg border border-white/10 bg-navy-950 px-2 py-1 text-right font-mono text-sm"
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
      <span>{label}</span>
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-cyan-glow"
      />
    </label>
  )
}
