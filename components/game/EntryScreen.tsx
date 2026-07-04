'use client'

import { useState } from 'react'
import { ArrowLeft, DoorOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { FadeIn, Shell } from '@/components/ui/Shell'

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

  return (
    <Shell>
      <FadeIn className="mx-auto max-w-lg pt-6 sm:pt-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm text-mw-muted transition hover:text-mw-text"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <Card glass className="p-6 sm:p-8">
          <p className="mw-label text-mw-primary">Play Online</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-mw-text">
            Join the table
          </h1>
          <p className="mt-1 text-sm text-mw-muted">
            Hosts run the game. Players never see other roles.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-mw bg-mw-bg p-1 ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`rounded-[0.65rem] px-3 py-2.5 text-sm font-semibold transition ${
                tab === 'create'
                  ? 'bg-mw-gold text-mw-bg shadow-mw'
                  : 'text-mw-muted hover:text-mw-text'
              }`}
            >
              Create Room
            </button>
            <button
              type="button"
              onClick={() => setTab('join')}
              className={`rounded-[0.65rem] px-3 py-2.5 text-sm font-semibold transition ${
                tab === 'join'
                  ? 'bg-mw-primary text-white shadow-mw'
                  : 'text-mw-muted hover:text-mw-text'
              }`}
            >
              Join Room
            </button>
          </div>

          {tab === 'create' ? (
            <div className="mt-6 space-y-4">
              <Field label="Host display name">
                <Input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Game Master name"
                />
              </Field>
              <Field label="Room name" hint="Optional">
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Friday Night Mafia"
                />
              </Field>
              <Button
                variant="gold"
                className="w-full"
                size="lg"
                loading={busy}
                disabled={!hostName.trim()}
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => onCreate(hostName, roomName)}
              >
                Create as Game Master
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <Field label="Your name">
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Player name"
                />
              </Field>
              <Field label="Room code">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC12"
                  maxLength={8}
                  className="font-mono tracking-[0.25em]"
                />
              </Field>
              <Button
                variant="primary"
                className="w-full"
                size="lg"
                loading={busy}
                disabled={!playerName.trim() || !code.trim()}
                leftIcon={<DoorOpen className="h-4 w-4" />}
                onClick={() => onJoin(playerName, code, 'default')}
              >
                Join Room
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-center text-sm text-mw-danger" role="alert">
              {error}
            </p>
          )}
        </Card>
      </FadeIn>
    </Shell>
  )
}
