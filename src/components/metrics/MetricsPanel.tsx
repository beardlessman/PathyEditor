import { observer } from 'mobx-react-lite'
import { formatDuration } from '../../utils/geo'
import { useStore } from '../../stores/StoreContext'

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  )
}

export const MetricsPanel = observer(function MetricsPanel() {
  const { trackStore } = useStore()
  const stats = trackStore.elevationStats

  if (!trackStore.hasTrack) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        Загрузите GPX-файл, чтобы увидеть метрики маршрута.
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Метрики
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Длина"
          value={`${trackStore.totalDistanceKm.toFixed(2)} км`}
        />
        <MetricCard
          label="Время"
          value={formatDuration(trackStore.totalDurationSeconds)}
        />
        <MetricCard
          label="Точки"
          value={String(trackStore.points.length)}
        />
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Мин. высота" value={`${stats.min.toFixed(0)} м`} />
          <MetricCard label="Макс. высота" value={`${stats.max.toFixed(0)} м`} />
          <MetricCard label="Набор" value={`${stats.gain.toFixed(0)} м`} />
          <MetricCard label="Сброс" value={`${stats.loss.toFixed(0)} м`} />
        </div>
      ) : (
        <p className="text-xs text-slate-500">Данные о высоте в файле отсутствуют.</p>
      )}
    </section>
  )
})
