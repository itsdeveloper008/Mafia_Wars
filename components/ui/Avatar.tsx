'use client'

const PALETTE = [
  'from-mw-primary to-blue-800',
  'from-mw-accent to-red-900',
  'from-violet-500 to-violet-900',
  'from-emerald-500 to-emerald-900',
  'from-mw-gold to-amber-800',
  'from-cyan-500 to-cyan-900',
]

function hashName(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 97
  return h
}

export function Avatar({
  name,
  size = 'md',
  speaking,
  dead,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  speaking?: boolean
  dead?: boolean
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
  const color = PALETTE[hashName(name) % PALETTE.length]
  const dim =
    size === 'sm' ? 'h-9 w-9 text-xs' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-sm'

  return (
    <div className="relative shrink-0">
      <div
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br font-display font-bold text-white shadow-mw ${dim} ${color} ${
          speaking ? 'ring-2 ring-mw-primary shadow-mw-blue' : 'ring-1 ring-white/10'
        } ${dead ? 'grayscale opacity-60' : ''}`}
      >
        {initials || '?'}
      </div>
      {speaking && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mw-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mw-primary" />
        </span>
      )}
    </div>
  )
}
