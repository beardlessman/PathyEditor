import { makeAutoObservable } from 'mobx'
import type { FilterSettings } from '../types/filters'
import type { TrackPoint } from '../types/track'
import type { TrackStatus } from '../types/trackItem'
import {
  buildChartData,
  computeDurationSeconds,
  computeElevationStats,
  computeTotalDistanceKm,
} from '../utils/geo'
import { applyFilterPipeline } from '../utils/filters/pipeline'
import { cloneTrackPoints } from '../utils/filters/helpers'

export class TrackItem {
  id: string
  originalFileName: string
  rawPoints: TrackPoint[] = []
  filterSettingsOverride: FilterSettings | null = null
  status: TrackStatus = 'parsing'
  errorMessage: string | null = null
  isSelected = true
  color: string

  private readonly getDebouncedFilterSettings: () => FilterSettings

  constructor(
    id: string,
    originalFileName: string,
    color: string,
    getDebouncedFilterSettings: () => FilterSettings,
  ) {
    this.id = id
    this.originalFileName = originalFileName
    this.color = color
    this.getDebouncedFilterSettings = getDebouncedFilterSettings
    makeAutoObservable(this)
  }

  get points(): TrackPoint[] {
    if (this.status !== 'ready' || this.rawPoints.length === 0) return []

    const settings = this.filterSettingsOverride ?? this.getDebouncedFilterSettings()
    return applyFilterPipeline(this.rawPoints, settings)
  }

  get rawPointCount(): number {
    return this.rawPoints.length
  }

  get filteredPointCount(): number {
    return this.points.length
  }

  get pointCountChangePercent(): number | null {
    if (this.rawPointCount === 0) return null
    const delta = this.filteredPointCount - this.rawPointCount
    return (delta / this.rawPointCount) * 100
  }

  get polylineCoords(): [number, number][] {
    return this.points.map((point) => [point.lat, point.lon])
  }

  get totalDistanceKm(): number {
    return computeTotalDistanceKm(this.points)
  }

  get rawDistanceKm(): number {
    return computeTotalDistanceKm(this.rawPoints)
  }

  get totalDurationSeconds(): number | null {
    return computeDurationSeconds(this.points)
  }

  get elevationStats() {
    return computeElevationStats(this.points)
  }

  get chartData() {
    return buildChartData(this.points)
  }

  setReady(points: TrackPoint[]): void {
    this.rawPoints = cloneTrackPoints(points)
    this.status = 'ready'
    this.errorMessage = null
  }

  setError(message: string): void {
    this.status = 'error'
    this.errorMessage = message
    this.rawPoints = []
  }

  setSelected(selected: boolean): void {
    this.isSelected = selected
  }

  toggleSelected(): void {
    this.isSelected = !this.isSelected
  }
}
