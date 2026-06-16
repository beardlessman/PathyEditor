export type MapboxProfile = 'walking' | 'cycling' | 'driving'

export type SegmentMergeStatus = 'idle' | 'preview' | 'loading' | 'error'

export interface SegmentMergeSettings {
  enabled: boolean
  minGapMinutes: number
  maxGapMinutes: number
  profile: MapboxProfile
}

export interface SegmentMergeProgress {
  phase: 'clustering' | 'routing'
  message: string
  current: number
  total: number
}

export interface SegmentMergePreviewConnection {
  from: [number, number]
  to: [number, number]
}

export interface SegmentMergePreviewGroup {
  id: number
  color: string
  trackIds: string[]
  connections: SegmentMergePreviewConnection[]
}

export function createDefaultSegmentMergeSettings(): SegmentMergeSettings {
  return {
    enabled: false,
    minGapMinutes: 1,
    maxGapMinutes: 5,
    profile: 'walking',
  }
}

export const PROFILE_MAX_SPEED_MS: Record<MapboxProfile, number> = {
  walking: 2,
  cycling: 15,
  driving: 40,
}

export const MERGE_GROUP_COLORS = [
  '#F59E0B',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#EF4444',
  '#84CC16',
  '#F97316',
] as const
