import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { useStore } from '../../stores/StoreContext'

function formatChangePercent(percent: number | null): string {
  if (percent === null) return '—'
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(0)}%`
}

export const TrackList = observer(function TrackList() {
  const { trackStore, uiStore } = useStore()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSelectAll = () => trackStore.selectAllTracks()
  const handleClearAll = () => {
    trackStore.clearAllTracks()
    uiStore.showToast('Список треков очищен', 'info')
  }

  const handleBulkExport = async () => {
    const result = await trackStore.exportSelected()
    if (!result.ok) {
      uiStore.showToast(result.message ?? 'Ошибка экспорта', 'error')
      return
    }

    const count = trackStore.selectedTracks.length
    const message =
      count <= 3
        ? `Скачивание ${count} файлов…`
        : `Архив processed_tracks.zip (${count} файлов) скачан`
    uiStore.showToast(message, 'success')
  }

  if (trackStore.tracks.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Треки ({trackStore.tracks.length})
        </h2>
        <span
          className={`text-xs text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {isExpanded && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
              onClick={handleSelectAll}
            >
              Выбрать все
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
              onClick={handleClearAll}
            >
              Очистить список
            </button>
            <button
              type="button"
              disabled={
                trackStore.selectedTracks.length === 0 || trackStore.isSegmentMerging
              }
              className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs text-white enabled:hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleBulkExport()}
            >
              {trackStore.isSegmentMerging ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-300/40 border-t-white" />
                  Объединение…
                </span>
              ) : (
                <>
                  Экспортировать выбранные
                  {trackStore.selectedTracks.length > 3 ? ' (ZIP)' : ''}
                </>
              )}
            </button>
          </div>

          <ul className="space-y-2">
            {trackStore.tracks.map((track) => (
              <TrackListItem key={track.id} trackId={track.id} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
})

const TrackListItem = observer(function TrackListItem({ trackId }: { trackId: string }) {
  const { trackStore, uiStore } = useStore()
  const track = trackStore.tracks.find((item) => item.id === trackId)

  if (!track) return null

  const isActive = trackStore.activeTrackId === track.id

  return (
    <li
      className={`rounded-xl border p-3 transition ${
        isActive
          ? 'border-sky-600 bg-sky-950/30'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={track.isSelected}
          disabled={track.status !== 'ready'}
          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500"
          onChange={() => trackStore.toggleTrackSelected(track.id)}
        />

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => trackStore.setActiveTrack(track.id)}
        >
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-100">
              {track.originalFileName}
            </span>
            {track.status === 'ready' &&
              !track.hasTimeData &&
              trackStore.globalFilterSettings.stopFilter.enabled && (
                <span
                  className="shrink-0 cursor-help text-amber-400"
                  title="Фильтр остановок недоступен: отсутствуют метки времени"
                >
                  ⚠️
                </span>
              )}
          </div>

          {track.status === 'parsing' && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
              Парсинг…
            </div>
          )}

          {track.status === 'error' && (
            <p className="mt-1 text-xs text-red-400">{track.errorMessage}</p>
          )}

          {track.status === 'ready' && (
            <p className="mt-1 text-xs text-slate-400">
              {track.rawPointCount} ➡️ {track.filteredPointCount}{' '}
              <span className="text-slate-500">
                ({formatChangePercent(track.pointCountChangePercent)})
              </span>
            </p>
          )}
        </button>
      </div>

      {track.status === 'ready' && (
        <div className="mt-2 flex gap-2 pl-6">
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800"
            onClick={() => {
              const result = trackStore.exportSingleTrack(track.id)
              if (result.ok) {
                uiStore.showToast(`Скачан ${track.originalFileName}`, 'success')
              } else {
                uiStore.showToast(result.message ?? 'Ошибка', 'error')
              }
            }}
          >
            Скачать
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-0.5 text-xs text-red-300 hover:bg-slate-800"
            onClick={() => trackStore.removeTrack(track.id)}
          >
            Удалить
          </button>
        </div>
      )}

      {track.status === 'error' && (
        <div className="mt-2 pl-6">
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-0.5 text-xs text-red-300 hover:bg-slate-800"
            onClick={() => trackStore.removeTrack(track.id)}
          >
            Удалить
          </button>
        </div>
      )}
    </li>
  )
})
