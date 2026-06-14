import { observer } from 'mobx-react-lite'
import { useStore } from '../../stores/StoreContext'

interface FilterBlockProps {
  title: string
  description: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
  sliderLabel: string
  sliderValue: string
  sliderMin: number
  sliderMax: number
  sliderStep: number
  currentValue: number
  onSliderChange: (value: number) => void
}

function FilterBlock({
  title,
  description,
  enabled,
  onToggle,
  sliderLabel,
  sliderValue,
  sliderMin,
  sliderMax,
  sliderStep,
  currentValue,
  onSliderChange,
}: FilterBlockProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-slate-100">{title}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        </span>
      </label>

      <div className={`mt-3 space-y-2 ${enabled ? '' : 'opacity-50'}`}>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{sliderLabel}</span>
          <span className="font-medium text-slate-200">{sliderValue}</span>
        </div>
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          value={currentValue}
          disabled={!enabled}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-sky-500 disabled:cursor-not-allowed"
          onChange={(event) => onSliderChange(Number(event.target.value))}
        />
      </div>
    </div>
  )
}

function formatChangePercent(percent: number | null): string {
  if (percent === null) return '—'
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}

export const FilterPanel = observer(function FilterPanel() {
  const { trackStore } = useStore()
  const { movingAverage, rdp, chaikin } = trackStore.filterSettings
  const changePercent = trackStore.pointCountChangePercent

  if (!trackStore.hasTrack) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        Загрузите GPX-файл, чтобы настроить фильтры обработки.
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Фильтры
      </h2>

      <FilterBlock
        title="Шумоподавление"
        description="Скользящее среднее для сглаживания микро-колебаний"
        enabled={movingAverage.enabled}
        onToggle={(enabled) => trackStore.setMovingAverageEnabled(enabled)}
        sliderLabel="Размер окна"
        sliderValue={`${movingAverage.windowSize} точек`}
        sliderMin={3}
        sliderMax={99}
        sliderStep={2}
        currentValue={movingAverage.windowSize}
        onSliderChange={(value) => trackStore.setMovingAverageWindowSize(value)}
      />

      <FilterBlock
        title="Оптимизация (RDP)"
        description="Удаление избыточных точек на прямых участках"
        enabled={rdp.enabled}
        onToggle={(enabled) => trackStore.setRdpEnabled(enabled)}
        sliderLabel="Порог чувствительности"
        sliderValue={`${rdp.tolerance.toFixed(1)} м`}
        sliderMin={0.1}
        sliderMax={10}
        sliderStep={0.1}
        currentValue={rdp.tolerance}
        onSliderChange={(value) => trackStore.setRdpTolerance(value)}
      />

      <FilterBlock
        title="Сглаживание (Чайкин)"
        description="Скругление острых углов на поворотах"
        enabled={chaikin.enabled}
        onToggle={(enabled) => trackStore.setChaikinEnabled(enabled)}
        sliderLabel="Степень сглаживания"
        sliderValue={`${chaikin.iterations} ит.`}
        sliderMin={1}
        sliderMax={3}
        sliderStep={1}
        currentValue={chaikin.iterations}
        onSliderChange={(value) => trackStore.setChaikinIterations(value)}
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs leading-relaxed text-slate-300">
        <p>
          Точек в оригинале:{' '}
          <span className="font-semibold text-slate-100">{trackStore.rawPointCount}</span>
          {' ➡️ '}
          После фильтров:{' '}
          <span className="font-semibold text-sky-300">{trackStore.filteredPointCount}</span>{' '}
          <span className="text-slate-400">
            (Изменение: {formatChangePercent(changePercent)})
          </span>
        </p>
        <p className="mt-2 text-slate-400">
          Длина трека:{' '}
          <span className="font-semibold text-slate-100">
            {trackStore.totalDistanceKm.toFixed(2)} км
          </span>
          {Math.abs(trackStore.totalDistanceKm - trackStore.rawDistanceKm) > 0.001 && (
            <span className="text-slate-500">
              {' '}
              (оригинал: {trackStore.rawDistanceKm.toFixed(2)} км)
            </span>
          )}
        </p>
      </div>
    </section>
  )
})
