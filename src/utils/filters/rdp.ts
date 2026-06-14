import simplify from 'simplify-js'
import type { TrackPoint } from '../../types/track'
import { cloneTrackPoints } from './helpers'

interface ProjectedPoint {
  x: number
  y: number
  lat: number
  lon: number
  ele?: number
  time?: Date
}

function projectToMeters(points: TrackPoint[]): ProjectedPoint[] {
  const refLat = points[0].lat
  const refLon = points[0].lon
  const cosLat = Math.cos((refLat * Math.PI) / 180)

  return points.map((point) => ({
    ...point,
    x: (point.lon - refLon) * cosLat * 111_320,
    y: (point.lat - refLat) * 110_540,
  }))
}

export function applyRdp(points: TrackPoint[], toleranceMeters: number): TrackPoint[] {
  if (points.length < 3) {
    return cloneTrackPoints(points)
  }

  const projected = projectToMeters(points)
  const simplified = simplify(projected, toleranceMeters, true) as ProjectedPoint[]

  return simplified.map(({ lat, lon, ele, time }) => ({
    lat,
    lon,
    ele,
    time: time ? new Date(time) : undefined,
  }))
}
