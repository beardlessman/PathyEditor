export interface TrackPoint {
  lat: number
  lon: number
  ele?: number
  time?: Date
}

export interface ElevationStats {
  min: number
  max: number
  gain: number
  loss: number
}

export interface ChartPoint {
  index: number
  distanceKm: number
  elevation: number
}
