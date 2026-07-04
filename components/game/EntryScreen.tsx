'use client'

import { useState } from 'react'
import { ArrowLeft, DoorOpen, Plus } from 'lucide-react'
import { AVATARS } from '@/lib/game/types'
import {
  FadeIn,
  Field,
  GhostButton,
  PrimaryButton,
  ScreenShell,
  TextInput,
  GlassPanel,
} from './ui'

export function EntryScreen({
  busy,
  error,
  initialCode,
  onCreate,
  onJoin,
  onBack,
}: {
  busy: boolean
  error: string
  initialCode: string
  onCreate: (hostName: string, roomName: string) => void
  onJoin: (name: string, code: string, avatar: string) => void
  onBack: () => void
}) {
  const [tab, setTab] = useState<'create' | 'join'>(
    initialCode ? 'join' : 'create',
  )
  const [hostName, setHostName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [code, setCode] = useState(initialCode.toUpperCase())
  const [avatar, setAvatar] = useState(AVATARS[0])

  return (
    <ScreenShell>
      <FadeIn className="mx-auto max-w-xl pt-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <GlassPanel>
          <h1 className="text-2xl font-bold text-white">Play Online</h1>
          <p className="mt-1 text-sm text-slate-400">
            Hosts never play — they run the game. Players join with a room code.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-navy-950/60 p-1">
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                tab === 'create'
                  ? 'bg-amber-glow text-navy-950'
                  : 'text-slate-300'
              }`}
            >
              Create Room
            </button>
            <button
              type="button"
              onClick={() => setTab('join')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                tab === 'join' ? 'bg-cyan-glow text-navy-950' : 'text-slate-300'
              }`}
            >
              Join Room
            </button>
          </div>

          {tab === 'create' ? (
            <div className="mt-6 space-y-4">
              <Field label="Host display name">
                <TextInput
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Game Master name"
                />
              </Field>
              <Field label="Room name">
                <TextInput
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Friday Night Mafia"
                />
              </Field>
              <PrimaryButton
                className="w-full"
                disabled={busy || !hostName.trim()}
                onClick={() => onCreate(hostName, roomName)}
              >
                <Plus className="h-4 w-4" />
                {busy ? 'Creating…' : 'Create as Game Master'}
              </PrimaryButton>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <Field label="Your name">
                <TextInput
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Player name"
                />
              </Field>
              <Field label="Room code">
                <TextInput
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC12"
                  maxLength={8}
                  className="font-mono tracking-[0.2em]"
                />
              </Field>
              <Field label="Avatar">
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                        avatar === a
                          ? 'bg-cyan-glow/20 ring-2 ring-cyan-glow'
                          : 'bg-white/5'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </Field>
              <GhostButton
                className="w-full"
                disabled={busy || !playerName.trim() || !code.trim()}
                onClick={() => onJoin(playerName, code, avatar)}
              >
                <DoorOpen className="h-4 w-4" />
                {busy ? 'Joining…' : 'Join Room'}
              </GhostButton>
            </div>
          )}

          {error && (
            <p className="mt-4 text-center text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
        </GlassPanel>
      </FadeIn>
    </ScreenShell>
  )
}
