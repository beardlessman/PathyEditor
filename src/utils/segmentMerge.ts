import type { MapboxProfile } from '../types/segmentMerge'
import { MERGE_GROUP_COLORS, PROFILE_MAX_SPEED_MS } from '../types/segmentMerge'
import type {
  SegmentMergePreviewConnection,
  SegmentMergePreviewGroup,
} from '../types/segmentMerge'
import type { TrackPoint } from '../types/track'
import { haversineDistance } from './geo'
import { hasTrackTimeData } from './filters/stopFilter'
import { cloneTrackPoints } from './filters/helpers'
import { getRouteWithTime, MapboxError } from './mapboxService'

export const GROUP_MERGE_BATCH_SIZE = 2

export interface SegmentMergeOptions {
  minGapMinutes: number
  maxGapMinutes: number
  profile: MapboxProfile
}

export interface MergeableSegment {
  snapshotId: string
  fileName: string
  color: string
  isSelected: boolean
  rawPoints: TrackPoint[]
}

export interface SegmentMergeAnalyzeResult {
  previewGroups: SegmentMergePreviewGroup[]
  clusteredGroups: MergeableSegment[][]
  excludedTrackCount: number
}

export interface SegmentMergeApplyResult {
  tracks: MergeableSegment[]
  mergedPairCount: number
  mergedGroupCount: number
}

export function getTrackStartTime(points: TrackPoint[]): number | null {
  return points[0]?.time?.getTime() ?? null
}

export function hasValidTrackTime(points: TrackPoint[]): boolean {
  return hasTrackTimeData(points)
}

export function isMergeablePair(
  endPoint: TrackPoint,
  startPoint: TrackPoint,
  options: SegmentMergeOptions,
): boolean {
  if (!endPoint.time || !startPoint.time) return false

  const endMs = endPoint.time.getTime()
  const startMs = startPoint.time.getTime()
  if (startMs <= endMs) return false

  const deltaSeconds = (startMs - endMs) / 1000
  const minSeconds = options.minGapMinutes * 60
  const maxSeconds = options.maxGapMinutes * 60
  if (deltaSeconds < minSeconds || deltaSeconds > maxSeconds) return false

  const distanceMeters = haversineDistance(
    endPoint.lat,
    endPoint.lon,
    startPoint.lat,
    startPoint.lon,
  )
  const maxDistanceMeters = PROFILE_MAX_SPEED_MS[options.profile] * deltaSeconds

  return distanceMeters <= maxDistanceMeters
}

export function filterAndSortValidTracks(tracks: MergeableSegment[]): {
  validTracks: MergeableSegment[]
  excludedTrackCount: number
} {
  const validTracks = tracks
    .filter((track) => hasValidTrackTime(track.rawPoints))
    .map((track) => ({
      ...track,
      rawPoints: cloneTrackPoints(track.rawPoints),
    }))
    .sort((left, right) => {
      const leftStart = getTrackStartTime(left.rawPoints) ?? Number.POSITIVE_INFINITY
      const rightStart = getTrackStartTime(right.rawPoints) ?? Number.POSITIVE_INFINITY
      return leftStart - rightStart
    })

  return {
    validTracks,
    excludedTrackCount: tracks.length - validTracks.length,
  }
}

export function clusterMergeGroups(
  sortedTracks: MergeableSegment[],
  options: SegmentMergeOptions,
): MergeableSegment[][] {
  if (sortedTracks.length < 2) return []

  const groups: MergeableSegment[][] = []
  let currentGroup: MergeableSegment[] = [sortedTracks[0]]

  for (let index = 1; index < sortedTracks.length; index += 1) {
    const lastTrack = currentGroup[currentGroup.length - 1]
    const nextTrack = sortedTracks[index]
    const endPoint = lastTrack.rawPoints.at(-1)
    const startPoint = nextTrack.rawPoints[0]

    if (endPoint && startPoint && isMergeablePair(endPoint, startPoint, options)) {
      currentGroup.push(nextTrack)
      continue
    }

    if (currentGroup.length > 1) {
      groups.push(currentGroup)
    }
    currentGroup = [nextTrack]
  }

  if (currentGroup.length > 1) {
    groups.push(currentGroup)
  }

  return groups
}

function buildGroupConnections(group: MergeableSegment[]): SegmentMergePreviewConnection[] {
  const connections: SegmentMergePreviewConnection[] = []

  for (let index = 1; index < group.length; index += 1) {
    const previous = group[index - 1].rawPoints.at(-1)
    const current = group[index].rawPoints[0]
    if (!previous || !current) continue

    connections.push({
      from: [previous.lat, previous.lon],
      to: [current.lat, current.lon],
    })
  }

  return connections
}

export function analyzeSegmentMerge(
  tracks: MergeableSegment[],
  options: SegmentMergeOptions,
): SegmentMergeAnalyzeResult {
  const { validTracks, excludedTrackCount } = filterAndSortValidTracks(tracks)
  const clusteredGroups = clusterMergeGroups(validTracks, options)

  const previewGroups: SegmentMergePreviewGroup[] = clusteredGroups.map((group, groupIndex) => ({
    id: groupIndex,
    color: MERGE_GROUP_COLORS[groupIndex % MERGE_GROUP_COLORS.length],
    trackIds: group.map((segment) => segment.snapshotId),
    connections: buildGroupConnections(group),
  }))

  return {
    previewGroups,
    clusteredGroups,
    excludedTrackCount,
  }
}

function mergedGroupFileName(segments: MergeableSegment[]): string {
  const bases = segments.map((segment) => segment.fileName.replace(/\.gpx$/i, ''))
  return `${bases.join('_')}_merged.gpx`
}

function combineTrackPoints(
  left: TrackPoint[],
  bridge: TrackPoint[],
  right: TrackPoint[],
): TrackPoint[] {
  const middle = bridge.length > 2 ? bridge.slice(1, -1) : []
  return cloneTrackPoints([...left, ...middle, ...right])
}

async function fetchBridgeSegment(
  endPoint: TrackPoint,
  startPoint: TrackPoint,
  profile: MapboxProfile,
): Promise<TrackPoint[]> {
  try {
    return await getRouteWithTime(endPoint, startPoint, profile)
  } catch (error) {
    if (error instanceof MapboxError && error.code === 'NoRoute') {
      return []
    }
    throw error
  }
}

export async function mergeGroup(
  group: MergeableSegment[],
  options: SegmentMergeOptions,
): Promise<{ segment: MergeableSegment; pairsMerged: number }> {
  if (group.length === 0) {
    throw new Error('Пустая группа для объединения')
  }

  if (group.length === 1) {
    return { segment: group[0], pairsMerged: 0 }
  }

  let merged: MergeableSegment = {
    ...group[0],
    rawPoints: cloneTrackPoints(group[0].rawPoints),
  }
  let pairsMerged = 0

  for (let index = 1; index < group.length; index += 1) {
    const next = group[index]
    const endPoint = merged.rawPoints.at(-1)
    const startPoint = next.rawPoints[0]
    if (!endPoint || !startPoint) continue

    const bridge = await fetchBridgeSegment(endPoint, startPoint, options.profile)
    if (bridge.length === 0) continue

    merged = {
      snapshotId: merged.snapshotId,
      fileName: mergedGroupFileName(group.slice(0, index + 1)),
      color: merged.color,
      isSelected: merged.isSelected || next.isSelected,
      rawPoints: combineTrackPoints(merged.rawPoints, bridge, next.rawPoints),
    }
    pairsMerged += 1
  }

  merged.fileName = mergedGroupFileName(group)

  return { segment: merged, pairsMerged }
}

export async function mergeClusteredGroups(
  groups: MergeableSegment[][],
  options: SegmentMergeOptions,
  onProgress?: (current: number, total: number) => void,
): Promise<{ mergedGroups: MergeableSegment[]; mergedPairCount: number }> {
  const mergedGroups: MergeableSegment[] = []
  let mergedPairCount = 0

  for (let offset = 0; offset < groups.length; offset += GROUP_MERGE_BATCH_SIZE) {
    const batch = groups.slice(offset, offset + GROUP_MERGE_BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (group, batchIndex) => {
        const groupIndex = offset + batchIndex
        onProgress?.(groupIndex + 1, groups.length)
        return mergeGroup(group, options)
      }),
    )

    for (const result of batchResults) {
      mergedGroups.push(result.segment)
      mergedPairCount += result.pairsMerged
    }
  }

  return { mergedGroups, mergedPairCount }
}

export function assembleFinalTracks(
  allTracks: MergeableSegment[],
  clusteredGroups: MergeableSegment[][],
  mergedGroups: MergeableSegment[],
): MergeableSegment[] {
  const groupedTrackIds = new Set(
    clusteredGroups.flat().map((segment) => segment.snapshotId),
  )

  const output: MergeableSegment[] = []

  for (const track of allTracks) {
    if (!hasValidTrackTime(track.rawPoints)) {
      output.push({
        ...track,
        rawPoints: cloneTrackPoints(track.rawPoints),
      })
    }
  }

  output.push(
    ...mergedGroups.map((segment) => ({
      ...segment,
      rawPoints: cloneTrackPoints(segment.rawPoints),
    })),
  )

  for (const track of allTracks) {
    if (hasValidTrackTime(track.rawPoints) && !groupedTrackIds.has(track.snapshotId)) {
      output.push({
        ...track,
        rawPoints: cloneTrackPoints(track.rawPoints),
      })
    }
  }

  return output.sort((left, right) => {
    const leftStart = getTrackStartTime(left.rawPoints) ?? Number.POSITIVE_INFINITY
    const rightStart = getTrackStartTime(right.rawPoints) ?? Number.POSITIVE_INFINITY
    return leftStart - rightStart
  })
}

export async function applySegmentMerge(
  allTracks: MergeableSegment[],
  clusteredGroups: MergeableSegment[][],
  options: SegmentMergeOptions,
  onProgress?: (current: number, total: number) => void,
): Promise<SegmentMergeApplyResult> {
  const { mergedGroups, mergedPairCount } = await mergeClusteredGroups(
    clusteredGroups,
    options,
    onProgress,
  )

  const tracks = assembleFinalTracks(allTracks, clusteredGroups, mergedGroups)

  return {
    tracks,
    mergedPairCount,
    mergedGroupCount: clusteredGroups.length,
  }
}
