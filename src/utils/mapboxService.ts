import type { MapboxProfile } from '../types/segmentMerge'
import type { TrackPoint } from '../types/track'
import { computeCumulativeDistances } from './geo'

export class MapboxError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MapboxError'
    this.code = code
  }
}

interface DirectionsResponse {
  code: string
  message?: string
  routes?: Array<{
    geometry: {
      coordinates: [number, number][]
    }
  }>
}

export function getMapboxToken(): string {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token) {
    throw new MapboxError('MissingToken', 'Токен Mapbox не настроен (VITE_MAPBOX_TOKEN)')
  }
  return token
}

export async function fetchDirectionsCoordinates(
  start: TrackPoint,
  end: TrackPoint,
  profile: MapboxProfile,
): Promise<Array<{ lat: number; lon: number }>> {
  const token = getMapboxToken()
  const coordinates = `${start.lon},${start.lat};${end.lon},${end.lat}`
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}` +
    `?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new MapboxError('HttpError', `Mapbox Directions: HTTP ${response.status}`)
  }

  const data = (await response.json()) as DirectionsResponse
  if (data.code !== 'Ok') {
    throw new MapboxError(data.code, data.message ?? `Mapbox Directions: ${data.code}`)
  }

  const routeCoords = data.routes?.[0]?.geometry.coordinates
  if (!routeCoords || routeCoords.length < 2) {
    throw new MapboxError('NoRoute', 'Маршрут между точками не найден')
  }

  return routeCoords.map(([lon, lat]) => ({ lat, lon }))
}

export function assignTimesAlongRoute(
  routeCoords: Array<{ lat: number; lon: number }>,
  start: TrackPoint,
  end: TrackPoint,
): TrackPoint[] {
  if (routeCoords.length === 0) return []

  const points: TrackPoint[] = routeCoords.map((coord) => ({
    lat: coord.lat,
    lon: coord.lon,
  }))

  if (!start.time || !end.time) {
    return points
  }

  const distances = computeCumulativeDistances(points)
  const totalDistance = distances[distances.length - 1] ?? 0
  const startMs = start.time.getTime()
  const endMs = end.time.getTime()
  const durationMs = endMs - startMs

  for (let i = 0; i < points.length; i += 1) {
    const ratio = totalDistance === 0 ? 0 : distances[i] / totalDistance
    points[i].time = new Date(startMs + durationMs * ratio)

    if (start.ele !== undefined && end.ele !== undefined) {
      points[i].ele = start.ele + (end.ele - start.ele) * ratio
    }
  }

  return points
}

export async function getRouteWithTime(
  start: TrackPoint,
  end: TrackPoint,
  profile: MapboxProfile,
): Promise<TrackPoint[]> {
  const coordinates = await fetchDirectionsCoordinates(start, end, profile)
  return assignTimesAlongRoute(coordinates, start, end)
}
