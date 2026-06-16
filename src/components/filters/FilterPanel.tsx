import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { formatStopDuration } from '../../types/filters'
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

interface StopFilterBlockProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  radius: number
  durationSeconds: number
  onRadiusChange: (value: number) => void
  onDurationChange: (value: number) => void
}

function StopFilterBlock({
  enabled,
  onToggle,
  radius,
  durationSeconds,
  onRadiusChange,
  onDurationChange,
}: StopFilterBlockProps) {
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
          <span className="block text-sm font-medium text-slate-100">
            Фильтр остановок
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Удаляет GPS-дрейф при длительных остановках
          </span>
        </span>
      </label>

      <div className={`mt-3 space-y-3 ${enabled ? '' : 'opacity-50'}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Радиус</span>
            <span className="font-medium text-slate-200">{radius} метров</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={radius}
            disabled={!enabled}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-sky-500 disabled:cursor-not-allowed"
            onChange={(event) => onRadiusChange(Number(event.target.value))}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Время</span>
            <span className="font-medium text-slate-200">
              {formatStopDuration(durationSeconds)}
            </span>
          </div>
          <input
            type="range"
            min={60}
            max={900}
            step={60}
            value={durationSeconds}
            disabled={!enabled}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-sky-500 disabled:cursor-not-allowed"
            onChange={(event) => onDurationChange(Number(event.target.value))}
          />
        </div>
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
  const [isExpanded, setIsExpanded] = useState(true)
  const { stopFilter, movingAverage, rdp, chaikin } = trackStore.globalFilterSettings
  const changePercent = trackStore.pointCountChangePercent
  const tracksWithoutTime = trackStore.readyTracks.filter((track) => !track.hasTimeData).length

  if (!trackStore.hasTrack) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        Загрузите GPX-файл, чтобы настроить фильтры обработки.
      </section>
    )
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
          Фильтры
        </h2>
        <span
          className={`text-xs text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          <StopFilterBlock
            enabled={stopFilter.enabled}
            onToggle={(enabled) => trackStore.setStopFilterEnabled(enabled)}
            radius={stopFilter.radius}
            durationSeconds={stopFilter.durationSeconds}
            onRadiusChange={(value) => trackStore.setStopFilterRadius(value)}
            onDurationChange={(value) => trackStore.setStopFilterDuration(value)}
          />

          {stopFilter.enabled && tracksWithoutTime > 0 && (
            <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
              ⚠️ У {tracksWithoutTime}{' '}
              {tracksWithoutTime === 1 ? 'трека' : 'треков'} фильтр остановок недоступен: отсутствуют
              метки времени
            </p>
          )}

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
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs leading-relaxed text-slate-300">
        <p>
          Треков:{' '}
          <span className="font-semibold text-slate-100">{trackStore.readyTracks.length}</span>
          {' · '}
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
