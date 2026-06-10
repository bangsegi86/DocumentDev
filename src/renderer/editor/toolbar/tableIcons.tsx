/* Excel-style table editing icons (insert/delete row & column, header, delete table). */

const GREEN = '#16a34a'
const RED = '#dc2626'
const BLUE = '#2563eb'

interface IconProps {
  size?: number
}

function Svg({ size = 16, children }: IconProps & { children: React.ReactNode }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {children}
    </svg>
  )
}

/** Neutral 3-row x 2-col grid frame. */
function RowFrame(): JSX.Element {
  return (
    <g stroke="currentColor" strokeWidth="1.2">
      <rect x="3" y="3" width="14" height="14" rx="1.5" />
      <line x1="3" y1="7.67" x2="17" y2="7.67" />
      <line x1="3" y1="12.33" x2="17" y2="12.33" />
      <line x1="10" y1="3" x2="10" y2="17" />
    </g>
  )
}

/** Neutral 2-row x 3-col grid frame. */
function ColFrame(): JSX.Element {
  return (
    <g stroke="currentColor" strokeWidth="1.2">
      <rect x="3" y="3" width="14" height="14" rx="1.5" />
      <line x1="7.67" y1="3" x2="7.67" y2="17" />
      <line x1="12.33" y1="3" x2="12.33" y2="17" />
      <line x1="3" y1="10" x2="17" y2="10" />
    </g>
  )
}

type Num = number | string

function Band(props: { x: Num; y: Num; w: Num; h: Num; color: string }): JSX.Element {
  return <rect x={props.x} y={props.y} width={props.w} height={props.h} fill={props.color} opacity="0.28" />
}

function Badge({ cx, cy, sign, color }: { cx: Num; cy: Num; sign: '+' | '-'; color: string }): JSX.Element {
  const x = Number(cx)
  const y = Number(cy)
  return (
    <g>
      <circle cx={x} cy={y} r="3.6" fill={color} />
      <line x1={x - 1.8} y1={y} x2={x + 1.8} y2={y} stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      {sign === '+' && (
        <line x1={x} y1={y - 1.8} x2={x} y2={y + 1.8} stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      )}
    </g>
  )
}

export function InsertRowAbove(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <Band x="3.6" y="3.6" w="12.8" h="3.47" color={GREEN} />
      <RowFrame />
      <Badge cx="16.5" cy="3.5" sign="+" color={GREEN} />
    </Svg>
  )
}

export function InsertRowBelow(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <Band x="3.6" y="12.93" w="12.8" h="3.47" color={GREEN} />
      <RowFrame />
      <Badge cx="16.5" cy="16.5" sign="+" color={GREEN} />
    </Svg>
  )
}

export function DeleteRow(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <Band x="3.6" y="8.27" w="12.8" h="3.46" color={RED} />
      <RowFrame />
      <Badge cx="16.5" cy="10" sign="-" color={RED} />
    </Svg>
  )
}

export function InsertColLeft(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <Band x="3.6" y="3.6" w="3.47" h="12.8" color={GREEN} />
      <ColFrame />
      <Badge cx="3.5" cy="3.5" sign="+" color={GREEN} />
    </Svg>
  )
}

export function InsertColRight(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <Band x="12.93" y="3.6" w="3.47" h="12.8" color={GREEN} />
      <ColFrame />
      <Badge cx="16.5" cy="3.5" sign="+" color={GREEN} />
    </Svg>
  )
}

export function DeleteColumn(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <Band x="8.27" y="3.6" w="3.46" h="12.8" color={RED} />
      <ColFrame />
      <Badge cx="10" cy="16.5" sign="-" color={RED} />
    </Svg>
  )
}

export function HeaderRow(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <rect x="3.6" y="3.6" width="12.8" height="3.47" fill={BLUE} opacity="0.85" />
      <RowFrame />
    </Svg>
  )
}

export function DeleteTable(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <RowFrame />
      <line x1="6" y1="6" x2="14" y2="14" stroke={RED} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14" y1="6" x2="6" y2="14" stroke={RED} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

export function AutoFitTable(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <ColFrame />
      <g stroke={BLUE} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="5" y1="10" x2="8" y2="10" />
        <path d="M6.4 8.6 5 10l1.4 1.4" />
        <line x1="15" y1="10" x2="12" y2="10" />
        <path d="M13.6 8.6 15 10l-1.4 1.4" />
      </g>
    </Svg>
  )
}
