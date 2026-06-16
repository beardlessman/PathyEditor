import { makeAutoObservable, runInAction } from 'mobx'
import type { ChartPoint, ElevationStats, TrackPoint } from '../types/track'
import {
  cloneFilterSettings,
  createDefaultFilterSettings,
  type FilterId,
  type FilterSettings,
} from '../types/filters'
import {
  createDefaultSegmentMergeSettings,
  type MapboxProfile,
  type SegmentMergePreviewGroup,
  type SegmentMergeProgress,
  type SegmentMergeSettings,
  type SegmentMergeStatus,
} from '../types/segmentMerge'
import type { TrackStatus } from '../types/trackItem'
import { TRACK_COLOR } from '../types/trackItem'
import { TrackItem } from './TrackItem'
import { GpxParseError, parseGpx, validateGpxExtension } from '../utils/gpx'
import { exportSelectedTracks } from '../utils/export'
import { cloneTrackPoints } from '../utils/filters/helpers'
import {
  analyzeSegmentMerge,
  applySegmentMerge,
  type MergeableSegment,
} from '../utils/segmentMerge'

const FILTER_DEBOUNCE_MS = 175

interface TrackSnapshot {
  id: string
  originalFileName: string
  rawPoints: TrackPoint[]
  color: string
  isSelected: boolean
  status: TrackStatus
  errorMessage: string | null
}

export class TrackStore {
  tracks: TrackItem[] = []
  globalFilterSettings: FilterSettings = createDefaultFilterSettings()
  debouncedGlobalFilterSettings: FilterSettings = createDefaultFilterSettings()
  activeTrackId: string | null = null
  hoveredTrackId: string | null = null
  hoveredIndex: number | null = null
  selectedTrackId: string | null = null
  selectedIndex: number | null = null
  segmentMergeSettings: SegmentMergeSettings = createDefaultSegmentMergeSettings()
  segmentMergeStatus: SegmentMergeStatus = 'idle'
  segmentMergeErrorMessage: string | null = null
  segmentMergeProgress: SegmentMergeProgress | null = null
  segmentMergePreview: SegmentMergePreviewGroup[] | null = null
  segmentMergeExcludedTrackCount = 0
  lastMergedPairCount = 0
  lastMergedGroupCount = 0
  segmentMergeApplied = false

  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private mergeSnapshot: TrackSnapshot[] | null = null
  private segmentMergeClusteredGroups: MergeableSegment[][] | null = null
  private segmentMergeRequestId = 0

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

  get isSegmentMerging(): boolean {
    return this.segmentMergeStatus === 'loading'
  }

  get hasSegmentMergePreview(): boolean {
    return this.segmentMergeStatus === 'preview' && (this.segmentMergePreview?.length ?? 0) > 0
  }

  get canApplySegmentMerge(): boolean {
    return this.hasSegmentMergePreview && !this.isSegmentMerging
  }

  get canUseSegmentMerge(): boolean {
    return this.readyTracks.filter((track) => track.hasTimeData).length >= 2
  }

  get tracksWithoutTimeCount(): number {
    return this.readyTracks.filter((track) => !track.hasTimeData).length
  }

  getMergePreviewColor(trackId: string): string | null {
    if (!this.segmentMergePreview) return null

    for (const group of this.segmentMergePreview) {
      if (group.trackIds.includes(trackId)) {
        return group.color
      }
    }

    return null
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

    if (this.segmentMergeSettings.enabled) {
      this.mergeSnapshot = null
      this.saveMergeSnapshot()
      void this.analyzeSegmentMerge()
    }
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
    this.segmentMergeSettings = createDefaultSegmentMergeSettings()
    this.mergeSnapshot = null
    this.segmentMergeClusteredGroups = null
    this.segmentMergeStatus = 'idle'
    this.segmentMergeErrorMessage = null
    this.segmentMergeProgress = null
    this.segmentMergePreview = null
    this.segmentMergeExcludedTrackCount = 0
    this.lastMergedPairCount = 0
    this.lastMergedGroupCount = 0
    this.segmentMergeApplied = false
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

  async setSegmentMergeEnabled(enabled: boolean): Promise<void> {
    this.segmentMergeSettings.enabled = enabled

    if (enabled) {
      this.saveMergeSnapshot()
      await this.analyzeSegmentMerge()
      return
    }

    this.clearSegmentMergeState()
    this.restoreMergeSnapshot()
  }

  async applySegmentMergeAction(): Promise<void> {
    if (!this.canApplySegmentMerge || !this.mergeSnapshot || !this.segmentMergeClusteredGroups) {
      return
    }

    await this.runSegmentMergeApply()
  }

  setSegmentMergeMinGapMinutes(minGapMinutes: number): void {
    const { segmentMergeSettings } = this
    segmentMergeSettings.minGapMinutes = Math.min(minGapMinutes, segmentMergeSettings.maxGapMinutes)
    if (segmentMergeSettings.enabled) {
      void this.reanalyzeSegmentMerge()
    }
  }

  setSegmentMergeMaxGapMinutes(maxGapMinutes: number): void {
    const { segmentMergeSettings } = this
    segmentMergeSettings.maxGapMinutes = Math.max(maxGapMinutes, segmentMergeSettings.minGapMinutes)
    if (segmentMergeSettings.enabled) {
      void this.reanalyzeSegmentMerge()
    }
  }

  setSegmentMergeProfile(profile: MapboxProfile): void {
    this.segmentMergeSettings.profile = profile
    if (this.segmentMergeSettings.enabled) {
      void this.reanalyzeSegmentMerge()
    }
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

  private saveMergeSnapshot(): void {
    if (this.mergeSnapshot !== null) return

    this.mergeSnapshot = this.tracks.map((track) => ({
      id: track.id,
      originalFileName: track.originalFileName,
      rawPoints: cloneTrackPoints(track.rawPoints),
      color: track.color,
      isSelected: track.isSelected,
      status: track.status,
      errorMessage: track.errorMessage,
    }))
  }

  private restoreMergeSnapshot(): void {
    if (!this.mergeSnapshot) return

    const activeId = this.activeTrackId
    this.tracks = this.mergeSnapshot.map((snapshot) => {
      const track = new TrackItem(
        snapshot.id,
        snapshot.originalFileName,
        snapshot.color,
        () => this.debouncedGlobalFilterSettings,
      )
      track.isSelected = snapshot.isSelected
      if (snapshot.status === 'ready') {
        track.setReady(snapshot.rawPoints)
      } else if (snapshot.status === 'error') {
        track.setError(snapshot.errorMessage ?? 'Ошибка трека')
      }
      return track
    })

    this.mergeSnapshot = null
    this.activeTrackId = this.tracks.some((track) => track.id === activeId)
      ? activeId
      : (this.readyTracks[0]?.id ?? null)
  }

  private applyMergedTracks(
    mergedTracks: Array<{
      fileName: string
      color: string
      isSelected: boolean
      rawPoints: TrackPoint[]
    }>,
  ): void {
    const previousActiveId = this.activeTrackId
    this.tracks = mergedTracks.map((segment) => {
      const track = this.createTrackItem(segment.fileName)
      track.color = segment.color
      track.isSelected = segment.isSelected
      track.setReady(segment.rawPoints)
      return track
    })

    if (previousActiveId && this.tracks.some((track) => track.id === previousActiveId)) {
      this.activeTrackId = previousActiveId
    } else {
      this.activeTrackId = this.readyTracks[0]?.id ?? null
    }

    this.hoveredTrackId = null
    this.hoveredIndex = null
    this.selectedTrackId = null
    this.selectedIndex = null
  }

  private clearSegmentMergeState(): void {
    this.segmentMergeStatus = 'idle'
    this.segmentMergeErrorMessage = null
    this.segmentMergeProgress = null
    this.segmentMergePreview = null
    this.segmentMergeClusteredGroups = null
    this.segmentMergeExcludedTrackCount = 0
    this.lastMergedPairCount = 0
    this.lastMergedGroupCount = 0
    this.segmentMergeApplied = false
  }

  private buildSnapshotSegments(): MergeableSegment[] {
    if (!this.mergeSnapshot) return []

    return this.mergeSnapshot.map((snapshot) => ({
      snapshotId: snapshot.id,
      fileName: snapshot.originalFileName,
      color: snapshot.color,
      isSelected: snapshot.isSelected,
      rawPoints: cloneTrackPoints(snapshot.rawPoints),
    }))
  }

  private getMergeOptions() {
    return {
      minGapMinutes: this.segmentMergeSettings.minGapMinutes,
      maxGapMinutes: this.segmentMergeSettings.maxGapMinutes,
      profile: this.segmentMergeSettings.profile,
    }
  }

  private async reanalyzeSegmentMerge(): Promise<void> {
    if (this.segmentMergeApplied) {
      this.restoreMergeSnapshot()
      this.mergeSnapshot = null
      this.segmentMergeApplied = false
      this.saveMergeSnapshot()
    }

    await this.analyzeSegmentMerge()
  }

  private async analyzeSegmentMerge(): Promise<void> {
    if (!this.segmentMergeSettings.enabled) return

    if (!this.canUseSegmentMerge) {
      runInAction(() => {
        this.segmentMergeSettings.enabled = false
        this.mergeSnapshot = null
        this.clearSegmentMergeState()
        this.segmentMergeStatus = 'error'
        this.segmentMergeErrorMessage =
          'Для объединения нужно минимум 2 трека с метками времени на всех точках'
      })
      return
    }

    if (!this.mergeSnapshot) {
      this.saveMergeSnapshot()
    }

    const requestId = this.segmentMergeRequestId + 1
    this.segmentMergeRequestId = requestId

    runInAction(() => {
      this.segmentMergeStatus = 'loading'
      this.segmentMergeProgress = {
        phase: 'clustering',
        message: 'Поиск групп…',
        current: 0,
        total: 1,
      }
      this.segmentMergeErrorMessage = null
      this.segmentMergePreview = null
      this.segmentMergeClusteredGroups = null
    })

    await Promise.resolve()

    if (requestId !== this.segmentMergeRequestId) return

    const sourceTracks = this.buildSnapshotSegments()
    const analysis = analyzeSegmentMerge(sourceTracks, this.getMergeOptions())

    runInAction(() => {
      this.segmentMergePreview = analysis.previewGroups
      this.segmentMergeClusteredGroups = analysis.clusteredGroups
      this.segmentMergeExcludedTrackCount = analysis.excludedTrackCount
      this.segmentMergeProgress = {
        phase: 'clustering',
        message:
          analysis.previewGroups.length > 0
            ? `Найдено групп: ${analysis.previewGroups.length}`
            : 'Подходящие группы не найдены',
        current: 1,
        total: 1,
      }
      this.segmentMergeStatus = 'preview'
    })
  }

  private async runSegmentMergeApply(): Promise<void> {
    if (!this.mergeSnapshot || !this.segmentMergeClusteredGroups) return

    const requestId = this.segmentMergeRequestId + 1
    this.segmentMergeRequestId = requestId
    const groups = this.segmentMergeClusteredGroups
    const sourceTracks = this.buildSnapshotSegments()

    runInAction(() => {
      this.segmentMergeStatus = 'loading'
      this.segmentMergeProgress = {
        phase: 'routing',
        message: `Восстановление геометрии: 0 из ${groups.length}`,
        current: 0,
        total: groups.length,
      }
      this.segmentMergeErrorMessage = null
    })

    try {
      const result = await applySegmentMerge(
        sourceTracks,
        groups,
        this.getMergeOptions(),
        (current, total) => {
          if (requestId !== this.segmentMergeRequestId) return

          runInAction(() => {
            this.segmentMergeProgress = {
              phase: 'routing',
              message: `Восстановление геометрии: ${current} из ${total}`,
              current,
              total,
            }
          })
        },
      )

      if (requestId !== this.segmentMergeRequestId) return

      runInAction(() => {
        this.applyMergedTracks(
          result.tracks.map((segment) => ({
            fileName: segment.fileName,
            color: segment.color,
            isSelected: segment.isSelected,
            rawPoints: segment.rawPoints,
          })),
        )
        this.lastMergedPairCount = result.mergedPairCount
        this.lastMergedGroupCount = result.mergedGroupCount
        this.segmentMergeApplied = true
        this.segmentMergeStatus = 'idle'
        this.segmentMergeProgress = null
        this.segmentMergePreview = null
        this.segmentMergeClusteredGroups = null
        this.segmentMergeErrorMessage = null
      })
    } catch (error) {
      if (requestId !== this.segmentMergeRequestId) return

      runInAction(() => {
        this.segmentMergeStatus = 'error'
        this.segmentMergeErrorMessage =
          error instanceof Error ? error.message : 'Не удалось объединить сегменты'
        this.segmentMergeProgress = null
        this.segmentMergeSettings.enabled = false
        this.clearSegmentMergeState()
        this.restoreMergeSnapshot()
        this.mergeSnapshot = null
      })
    }
  }
}
