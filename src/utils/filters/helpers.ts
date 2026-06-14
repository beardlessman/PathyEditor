import type { TrackPoint } from '../../types/track'

export function cloneTrackPoints(points: TrackPoint[]): TrackPoint[] {
  return points.map((point) => ({
    lat: point.lat,
    lon: point.lon,
    ele: point.ele,
    time: point.time ? new Date(point.time) : undefined,
  }))
}

export function lerpTrackPoint(a: TrackPoint, b: TrackPoint, t: number): TrackPoint {
  const point: TrackPoint = {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  }

  if (a.ele !== undefined && b.ele !== undefined) {
    point.ele = a.ele + (b.ele - a.ele) * t
  }

  if (a.time && b.time) {
    point.time = new Date(a.time.getTime() + (b.time.getTime() - a.time.getTime()) * t)
  }

  return point
}
