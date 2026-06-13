import type { ChartPoint, ElevationStats, TrackPoint } from '../types/track'

const EARTH_RADIUS_M = 6371000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function computeCumulativeDistances(points: TrackPoint[]): number[] {
  if (points.length === 0) return []

  const distances = [0]
  for (let i = 1; i < points.length; i += 1) {
    const segment = haversineDistance(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon,
    )
    distances.push(distances[i - 1] + segment)
  }
  return distances
}

export function computeTotalDistanceKm(points: TrackPoint[]): number {
  const distances = computeCumulativeDistances(points)
  return distances.length > 0 ? distances[distances.length - 1] / 1000 : 0
}

export function computeElevationStats(points: TrackPoint[]): ElevationStats | null {
  const elevations = points
    .map((point) => point.ele)
    .filter((elevation): elevation is number => elevation !== undefined)

  if (elevations.length === 0) return null

  let gain = 0
  let loss = 0
  let previousElevation: number | undefined

  for (const point of points) {
    if (point.ele === undefined) continue

    if (previousElevation !== undefined) {
      const delta = point.ele - previousElevation
      if (delta > 0) gain += delta
      else loss += Math.abs(delta)
    }

    previousElevation = point.ele
  }

  return {
    min: Math.min(...elevations),
    max: Math.max(...elevations),
    gain,
    loss,
  }
}

export function computeDurationSeconds(points: TrackPoint[]): number | null {
  const times = points
    .map((point) => point.time)
    .filter((time): time is Date => time !== undefined)

  if (times.length < 2) return null

  const start = times[0].getTime()
  const end = times[times.length - 1].getTime()
  return Math.max(0, Math.round((end - start) / 1000))
}

export function buildChartData(points: TrackPoint[]): ChartPoint[] {
  const distances = computeCumulativeDistances(points)

  return points.flatMap((point, index) => {
    if (point.ele === undefined) return []

    return [
      {
        index,
        distanceKm: distances[index] / 1000,
        elevation: point.ele,
      },
    ]
  })
}

export function findNearestPointIndex(
  points: TrackPoint[],
  lat: number,
  lon: number,
): number {
  if (points.length === 0) return -1

  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    const distance = haversineDistance(point.lat, point.lon, lat, lon)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  }

  return nearestIndex
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}ч ${minutes}м ${secs}с`
  }

  if (minutes > 0) {
    return `${minutes}м ${secs}с`
  }

  return `${secs}с`
}

export function formatLocalDateTime(date: Date | undefined): string {
  if (!date) return '—'
  return date.toLocaleString('ru-RU')
}
