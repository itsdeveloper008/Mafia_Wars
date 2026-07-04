'use client'

import {
  Copy,
  Mic,
  MicOff,
  Play,
  Share2,
  Video,
  VideoOff,
  CheckCircle2,
} from 'lucide-react'
import type { GameSettings, Player, RoomState } from '@/lib/game/types'
import { HostBadge, PlayerCard } from './PlayerCard'
import {
  FadeIn,
  GhostButton,
  GlassPanel,
  PrimaryButton,
  ScreenShell,
} from './ui'

export function LobbyScreen({
  room,
  isHost,
  me,
  clientId,
  busy,
  error,
  onUpdateSettings,
  onToggleReady,
  onToggleMic,
  onToggleCamera,
  onKick,
  onStart,
}: {
  room: RoomState
  isHost: boolean
  me?: Player
  clientId: string
  busy: boolean
  error: string
  onUpdateSettings: (s: GameSettings) => void
  onToggleReady: () => void
  onToggleMic: () => void
  onToggleCamera: () => void
  onKick: (id: string) => void
  onStart: () => void
}) {
  const s = room.settings
  const readyCount = room.players.filter((p) => p.ready).length

  async function copyCode() {
    await navigator.clipboard.writeText(room.code)
  }

  async function share() {
    const url = `${window.location.origin}?code=${room.code}`
    const text = `Join my Mafia Wars room!\nCode: ${room.code}\n${url}`
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
                {room.players.length}/12 players · {readyCount} ready
              </span>
            </div>
          </div>

          <GlassPanel className="min-w-[240px] text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Room Code
            </p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-[0.2em] text-white">
              {room.code}
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
            {room.players.length === 0 ? (
              <GlassPanel>
                <p className="text-sm text-slate-400">
                  Waiting for players to join with the room code…
                </p>
              </GlassPanel>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {room.players.map((p) => (
                  <div key={p.id} className="relative">
                    <PlayerCard
                      player={p}
                      isYou={p.id === clientId}
                      isHostView={isHost}
                    />
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => onKick(p.id)}
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
                  {me.ready ? 'Unready' : 'Ready Up'}
                </GhostButton>
                <GhostButton onClick={onToggleMic}>
                  {me.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  Mic
                </GhostButton>
                <GhostButton onClick={onToggleCamera}>
                  {me.cameraOn ? (
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
                <TimerField
                  label="Discussion (sec)"
                  value={s.discussionSec}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, discussionSec: v })}
                />
                <TimerField
                  label="Voting (sec)"
                  value={s.votingSec}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, votingSec: v })}
                />
                <TimerField
                  label="Night step (sec)"
                  value={s.nightSec}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, nightSec: v })}
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
                disabled={busy || room.players.length < 4}
                onClick={onStart}
              >
                <Play className="h-5 w-5" />
                {busy ? 'Starting…' : 'Start Game'}
              </PrimaryButton>
            ) : (
              <GlassPanel>
                <p className="text-sm text-slate-300">
                  You are a player. Ready up and wait for the Game Master to
                  start.
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
