import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { observer } from 'mobx-react-lite'
import { useStore } from '../../stores/StoreContext'

export const ElevationChart = observer(function ElevationChart() {
  const { trackStore } = useStore()
  const data = trackStore.chartData

  if (!trackStore.hasTrack || data.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        {trackStore.hasTrack
          ? 'Профиль высот недоступен — в активном треке нет данных <ele>.'
          : 'Загрузите GPX-файл для просмотра профиля высот.'}
      </section>
    )
  }

  const activeTrack = trackStore.activeTrack

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Профиль высот
        </h2>
        {activeTrack && (
          <span className="truncate text-xs text-slate-500" title={activeTrack.originalFileName}>
            {activeTrack.originalFileName}
          </span>
        )}
      </div>

      <div className="h-48 rounded-xl border border-slate-800 bg-slate-900/70 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            onMouseMove={(state) => {
              const chartIndex = state.activeIndex
              if (typeof chartIndex === 'number') {
                const activeTrack = trackStore.activeTrack
                if (activeTrack) {
                  trackStore.setHoveredTrack(
                    activeTrack.id,
                    data[chartIndex]?.index ?? null,
                  )
                }
                return
              }
              trackStore.setHoveredTrack(null, null)
            }}
            onMouseLeave={() => trackStore.setHoveredTrack(null, null)}
          >
            <XAxis
              dataKey="distanceKm"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(value: number) => `${value.toFixed(1)}`}
              stroke="#334155"
            />
            <YAxis
              dataKey="elevation"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(value: number) => `${value}`}
              stroke="#334155"
              width={42}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload
                if (!point) return ''
                return `${point.distanceKm.toFixed(2)} км`
              }}
              formatter={(value) => [`${Number(value).toFixed(0)} м`, 'Высота']}
            />
            <Line
              type="monotone"
              dataKey="elevation"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
})
