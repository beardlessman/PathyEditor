import type { TrackPoint } from '../../types/track'
import { cloneTrackPoints } from './helpers'

export function applyMovingAverage(points: TrackPoint[], windowSize: number): TrackPoint[] {
  if (points.length < 3 || windowSize < 3) {
    return cloneTrackPoints(points)
  }

  const halfWindow = Math.floor(windowSize / 2)
  const result: TrackPoint[] = []

  for (let index = 0; index < points.length; index += 1) {
    const start = Math.max(0, index - halfWindow)
    const end = Math.min(points.length - 1, index + halfWindow)
    let latSum = 0
    let lonSum = 0
    let count = 0

    for (let neighborIndex = start; neighborIndex <= end; neighborIndex += 1) {
      latSum += points[neighborIndex].lat
      lonSum += points[neighborIndex].lon
      count += 1
    }

    const source = points[index]
    result.push({
      lat: latSum / count,
      lon: lonSum / count,
      ele: source.ele,
      time: source.time ? new Date(source.time) : undefined,
    })
  }

  return result
}
