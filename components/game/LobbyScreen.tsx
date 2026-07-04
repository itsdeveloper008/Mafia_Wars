'use client'

import {
  CheckCircle2,
  Copy,
  Mic,
  MicOff,
  Play,
  Share2,
  Users,
  Video,
  VideoOff,
} from 'lucide-react'
import { GAME_PRESETS } from '@/constants/settings'
import { SoundManager } from '@/services/audio/SoundManager'
import type { GamePreset, GameSession, RoomSettings } from '@/types/game'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Input'
import { FadeIn, Shell } from '@/components/ui/Shell'
import { HostBadge, PlayerCard } from './PlayerCard'

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
    SoundManager.play('click')
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
    <Shell>
      <FadeIn className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mw-label text-mw-primary">{room.roomName}</p>
            <h1 className="mw-title mt-1">Lobby</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isHost ? <HostBadge /> : null}
              <Badge tone="neutral">
                {players.length}/{s.maxPlayers} players
              </Badge>
              <Badge tone="success">{readyCount} ready</Badge>
            </div>
          </div>

          <Card glass className="min-w-[240px] text-center sm:min-w-[280px]">
            <p className="mw-label">Room Code</p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-[0.22em] text-mw-text">
              {room.roomCode}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                leftIcon={<Copy className="h-4 w-4" />}
                onClick={() => void copyCode()}
              >
                Copy
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                leftIcon={<Share2 className="h-4 w-4" />}
                onClick={() => void share()}
              >
                Invite
              </Button>
            </div>
          </Card>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="mw-label">Players</h2>
            </div>

            {players.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Users}
                  title="Waiting for players"
                  description="Share the room code so friends can join the table."
                />
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {players.map((p) => (
                  <div key={p.playerId} className="relative">
                    <PlayerCard player={p} isYou={p.uid === session.uid} />
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => onKick(p.playerId)}
                        className="absolute right-3 top-3 text-xs text-mw-danger hover:underline"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isHost && me && (
              <Card className="flex flex-wrap gap-2">
                <Button
                  variant={me.isReady ? 'secondary' : 'primary'}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={onToggleReady}
                >
                  {me.isReady ? 'Unready' : 'Ready Up'}
                </Button>
                <Button
                  variant="outline"
                  leftIcon={
                    me.micEnabled ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )
                  }
                  onClick={onToggleMic}
                >
                  Mic
                </Button>
                <Button
                  variant="outline"
                  leftIcon={
                    me.cameraEnabled ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <VideoOff className="h-4 w-4" />
                    )
                  }
                  onClick={onToggleCamera}
                >
                  Camera
                </Button>
              </Card>
            )}
          </section>

          <aside className="space-y-4">
            <Card>
              <CardHeader title="Game Settings" subtitle="Host controls" />
              <div className="space-y-3">
                {isHost && (
                  <div>
                    <p className="mw-label mb-2">Preset</p>
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
                            onUpdateSettings({ ...s, ...GAME_PRESETS[key] })
                          }}
                          className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
                            s.preset === key
                              ? 'bg-mw-gold text-mw-bg'
                              : 'bg-mw-bg text-mw-muted ring-1 ring-white/10 hover:text-mw-text'
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <SettingRow label="Discussion mode">
                  <Select
                    disabled={!isHost}
                    value={s.discussionMode}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...s,
                        discussionMode: e.target
                          .value as RoomSettings['discussionMode'],
                      })
                    }
                    className="h-9 w-auto min-w-[140px]"
                  >
                    <option value="free">Free</option>
                    <option value="moderated">Moderated</option>
                    <option value="push_to_talk">Push-to-talk</option>
                  </Select>
                </SettingRow>

                <SettingRow label="Narrator">
                  <Select
                    disabled={!isHost}
                    value={s.narratorStyle}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...s,
                        narratorStyle: e.target
                          .value as RoomSettings['narratorStyle'],
                      })
                    }
                    className="h-9 w-auto min-w-[140px]"
                  >
                    <option value="classic">Classic</option>
                    <option value="dark">Dark</option>
                    <option value="female">Female</option>
                    <option value="deep">Deep</option>
                    <option value="robotic">Robotic</option>
                  </Select>
                </SettingRow>

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
                  label="Anonymous mode"
                  checked={s.anonymousMode}
                  disabled={!isHost}
                  onChange={(v) => onUpdateSettings({ ...s, anonymousMode: v })}
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
            </Card>

            {isHost ? (
              <Button
                variant="gold"
                size="lg"
                className="w-full"
                loading={busy}
                disabled={players.length < 4}
                leftIcon={<Play className="h-5 w-5" />}
                onClick={onStart}
              >
                Start Game
              </Button>
            ) : (
              <Card>
                <p className="text-sm text-mw-muted">
                  Ready up and wait for the Game Master to start.
                </p>
              </Card>
            )}
            {error && <p className="text-sm text-mw-danger">{error}</p>}
          </aside>
        </div>
      </FadeIn>
    </Shell>
  )
}

function SettingRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-mw-text">
      <span>{label}</span>
      {children}
    </div>
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
    <label className="flex items-center justify-between gap-3 text-sm text-mw-text">
      <span>{label}</span>
      <input
        type="number"
        min={15}
        max={300}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || value)}
        className="h-9 w-20 rounded-mw border border-white/10 bg-mw-bg px-2 text-right font-mono text-sm"
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
    <label className="flex items-center justify-between gap-3 text-sm text-mw-text">
      <span>{label}</span>
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-mw-primary"
      />
    </label>
  )
}
