'use client'

import { useEffect, useRef } from 'react'
import { Camera, CameraOff, Mic, MicOff, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

function VideoTile({
  stream,
  label,
  muted,
  speaking,
}: {
  stream: MediaStream | null
  label: string
  muted?: boolean
  speaking?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.srcObject = stream
    if (stream) void el.play().catch(() => undefined)
  }, [stream])

  const hasVideo = Boolean(stream?.getVideoTracks().some((t) => t.enabled))

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-mw bg-mw-bg ring-2 ${
        speaking ? 'ring-mw-primary shadow-mw-blue' : 'ring-white/10'
      }`}
    >
      {hasVideo ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-mw-faint">
          <CameraOff className="h-6 w-6" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
        <p className="truncate text-xs font-medium text-white">{label}</p>
      </div>
    </div>
  )
}

export function MediaDock({
  connection,
  peerCount,
  voiceError,
  isHost,
  micOn,
  camOn,
  videoAllowed,
  localStream,
  remoteStreams,
  nameByUid,
  onToggleMic,
  onToggleCam,
}: {
  connection: string
  peerCount: number
  voiceError?: string
  isHost: boolean
  micOn: boolean
  camOn: boolean
  videoAllowed: boolean
  localStream: MediaStream | null
  remoteStreams: Record<string, MediaStream>
  nameByUid: Record<string, string>
  onToggleMic: () => void
  onToggleCam: () => void
}) {
  const remoteEntries = Object.entries(remoteStreams)

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-sm font-semibold text-mw-text">
            Voice & Video
          </p>
          <Badge
            tone={
              connection === 'connected'
                ? 'success'
                : connection === 'connecting'
                  ? 'warning'
                  : 'danger'
            }
          >
            {connection}
          </Badge>
          <Badge tone="neutral">
            <Users className="h-3 w-3" /> {peerCount} connected
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant={micOn ? 'primary' : 'secondary'}
            size="sm"
            leftIcon={
              micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />
            }
            onClick={onToggleMic}
          >
            {isHost ? 'Host Mic' : 'Mic'} {micOn ? 'On' : 'Off'}
          </Button>
          <Button
            variant={camOn ? 'primary' : 'secondary'}
            size="sm"
            disabled={!videoAllowed}
            leftIcon={
              camOn ? (
                <Camera className="h-4 w-4" />
              ) : (
                <CameraOff className="h-4 w-4" />
              )
            }
            onClick={onToggleCam}
            title={
              videoAllowed
                ? 'Toggle camera'
                : 'Enable Video channel in room settings first'
            }
          >
            Cam {camOn ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      {connection === 'connected' && (
        <p className="text-xs text-mw-success">
          Voice is live. Click <strong>Mic On</strong> and speak — others should hear you.
          Click anywhere on the page once if you cannot hear anyone yet.
        </p>
      )}

      {!videoAllowed && (
        <p className="text-xs text-mw-muted">
          Camera is off for this room. Host can enable <strong>Video channel</strong> in
          settings.
        </p>
      )}

      {voiceError && (
        <p className="text-xs text-mw-danger">{voiceError}</p>
      )}

      {connection === 'connecting' && (
        <p className="text-xs text-mw-warning">Connecting to voice… allow microphone access.</p>
      )}

      {(connection === 'disconnected' || connection === 'idle') && (
        <p className="text-xs text-mw-danger">
          Voice not connected. Allow microphone permission and refresh the page.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        <VideoTile
          stream={localStream}
          label="You"
          muted
          speaking={micOn}
        />
        {remoteEntries.map(([id, stream]) => (
          <VideoTile
            key={id}
            stream={stream}
            label={nameByUid[id] ?? id.slice(0, 6)}
          />
        ))}
      </div>
    </Card>
  )
}
