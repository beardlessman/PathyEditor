import type { TrackPoint } from '../../types/track'
import { haversineDistance } from '../geo'
import { cloneTrackPoints } from './helpers'

export function hasTrackTimeData(points: TrackPoint[]): boolean {
  return points.length >= 2 && points.every((point) => point.time !== undefined)
}

function clusterCentroid(cluster: TrackPoint[]): TrackPoint {
  const lat = cluster.reduce((sum, point) => sum + point.lat, 0) / cluster.length
  const lon = cluster.reduce((sum, point) => sum + point.lon, 0) / cluster.length

  const elevations = cluster
    .map((point) => point.ele)
    .filter((elevation): elevation is number => elevation !== undefined)

  const startTime = cluster[0].time

  return {
    lat,
    lon,
    ele: elevations.length > 0 ? elevations.reduce((a, b) => a + b, 0) / elevations.length : undefined,
    time: startTime ? new Date(startTime) : undefined,
  }
}

function durationSeconds(from: TrackPoint, to: TrackPoint): number {
  if (!from.time || !to.time) return 0
  return Math.max(0, (to.time.getTime() - from.time.getTime()) / 1000)
}

export function applyStopFilter(
  points: TrackPoint[],
  radiusMeters: number,
  durationSecondsThreshold: number,
): TrackPoint[] {
  if (points.length < 2 || !hasTrackTimeData(points)) {
    return cloneTrackPoints(points)
  }

  const result: TrackPoint[] = []
  let index = 0

  while (index < points.length) {
    const start = points[index]
    let nextIndex = index + 1

    while (nextIndex < points.length) {
      const candidate = points[nextIndex]
      const distance = haversineDistance(start.lat, start.lon, candidate.lat, candidate.lon)
      if (distance > radiusMeters) break
      nextIndex += 1
    }

    const lastInClusterIndex = nextIndex - 1

    if (nextIndex >= points.length) {
      const cluster = points.slice(index, points.length)
      const dwellSeconds = durationSeconds(start, points[lastInClusterIndex])

      if (dwellSeconds >= durationSecondsThreshold && cluster.length > 1) {
        result.push(clusterCentroid(cluster))
      } else {
        result.push(...cloneTrackPoints(cluster))
      }
      break
    }

    const dwellSeconds = durationSeconds(start, points[lastInClusterIndex])

    if (dwellSeconds >= durationSecondsThreshold && lastInClusterIndex > index) {
      result.push(clusterCentroid(points.slice(index, nextIndex)))
      index = nextIndex
      continue
    }

    for (let clusterIndex = index; clusterIndex < nextIndex; clusterIndex += 1) {
      result.push({
        ...points[clusterIndex],
        time: points[clusterIndex].time ? new Date(points[clusterIndex].time!) : undefined,
      })
    }

    index = nextIndex
  }

  return result.length > 0 ? result : cloneTrackPoints(points)
}
