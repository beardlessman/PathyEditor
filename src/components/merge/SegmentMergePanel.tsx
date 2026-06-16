import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import type { MapboxProfile } from '../../types/segmentMerge'
import { useStore } from '../../stores/StoreContext'

function formatProgressPercent(current: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((current / total) * 100)
}

export const SegmentMergePanel = observer(function SegmentMergePanel() {
  const { trackStore } = useStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const {
    segmentMergeSettings,
    isSegmentMerging,
    hasSegmentMergePreview,
    canApplySegmentMerge,
    lastMergedPairCount,
    lastMergedGroupCount,
    segmentMergeProgress,
    segmentMergePreview,
    segmentMergeExcludedTrackCount,
  } = trackStore
  const { enabled, minGapMinutes, maxGapMinutes, profile } = segmentMergeSettings

  if (!trackStore.hasTrack) {
    return null
  }

  const handleToggle = (nextEnabled: boolean) => {
    void trackStore.setSegmentMergeEnabled(nextEnabled)
  }

  const progressPercent = segmentMergeProgress
    ? formatProgressPercent(segmentMergeProgress.current, segmentMergeProgress.total)
    : 0

  return (
    <section className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Объединение сегментов
        </h2>
        <span
          className={`text-xs text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={enabled}
              disabled={isSegmentMerging}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500 disabled:cursor-not-allowed"
              onChange={(event) => void handleToggle(event.target.checked)}
            />
            <span>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                Авто-заполнение разрывов
                {isSegmentMerging && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
                )}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Группирует и объединяет фрагменты треков после потери GPS
              </span>
            </span>
          </label>

          <div className={`mt-3 space-y-3 ${enabled ? '' : 'opacity-50'}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Мин. время разрыва</span>
                <span className="font-medium text-slate-200">{minGapMinutes} мин</span>
              </div>
              <input
                type="range"
                min={1}
                max={maxGapMinutes}
                step={1}
                value={minGapMinutes}
                disabled={!enabled || isSegmentMerging}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-sky-500 disabled:cursor-not-allowed"
                onChange={(event) =>
                  trackStore.setSegmentMergeMinGapMinutes(Number(event.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Макс. время разрыва</span>
                <span className="font-medium text-slate-200">{maxGapMinutes} мин</span>
              </div>
              <input
                type="range"
                min={minGapMinutes}
                max={15}
                step={1}
                value={maxGapMinutes}
                disabled={!enabled || isSegmentMerging}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-sky-500 disabled:cursor-not-allowed"
                onChange={(event) =>
                  trackStore.setSegmentMergeMaxGapMinutes(Number(event.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-400">Профиль маршрута</div>
              <select
                value={profile}
                disabled={!enabled || isSegmentMerging}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                onChange={(event) =>
                  trackStore.setSegmentMergeProfile(event.target.value as MapboxProfile)
                }
              >
                <option value="walking">Пешком</option>
                <option value="cycling">Велосипед</option>
                <option value="driving">Автомобиль</option>
              </select>
            </div>
          </div>

          {enabled && segmentMergeProgress && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{segmentMergeProgress.message}</span>
                {segmentMergeProgress.total > 0 && (
                  <span className="font-medium text-slate-200">{progressPercent}%</span>
                )}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {enabled && hasSegmentMergePreview && segmentMergePreview && (
            <div className="mt-3 space-y-2 rounded-lg border border-sky-900/40 bg-sky-950/20 p-3">
              <p className="text-xs text-slate-300">
                Найдено групп для объединения:{' '}
                <span className="font-semibold text-sky-300">{segmentMergePreview.length}</span>
              </p>
              <ul className="space-y-1 text-xs text-slate-400">
                {segmentMergePreview.map((group) => (
                  <li key={group.id} className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    Группа {group.id + 1}: {group.trackIds.length} треков
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!canApplySegmentMerge}
                className="mt-2 w-full rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white enabled:hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void trackStore.applySegmentMergeAction()}
              >
                {isSegmentMerging ? 'Объединение…' : 'Применить объединение'}
              </button>
            </div>
          )}

          {enabled &&
            !hasSegmentMergePreview &&
            !isSegmentMerging &&
            trackStore.segmentMergeStatus === 'preview' && (
              <p className="mt-3 text-xs text-slate-500">
                Подходящие группы для объединения не найдены.
              </p>
            )}

          {lastMergedGroupCount > 0 && !isSegmentMerging && trackStore.segmentMergeApplied && (
            <p className="mt-3 text-xs text-slate-400">
              Объединено групп:{' '}
              <span className="font-medium text-sky-300">{lastMergedGroupCount}</span>
              {' · '}
              пар сегментов:{' '}
              <span className="font-medium text-sky-300">{lastMergedPairCount}</span>
            </p>
          )}

          {trackStore.segmentMergeErrorMessage && (
            <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              {trackStore.segmentMergeErrorMessage}
            </p>
          )}

          {enabled && segmentMergeExcludedTrackCount > 0 && (
            <p className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
              ⚠️ {segmentMergeExcludedTrackCount}{' '}
              {segmentMergeExcludedTrackCount === 1 ? 'трек исключён' : 'треков исключено'} из
              анализа: отсутствуют метки времени
            </p>
          )}

          {!trackStore.canUseSegmentMerge && (
            <p className="mt-3 text-xs text-slate-500">
              Загрузите минимум 2 трека с временными метками для объединения.
            </p>
          )}
        </div>
      )}
    </section>
  )
})
