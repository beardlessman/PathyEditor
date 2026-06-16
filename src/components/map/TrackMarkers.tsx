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
  const hovered = trackStore.hoveredPoint
  const hoveredTrackId = trackStore.hoveredTrackId

  const selectedTrack =
    trackStore.selectedTrackId !== null
      ? trackStore.tracks.find((track) => track.id === trackStore.selectedTrackId)
      : null
  const selectedPoint =
    selectedTrack && trackStore.selectedIndex !== null
      ? selectedTrack.points[trackStore.selectedIndex]
      : null

  return (
    <>
      {hovered && hoveredTrackId && (
        <Marker position={[hovered.lat, hovered.lon]} icon={hoverIcon}>
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
            <span className="whitespace-pre-line">{pointLabel(hovered)}</span>
          </Tooltip>
        </Marker>
      )}

      {selectedPoint && (
        <CircleMarker
          center={[selectedPoint.lat, selectedPoint.lon]}
          radius={7}
          pathOptions={{ color: '#ffffff', fillColor: '#a855f7', fillOpacity: 1, weight: 2 }}
        >
          <Popup>
            <div className="text-sm whitespace-pre-line">{pointLabel(selectedPoint)}</div>
          </Popup>
        </CircleMarker>
      )}
    </>
  )
})
