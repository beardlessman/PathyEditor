import { makeAutoObservable, runInAction } from 'mobx'
import type { ChartPoint, ElevationStats, TrackPoint } from '../types/track'
import {
  cloneFilterSettings,
  createDefaultFilterSettings,
  type FilterSettings,
} from '../types/filters'
import {
  buildChartData,
  computeDurationSeconds,
  computeElevationStats,
  computeTotalDistanceKm,
} from '../utils/geo'
import { buildExportFileName } from '../utils/gpx'
import { applyFilterPipeline } from '../utils/filters/pipeline'
import { cloneTrackPoints } from '../utils/filters/helpers'

const FILTER_DEBOUNCE_MS = 175

export class TrackStore {
  rawPoints: TrackPoint[] = []
  filterSettings: FilterSettings = createDefaultFilterSettings()
  debouncedFilterSettings: FilterSettings = createDefaultFilterSettings()
  fileName: string | null = null
  hoveredIndex: number | null = null
  selectedIndex: number | null = null

  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get points(): TrackPoint[] {
    if (this.rawPoints.length === 0) return []
    return applyFilterPipeline(this.rawPoints, this.debouncedFilterSettings)
  }

  get hasTrack(): boolean {
    return this.rawPoints.length > 0
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

  get rawDistanceKm(): number {
    return computeTotalDistanceKm(this.rawPoints)
  }

  get polylineCoords(): [number, number][] {
    return this.points.map((point) => [point.lat, point.lon])
  }

  get startPoint(): TrackPoint | null {
    return this.points[0] ?? null
  }

  get finishPoint(): TrackPoint | null {
    return this.points[this.points.length - 1] ?? null
  }

  get totalDistanceKm(): number {
    return computeTotalDistanceKm(this.points)
  }

  get totalDurationSeconds(): number | null {
    return computeDurationSeconds(this.points)
  }

  get elevationStats(): ElevationStats | null {
    return computeElevationStats(this.points)
  }

  get chartData(): ChartPoint[] {
    return buildChartData(this.points)
  }

  get exportFileName(): string {
    return buildExportFileName(this.points)
  }

  get hoveredPoint(): TrackPoint | null {
    if (this.hoveredIndex === null) return null
    return this.points[this.hoveredIndex] ?? null
  }

  loadTrack(points: TrackPoint[], fileName: string): void {
    this.rawPoints = cloneTrackPoints(points)
    this.fileName = fileName
    this.hoveredIndex = null
    this.selectedIndex = null
    this.flushDebouncedFilterUpdate()
  }

  clearTrack(): void {
    this.rawPoints = []
    this.fileName = null
    this.hoveredIndex = null
    this.selectedIndex = null
    this.filterSettings = createDefaultFilterSettings()
    this.flushDebouncedFilterUpdate()
  }

  setMovingAverageEnabled(enabled: boolean): void {
    this.filterSettings.movingAverage.enabled = enabled
    this.flushDebouncedFilterUpdate()
  }

  setMovingAverageWindowSize(windowSize: number): void {
    this.filterSettings.movingAverage.windowSize = windowSize
    this.scheduleDebouncedFilterUpdate()
  }

  setRdpEnabled(enabled: boolean): void {
    this.filterSettings.rdp.enabled = enabled
    this.flushDebouncedFilterUpdate()
  }

  setRdpTolerance(tolerance: number): void {
    this.filterSettings.rdp.tolerance = tolerance
    this.scheduleDebouncedFilterUpdate()
  }

  setChaikinEnabled(enabled: boolean): void {
    this.filterSettings.chaikin.enabled = enabled
    this.flushDebouncedFilterUpdate()
  }

  setChaikinIterations(iterations: number): void {
    this.filterSettings.chaikin.iterations = iterations
    this.scheduleDebouncedFilterUpdate()
  }

  setHoveredIndex(index: number | null): void {
    this.hoveredIndex = index
  }

  setSelectedIndex(index: number | null): void {
    this.selectedIndex = index
  }

  private scheduleDebouncedFilterUpdate(): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer)
    }

    this.filterDebounceTimer = setTimeout(() => {
      runInAction(() => {
        this.debouncedFilterSettings = cloneFilterSettings(this.filterSettings)
      })
      this.filterDebounceTimer = null
    }, FILTER_DEBOUNCE_MS)
  }

  private flushDebouncedFilterUpdate(): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer)
      this.filterDebounceTimer = null
    }

    this.debouncedFilterSettings = cloneFilterSettings(this.filterSettings)
  }
}
