import { AccessToken } from 'livekit-server-sdk'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL

  if (!apiKey || !apiSecret || !url) {
    return NextResponse.json(
      {
        error: 'LiveKit is not configured',
        configured: false,
      },
      { status: 503 },
    )
  }

  const body = (await req.json()) as {
    roomName: string
    identity: string
    name?: string
  }

  if (!body.roomName || !body.identity) {
    return NextResponse.json({ error: 'Missing roomName or identity' }, { status: 400 })
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: body.identity,
    name: body.name ?? body.identity,
  })
  at.addGrant({
    roomJoin: true,
    room: body.roomName,
    canPublish: true,
    canSubscribe: true,
  })

  const token = await at.toJwt()
  return NextResponse.json({ token, url, configured: true })
}
