import type { TrackPoint } from '../../types/track'
import { cloneTrackPoints } from './helpers'

const METERS_PER_DEGREE_LAT = 111_320
const DEFAULT_DELTA_SECONDS = 1

interface KalmanAxisState {
  position: number
  velocity: number
  errorVariance: number
}

function metersPerDegreeLon(latitude: number): number {
  return METERS_PER_DEGREE_LAT * Math.cos((latitude * Math.PI) / 180)
}

function toLocalMeters(
  lat: number,
  lon: number,
  refLat: number,
  refLon: number,
): { x: number; y: number } {
  return {
    x: (lon - refLon) * metersPerDegreeLon(refLat),
    y: (lat - refLat) * METERS_PER_DEGREE_LAT,
  }
}

function fromLocalMeters(
  x: number,
  y: number,
  refLat: number,
  refLon: number,
): { lat: number; lon: number } {
  return {
    lat: refLat + y / METERS_PER_DEGREE_LAT,
    lon: refLon + x / metersPerDegreeLon(refLat),
  }
}

function getDeltaTimeSeconds(previous: TrackPoint, current: TrackPoint): number {
  if (previous.time && current.time) {
    const delta = (current.time.getTime() - previous.time.getTime()) / 1000
    if (delta > 0) return delta
  }
  return DEFAULT_DELTA_SECONDS
}

function kalmanStep(
  state: KalmanAxisState,
  measurement: number,
  deltaSeconds: number,
  measurementVariance: number,
  processNoise: number,
): KalmanAxisState {
  const previousPosition = state.position

  const predictedPosition = state.position + state.velocity * deltaSeconds
  const predictedVariance = state.errorVariance + processNoise * deltaSeconds

  const innovation = measurement - predictedPosition
  const kalmanGain = predictedVariance / (predictedVariance + measurementVariance)
  const correctedPosition = predictedPosition + kalmanGain * innovation
  const correctedVariance = (1 - kalmanGain) * predictedVariance
  const correctedVelocity =
    deltaSeconds > 0 ? (correctedPosition - previousPosition) / deltaSeconds : state.velocity

  return {
    position: correctedPosition,
    velocity: correctedVelocity,
    errorVariance: correctedVariance,
  }
}

function filterAxis(
  measurements: number[],
  deltaSeconds: number[],
  measurementVariance: number,
  processNoise: number,
): number[] {
  if (measurements.length === 0) return []

  const filtered = new Array<number>(measurements.length)
  let state: KalmanAxisState = {
    position: measurements[0],
    velocity: 0,
    errorVariance: measurementVariance,
  }

  filtered[0] = measurements[0]

  for (let index = 1; index < measurements.length; index += 1) {
    state = kalmanStep(
      state,
      measurements[index],
      deltaSeconds[index - 1],
      measurementVariance,
      processNoise,
    )
    filtered[index] = state.position
  }

  return filtered
}

export function applyKalmanFilter(
  points: TrackPoint[],
  measurementNoise: number,
  processNoise: number,
): TrackPoint[] {
  if (points.length < 2) {
    return cloneTrackPoints(points)
  }

  const refLat = points[0].lat
  const refLon = points[0].lon
  const measurementVariance = measurementNoise * measurementNoise

  const localPoints = points.map((point) => toLocalMeters(point.lat, point.lon, refLat, refLon))
  const deltaSeconds = points.slice(1).map((point, index) => getDeltaTimeSeconds(points[index], point))

  const filteredX = filterAxis(
    localPoints.map((point) => point.x),
    deltaSeconds,
    measurementVariance,
    processNoise,
  )
  const filteredY = filterAxis(
    localPoints.map((point) => point.y),
    deltaSeconds,
    measurementVariance,
    processNoise,
  )

  return points.map((point, index) => {
    const { lat, lon } = fromLocalMeters(filteredX[index], filteredY[index], refLat, refLon)

    return {
      lat,
      lon,
      ele: point.ele,
      time: point.time ? new Date(point.time) : undefined,
    }
  })
}
