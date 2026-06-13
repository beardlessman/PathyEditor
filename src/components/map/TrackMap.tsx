import { useMemo } from 'react'
import { MapContainer, Polyline, TileLayer, useMapEvents } from 'react-leaflet'
import { observer } from 'mobx-react-lite'
import { findNearestPointIndex, haversineDistance } from '../../utils/geo'
import { useStore } from '../../stores/StoreContext'
import { FitBoundsController } from './FitBoundsController'
import { TrackMarkers } from './TrackMarkers'

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423]

function TrackInteractionLayer() {
  const { trackStore } = useStore()

  useMapEvents({
    mousemove(event) {
      if (!trackStore.hasTrack) return
      const index = findNearestPointIndex(
        trackStore.points,
        event.latlng.lat,
        event.latlng.lng,
      )
      const point = trackStore.points[index]
      const distanceToTrack = haversineDistance(
        point.lat,
        point.lon,
        event.latlng.lat,
        event.latlng.lng,
      )

      trackStore.setHoveredIndex(distanceToTrack <= 80 ? index : null)
    },
    mouseout() {
      trackStore.setHoveredIndex(null)
    },
    click(event) {
      if (!trackStore.hasTrack) return
      const index = findNearestPointIndex(
        trackStore.points,
        event.latlng.lat,
        event.latlng.lng,
      )
      trackStore.setSelectedIndex(index)
    },
  })

  return null
}

export const TrackMap = observer(function TrackMap() {
  const { trackStore } = useStore()

  const positions = useMemo(
    () => trackStore.polylineCoords,
    [trackStore.points],
  )

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={10}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBoundsController />

      {trackStore.hasTrack && (
        <>
          <Polyline
            positions={positions}
            pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.9 }}
          />
          <TrackMarkers />
          <TrackInteractionLayer />
        </>
      )}
    </MapContainer>
  )
})
