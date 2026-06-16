import { makeAutoObservable, runInAction } from 'mobx'
import type { ChartPoint, ElevationStats, TrackPoint } from '../types/track'
import {
  cloneFilterSettings,
  createDefaultFilterSettings,
  type FilterId,
  type FilterSettings,
} from '../types/filters'
import { TRACK_COLOR } from '../types/trackItem'
import { TrackItem } from './TrackItem'
import { GpxParseError, parseGpx, validateGpxExtension } from '../utils/gpx'
import { exportSelectedTracks } from '../utils/export'

const FILTER_DEBOUNCE_MS = 175

export class TrackStore {
  tracks: TrackItem[] = []
  globalFilterSettings: FilterSettings = createDefaultFilterSettings()
  debouncedGlobalFilterSettings: FilterSettings = createDefaultFilterSettings()
  activeTrackId: string | null = null
  hoveredTrackId: string | null = null
  hoveredIndex: number | null = null
  selectedTrackId: string | null = null
  selectedIndex: number | null = null

  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get hasTrack(): boolean {
    return this.readyTracks.length > 0
  }

  get readyTracks(): TrackItem[] {
    return this.tracks.filter((track) => track.status === 'ready')
  }

  get selectedTracks(): TrackItem[] {
    return this.readyTracks.filter((track) => track.isSelected)
  }

  get visibleTracks(): TrackItem[] {
    return this.selectedTracks
  }

  get activeTrack(): TrackItem | null {
    if (this.activeTrackId) {
      const track = this.tracks.find((item) => item.id === this.activeTrackId)
      if (track?.status === 'ready') return track
    }

    return this.selectedTracks[0] ?? this.readyTracks[0] ?? null
  }

  get points(): TrackPoint[] {
    return this.activeTrack?.points ?? []
  }

  get rawPointCount(): number {
    return this.readyTracks.reduce((sum, track) => sum + track.rawPointCount, 0)
  }

  get filteredPointCount(): number {
    return this.readyTracks.reduce((sum, track) => sum + track.filteredPointCount, 0)
  }

  get pointCountChangePercent(): number | null {
    if (this.rawPointCount === 0) return null
    const delta = this.filteredPointCount - this.rawPointCount
    return (delta / this.rawPointCount) * 100
  }

  get rawDistanceKm(): number {
    return this.readyTracks.reduce((sum, track) => sum + track.rawDistanceKm, 0)
  }

  get totalDistanceKm(): number {
    return this.readyTracks.reduce((sum, track) => sum + track.totalDistanceKm, 0)
  }

  get totalDurationSeconds(): number | null {
    return this.activeTrack?.totalDurationSeconds ?? null
  }

  get elevationStats(): ElevationStats | null {
    return this.activeTrack?.elevationStats ?? null
  }

  get chartData(): ChartPoint[] {
    return this.activeTrack?.chartData ?? []
  }

  get hoveredPoint(): TrackPoint | null {
    if (this.hoveredTrackId === null || this.hoveredIndex === null) return null
    const track = this.tracks.find((item) => item.id === this.hoveredTrackId)
    return track?.points[this.hoveredIndex] ?? null
  }

  get allVisiblePolylineCoords(): [number, number][][] {
    return this.visibleTracks.map((track) => track.polylineCoords)
  }

  get combinedBoundsCoords(): [number, number][] {
    return this.visibleTracks.flatMap((track) => track.polylineCoords)
  }

  async importFiles(files: FileList | File[]): Promise<void> {
    const fileArray = Array.from(files).filter((file) =>
      file.name.toLowerCase().endsWith('.gpx'),
    )

    if (fileArray.length === 0) return

    const pendingTracks = fileArray.map((file) => {
      const track = this.createTrackItem(file.name)
      this.tracks.push(track)
      return { track, file }
    })

    await Promise.all(
      pendingTracks.map(async ({ track, file }) => {
        try {
          validateGpxExtension(file.name)
          const text = await file.text()
          const points = parseGpx(text)

          if (points.length < 2) {
            throw new GpxParseError('Трек должен содержать минимум 2 точки')
          }

          runInAction(() => {
            track.setReady(points)
            if (!this.activeTrackId) {
              this.activeTrackId = track.id
            }
          })
        } catch (error) {
          const message =
            error instanceof GpxParseError
              ? error.message
              : 'Не удалось загрузить GPX-файл'

          runInAction(() => {
            track.setError(message)
          })
        }
      }),
    )
  }

  removeTrack(id: string): void {
    this.tracks = this.tracks.filter((track) => track.id !== id)

    if (this.activeTrackId === id) {
      this.activeTrackId = this.readyTracks[0]?.id ?? null
    }

    if (this.hoveredTrackId === id) {
      this.hoveredTrackId = null
      this.hoveredIndex = null
    }

    if (this.selectedTrackId === id) {
      this.selectedTrackId = null
      this.selectedIndex = null
    }
  }

  clearAllTracks(): void {
    this.tracks = []
    this.activeTrackId = null
    this.hoveredTrackId = null
    this.hoveredIndex = null
    this.selectedTrackId = null
    this.selectedIndex = null
    this.globalFilterSettings = createDefaultFilterSettings()
    this.flushDebouncedFilterUpdate()
  }

  setActiveTrack(id: string): void {
    const track = this.tracks.find((item) => item.id === id)
    if (track?.status === 'ready') {
      this.activeTrackId = id
    }
  }

  toggleTrackSelected(id: string): void {
    this.tracks.find((track) => track.id === id)?.toggleSelected()
  }

  selectAllTracks(): void {
    for (const track of this.readyTracks) {
      track.setSelected(true)
    }
  }

  deselectAllTracks(): void {
    for (const track of this.readyTracks) {
      track.setSelected(false)
    }
  }

  async exportSelected(): Promise<{ ok: boolean; message?: string }> {
    const selected = this.selectedTracks
    if (selected.length === 0) {
      return { ok: false, message: 'Нет выбранных треков для экспорта' }
    }

    await exportSelectedTracks(
      selected.map((track) => ({
        points: track.points,
        originalFileName: track.originalFileName,
      })),
    )

    return { ok: true }
  }

  exportSingleTrack(id: string): { ok: boolean; message?: string } {
    const track = this.tracks.find((item) => item.id === id)
    if (!track || track.status !== 'ready') {
      return { ok: false, message: 'Трек недоступен для экспорта' }
    }

    void exportSelectedTracks([
      { points: track.points, originalFileName: track.originalFileName },
    ])

    return { ok: true }
  }

  setKalmanEnabled(enabled: boolean): void {
    this.globalFilterSettings.kalman.enabled = enabled
    this.flushDebouncedFilterUpdate()
  }

  setKalmanMeasurementNoise(measurementNoise: number): void {
    this.globalFilterSettings.kalman.measurementNoise = measurementNoise
    this.scheduleDebouncedFilterUpdate()
  }

  setKalmanProcessNoise(processNoise: number): void {
    this.globalFilterSettings.kalman.processNoise = processNoise
    this.scheduleDebouncedFilterUpdate()
  }

  setMovingAverageEnabled(enabled: boolean): void {
    this.globalFilterSettings.movingAverage.enabled = enabled
    this.flushDebouncedFilterUpdate()
  }

  setMovingAverageWindowSize(windowSize: number): void {
    this.globalFilterSettings.movingAverage.windowSize = windowSize
    this.scheduleDebouncedFilterUpdate()
  }

  setRdpEnabled(enabled: boolean): void {
    this.globalFilterSettings.rdp.enabled = enabled
    this.flushDebouncedFilterUpdate()
  }

  setRdpTolerance(tolerance: number): void {
    this.globalFilterSettings.rdp.tolerance = tolerance
    this.scheduleDebouncedFilterUpdate()
  }

  setChaikinEnabled(enabled: boolean): void {
    this.globalFilterSettings.chaikin.enabled = enabled
    this.flushDebouncedFilterUpdate()
  }

  setChaikinIterations(iterations: number): void {
    this.globalFilterSettings.chaikin.iterations = iterations
    this.scheduleDebouncedFilterUpdate()
  }

  setStopFilterEnabled(enabled: boolean): void {
    this.globalFilterSettings.stopFilter.enabled = enabled
    this.flushDebouncedFilterUpdate()
  }

  setStopFilterRadius(radius: number): void {
    this.globalFilterSettings.stopFilter.radius = radius
    this.scheduleDebouncedFilterUpdate()
  }

  setStopFilterDuration(durationSeconds: number): void {
    this.globalFilterSettings.stopFilter.durationSeconds = durationSeconds
    this.scheduleDebouncedFilterUpdate()
  }

  moveFilter(filterId: FilterId, toIndex: number): void {
    const order = [...this.globalFilterSettings.order]
    const fromIndex = order.indexOf(filterId)
    if (fromIndex === -1 || fromIndex === toIndex) return

    order.splice(fromIndex, 1)
    order.splice(toIndex, 0, filterId)
    this.globalFilterSettings.order = order
    this.flushDebouncedFilterUpdate()
  }

  setHoveredTrack(trackId: string | null, index: number | null): void {
    this.hoveredTrackId = trackId
    this.hoveredIndex = index
  }

  setSelectedTrack(trackId: string | null, index: number | null): void {
    this.selectedTrackId = trackId
    this.selectedIndex = index
  }

  setHoveredIndex(index: number | null): void {
    this.hoveredIndex = index
    this.hoveredTrackId = this.activeTrack?.id ?? null
  }

  setSelectedIndex(index: number | null): void {
    this.selectedIndex = index
    this.selectedTrackId = this.activeTrack?.id ?? null
  }

  private createTrackItem(originalFileName: string): TrackItem {
    return new TrackItem(
      crypto.randomUUID(),
      originalFileName,
      TRACK_COLOR,
      () => this.debouncedGlobalFilterSettings,
    )
  }

  private scheduleDebouncedFilterUpdate(): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer)
    }

    this.filterDebounceTimer = setTimeout(() => {
      runInAction(() => {
        this.debouncedGlobalFilterSettings = cloneFilterSettings(this.globalFilterSettings)
      })
      this.filterDebounceTimer = null
    }, FILTER_DEBOUNCE_MS)
  }

  private flushDebouncedFilterUpdate(): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer)
      this.filterDebounceTimer = null
    }

    this.debouncedGlobalFilterSettings = cloneFilterSettings(this.globalFilterSettings)
  }
}
