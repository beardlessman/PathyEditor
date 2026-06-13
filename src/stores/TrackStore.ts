import { makeAutoObservable } from 'mobx'
import type { ChartPoint, ElevationStats, TrackPoint } from '../types/track'
import {
  buildChartData,
  computeDurationSeconds,
  computeElevationStats,
  computeTotalDistanceKm,
} from '../utils/geo'
import { buildExportFileName } from '../utils/gpx'

export class TrackStore {
  points: TrackPoint[] = []
  fileName: string | null = null
  hoveredIndex: number | null = null
  selectedIndex: number | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get hasTrack(): boolean {
    return this.points.length > 0
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
    this.points = points
    this.fileName = fileName
    this.hoveredIndex = null
    this.selectedIndex = null
  }

  clearTrack(): void {
    this.points = []
    this.fileName = null
    this.hoveredIndex = null
    this.selectedIndex = null
  }

  setHoveredIndex(index: number | null): void {
    this.hoveredIndex = index
  }

  setSelectedIndex(index: number | null): void {
    this.selectedIndex = index
  }
}
