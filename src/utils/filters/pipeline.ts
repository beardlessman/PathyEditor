import type { FilterSettings } from '../../types/filters'
import type { TrackPoint } from '../../types/track'
import { applyChaikin } from './chaikin'
import { cloneTrackPoints } from './helpers'
import { applyMovingAverage } from './movingAverage'
import { applyRdp } from './rdp'
import { applyStopFilter, hasTrackTimeData } from './stopFilter'

export function applyFilterPipeline(
  rawPoints: TrackPoint[],
  settings: FilterSettings,
): TrackPoint[] {
  if (rawPoints.length === 0) return []

  let result = cloneTrackPoints(rawPoints)

  if (settings.stopFilter.enabled && hasTrackTimeData(rawPoints)) {
    result = applyStopFilter(
      result,
      settings.stopFilter.radius,
      settings.stopFilter.durationSeconds,
    )
  }

  if (settings.movingAverage.enabled) {
    result = applyMovingAverage(result, settings.movingAverage.windowSize)
  }

  if (settings.rdp.enabled) {
    result = applyRdp(result, settings.rdp.tolerance)
  }

  if (settings.chaikin.enabled) {
    result = applyChaikin(result, settings.chaikin.iterations)
  }

  return result
}

export { hasTrackTimeData }
