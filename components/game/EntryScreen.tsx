'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, DoorOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

const ROLES = [
  { name: 'Godfather', label: 'GODFATHER', src: '/images/godfather.png' },
  { name: 'Mafia', label: 'MAFIA', src: '/images/mafia.png' },
  { name: 'Grandmother', label: 'GRANDMOTHER', src: '/images/grandmother.png' },
  { name: 'Doctor', label: 'DOCTOR', src: '/images/doctor.png' },
  { name: 'Detective', label: 'DETECTIVE', src: '/images/detective.png' },
  { name: 'Civilians', label: 'CIVILIANS', src: '/images/civilians.png' },
] as const

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
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#0a0a0a] text-white">
      {/* Faint watermark */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <span className="select-none whitespace-nowrap font-display text-[clamp(4rem,18vw,12rem)] font-bold uppercase tracking-[0.12em] text-white/[0.04]">
          MAFIA WARS
        </span>
      </div>

      {/* Soft ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[20%] h-[50%] w-[70%] -translate-x-1/2 rounded-full bg-orange-500/[0.06] blur-[100px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex w-fit items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Floating role logos */}
        <div className="flex flex-1 flex-col items-center justify-center pb-4 pt-2">
          <div className="flex w-full max-w-4xl flex-wrap items-start justify-center gap-x-6 gap-y-8 sm:gap-x-8 md:gap-x-10">
            {ROLES.map((role, index) => (
              <motion.div
                key={role.label}
                className="flex w-[4.5rem] flex-col items-center sm:w-20 md:w-24"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
              >
                <motion.div
                  className="relative"
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * 0.28,
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={role.src}
                    alt={role.name}
                    className="relative h-14 w-14 rounded-full object-cover ring-2 ring-white/10 sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem]"
                  />
                </motion.div>
                <p className="mt-3 text-center text-sm font-medium text-white sm:text-base">
                  {role.name}
                </p>
                <p className="mt-0.5 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500 sm:text-[10px]">
                  {role.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Title */}
          <motion.div
            className="mt-10 text-center sm:mt-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            <h1 className="font-display text-[clamp(2rem,7vw,3.5rem)] font-bold uppercase tracking-[0.16em]">
              <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                MAFIA
              </span>{' '}
              <span className="text-white">WARS</span>
            </h1>
            <div
              className="mx-auto mt-3 h-px w-20 bg-gradient-to-r from-transparent via-orange-400 to-transparent"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-zinc-400">How do you want to play?</p>
          </motion.div>
        </div>

        {/* Create / Join panel */}
        <motion.div
          className="mx-auto w-full max-w-md pb-8"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
        >
          <Card glass className="border-white/10 bg-[#111827]/90 p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1 ring-1 ring-white/10">
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  tab === 'create'
                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create Room
              </button>
              <button
                type="button"
                onClick={() => setTab('join')}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  tab === 'join'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Join Room
              </button>
            </div>

            {tab === 'create' ? (
              <div className="mt-5 space-y-4">
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
                  className="w-full !from-orange-400 !to-orange-500"
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
              <div className="mt-5 space-y-4">
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
              <p className="mt-4 text-center text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-zinc-600">{hint}</span>}
    </label>
  )
}
