import type { FilterId, FilterSettings } from '../../types/filters'
import type { TrackPoint } from '../../types/track'
import { applyChaikin } from './chaikin'
import { cloneTrackPoints } from './helpers'
import { applyMovingAverage } from './movingAverage'
import { applyRdp } from './rdp'
import { applyStopFilter, hasTrackTimeData } from './stopFilter'

function applyFilterStep(
  filterId: FilterId,
  points: TrackPoint[],
  rawPoints: TrackPoint[],
  settings: FilterSettings,
): TrackPoint[] {
  switch (filterId) {
    case 'movingAverage':
      if (!settings.movingAverage.enabled) return points
      return applyMovingAverage(points, settings.movingAverage.windowSize)

    case 'rdp':
      if (!settings.rdp.enabled) return points
      return applyRdp(points, settings.rdp.tolerance)

    case 'chaikin':
      if (!settings.chaikin.enabled) return points
      return applyChaikin(points, settings.chaikin.iterations)

    case 'stopFilter':
      if (!settings.stopFilter.enabled || !hasTrackTimeData(rawPoints)) return points
      return applyStopFilter(
        points,
        settings.stopFilter.radius,
        settings.stopFilter.durationSeconds,
      )

    default:
      return points
  }
}

export function applyFilterPipeline(
  rawPoints: TrackPoint[],
  settings: FilterSettings,
): TrackPoint[] {
  if (rawPoints.length === 0) return []

  let result = cloneTrackPoints(rawPoints)

  for (const filterId of settings.order) {
    result = applyFilterStep(filterId, result, rawPoints, settings)
  }

  return result
}

export { hasTrackTimeData }
