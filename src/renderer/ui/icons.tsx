/**
 * The app's single line-icon set: 24px grid, 1.75 stroke, round caps/joins,
 * drawn in currentColor so hover / active / disabled states colour them.
 * Every toolbar, header and menu icon comes from here so they all match.
 */

const PATHS = {
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  redo: ['m15 14 5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13'],
  bold: ['M7 5h6a3.5 3.5 0 0 1 0 7H7z', 'M7 12h7a3.5 3.5 0 0 1 0 7H7z'],
  italic: ['M19 4h-9', 'M14 20H5', 'M15 4 9 20'],
  strike: ['M16 6.5C15.3 5 13.9 4 12 4c-2.5 0-4.5 1.4-4.5 3.6 0 1.6 1 2.6 3 3.4', 'M4 12h16', 'M15.5 14.5c.4.5.5 1 .5 1.7 0 2.3-2 3.8-4.7 3.8-2.1 0-3.8-1-4.6-2.7'],
  textColor: ['M6.5 16 12 4l5.5 12', 'M8.4 12h7.2'],
  bulletList: ['M9 6h11', 'M9 12h11', 'M9 18h11'],
  orderedList: ['M10 6h10', 'M10 12h10', 'M10 18h10', 'M4 4.5 5.2 4v4.5', 'M4 14.2c.3-.5.8-.7 1.3-.7.8 0 1.3.5 1.3 1.1 0 1.1-2.6 1.6-2.6 3.4h2.7'],
  quote: ['M9.5 7H5v5h4.5v1.5A3.5 3.5 0 0 1 6 17', 'M19 7h-4.5v5H19v1.5a3.5 3.5 0 0 1-3.5 3.5'],
  divider: ['M3 12h18', 'M8 6h8', 'M8 18h8'],
  inlineCode: ['m9 8-4 4 4 4', 'm15 8 4 4-4 4'],
  codeBlock: ['M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'm10 9.5-2.5 2.5 2.5 2.5', 'm14 9.5 2.5 2.5-2.5 2.5'],
  table: ['M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M4 9.5h16', 'M4 14.75h16', 'M10 9.5V20'],
  image: ['M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'm4 16 4.5-4.5a1.5 1.5 0 0 1 2 0L17 18', 'm14 15 1.5-1.5a1.5 1.5 0 0 1 2 0L20 16'],
  link: ['M10 13.5a4.5 4.5 0 0 0 6.4.4l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3', 'M14 10.5a4.5 4.5 0 0 0-6.4-.4l-2.8 2.8a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3'],
  palette: ['M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.6-.7 1.6-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.9.7-1.5 1.5-1.5h1.9a4.3 4.3 0 0 0 4.3-4.3c0-4.2-3.8-7.6-8.5-7.6z'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'm20 20-4-4'],
  filePlus: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M12 11.5v6', 'M9 14.5h6'],
  folderOpen: ['M4 19V6a1 1 0 0 1 1-1h4.5l2 2H18a1 1 0 0 1 1 1v2', 'M4 19l2.6-7.2a1 1 0 0 1 .9-.8H21l-2.7 7.3a1 1 0 0 1-.9.7z'],
  save: ['M5 4h11l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M8 4v4.5h7V4', 'M7.5 20v-6h9v6'],
  download: ['M12 4v11', 'm7.5 10.5 4.5 4.5 4.5-4.5', 'M5 20h14'],
  chevronDown: ['m7 10 5 5 5-5'],
  chevronUp: ['m7 14 5-5 5 5'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  sidebar: ['M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M9.5 4v16'],
  matchCase: ['M3 17 6.5 7l3.5 10', 'M4.3 13.5h4.4', 'M14 11.3c.5-.6 1.3-1 2.2-1 1.5 0 2.3.9 2.3 2.3V17', 'M18.5 14.2h-2.4c-1.3 0-2.1.6-2.1 1.5s.7 1.4 1.7 1.4c1.6 0 2.8-1.1 2.8-2.9'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  trash: ['M4 7h16', 'M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2', 'M6.5 7l.8 12a1 1 0 0 0 1 1h7.4a1 1 0 0 0 1-1l.8-12'],
  alignLeft: ['M4 6h16', 'M4 10h9', 'M4 14h16', 'M4 18h9'],
  alignCenter: ['M4 6h16', 'M7.5 10h9', 'M4 14h16', 'M7.5 18h9'],
  alignRight: ['M4 6h16', 'M11 10h9', 'M4 14h16', 'M11 18h9']
} as const

export type IconName = keyof typeof PATHS

/** Small filled dots for the bullet-list icon (strokes can't draw them). */
const DOTS: Partial<Record<IconName, [number, number][]>> = {
  bulletList: [
    [4.5, 6],
    [4.5, 12],
    [4.5, 18]
  ],
  palette: [
    [8, 11],
    [10.5, 7.5],
    [14.5, 7.5]
  ]
}

export function Icon({
  name,
  size = 18,
  className
}: {
  name: IconName
  size?: number
  className?: string
}): JSX.Element {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
      {DOTS[name]?.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.25} fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}

/** The app mark: a miniature of the three-pane document it produces. */
export function AppMark({ size = 24 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#1F3A5F" />
      <rect x="4.5" y="4.5" width="15" height="3" rx="1.2" fill="#fff" />
      <rect x="4.5" y="9.5" width="4.5" height="10" rx="1.2" fill="#fff" opacity=".45" />
      <rect x="10.5" y="9.5" width="9" height="2" rx="1" fill="#7FB0F0" />
      <rect x="10.5" y="13.25" width="9" height="1.5" rx=".75" fill="#fff" opacity=".7" />
      <rect x="10.5" y="16.5" width="6.5" height="1.5" rx=".75" fill="#fff" opacity=".7" />
    </svg>
  )
}
