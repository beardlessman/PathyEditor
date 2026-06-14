import type { TrackPoint } from '../../types/track'
import { cloneTrackPoints, lerpTrackPoint } from './helpers'

export function applyChaikin(points: TrackPoint[], iterations: number): TrackPoint[] {
  if (points.length < 2 || iterations < 1) {
    return cloneTrackPoints(points)
  }

  let current = cloneTrackPoints(points)

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    if (current.length < 2) break

    const next: TrackPoint[] = [current[0]]

    for (let index = 0; index < current.length - 1; index += 1) {
      next.push(lerpTrackPoint(current[index], current[index + 1], 0.25))
      next.push(lerpTrackPoint(current[index], current[index + 1], 0.75))
    }

    next.push(current[current.length - 1])
    current = next
  }

  return current
}
