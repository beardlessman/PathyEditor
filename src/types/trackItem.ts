export const TRACK_COLORS = [
  '#38bdf8',
  '#f472b6',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#60a5fa',
  '#4ade80',
  '#f97316',
  '#c084fc',
  '#2dd4bf',
  '#e879f9',
] as const

export type TrackStatus = 'parsing' | 'ready' | 'error'
