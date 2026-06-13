import L from 'leaflet'
import { CircleMarker, Marker, Popup, Tooltip } from 'react-leaflet'
import { observer } from 'mobx-react-lite'
import { formatLocalDateTime } from '../../utils/geo'
import { useStore } from '../../stores/StoreContext'
import type { TrackPoint } from '../../types/track'

const hoverIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#fbbf24;border:2px solid #fff;box-shadow:0 0 8px rgba(251,191,36,0.8);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function pointLabel(point: TrackPoint): string {
  const time = formatLocalDateTime(point.time)
  const elevation = point.ele !== undefined ? `${point.ele.toFixed(0)} м` : '—'
  return `Время: ${time}\nВысота: ${elevation}`
}

export const TrackMarkers = observer(function TrackMarkers() {
  const { trackStore } = useStore()
  const start = trackStore.startPoint
  const finish = trackStore.finishPoint
  const hovered = trackStore.hoveredPoint
  const selected =
    trackStore.selectedIndex !== null
      ? trackStore.points[trackStore.selectedIndex]
      : null

  return (
    <>
      {start && (
        <CircleMarker
          center={[start.lat, start.lon]}
          radius={8}
          pathOptions={{ color: '#ffffff', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
            Старт
          </Tooltip>
          <Popup>
            <div className="text-sm whitespace-pre-line">{pointLabel(start)}</div>
          </Popup>
        </CircleMarker>
      )}

      {finish && finish !== start && (
        <CircleMarker
          center={[finish.lat, finish.lon]}
          radius={8}
          pathOptions={{ color: '#ffffff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
            Финиш
          </Tooltip>
          <Popup>
            <div className="text-sm whitespace-pre-line">{pointLabel(finish)}</div>
          </Popup>
        </CircleMarker>
      )}

      {hovered && (
        <Marker position={[hovered.lat, hovered.lon]} icon={hoverIcon}>
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
            <span className="whitespace-pre-line">{pointLabel(hovered)}</span>
          </Tooltip>
        </Marker>
      )}

      {selected && (
        <CircleMarker
          center={[selected.lat, selected.lon]}
          radius={7}
          pathOptions={{ color: '#ffffff', fillColor: '#a855f7', fillOpacity: 1, weight: 2 }}
        >
          <Popup>
            <div className="text-sm whitespace-pre-line">{pointLabel(selected)}</div>
          </Popup>
        </CircleMarker>
      )}
    </>
  )
})
