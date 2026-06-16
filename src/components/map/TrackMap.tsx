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
      const visibleTracks = trackStore.visibleTracks
      if (visibleTracks.length === 0) return

      let nearestTrackId: string | null = null
      let nearestIndex: number | null = null
      let nearestDistance = Number.POSITIVE_INFINITY

      for (const track of visibleTracks) {
        const index = findNearestPointIndex(
          track.points,
          event.latlng.lat,
          event.latlng.lng,
        )
        const point = track.points[index]
        if (!point) continue

        const distanceToTrack = haversineDistance(
          point.lat,
          point.lon,
          event.latlng.lat,
          event.latlng.lng,
        )

        if (distanceToTrack < nearestDistance) {
          nearestDistance = distanceToTrack
          nearestTrackId = track.id
          nearestIndex = index
        }
      }

      if (nearestDistance <= 80 && nearestTrackId !== null) {
        trackStore.setHoveredTrack(nearestTrackId, nearestIndex)
      } else {
        trackStore.setHoveredTrack(null, null)
      }
    },
    mouseout() {
      trackStore.setHoveredTrack(null, null)
    },
    click(event) {
      const visibleTracks = trackStore.visibleTracks
      if (visibleTracks.length === 0) return

      let nearestTrackId: string | null = null
      let nearestIndex: number | null = null
      let nearestDistance = Number.POSITIVE_INFINITY

      for (const track of visibleTracks) {
        const index = findNearestPointIndex(
          track.points,
          event.latlng.lat,
          event.latlng.lng,
        )
        const point = track.points[index]
        if (!point) continue

        const distanceToTrack = haversineDistance(
          point.lat,
          point.lon,
          event.latlng.lat,
          event.latlng.lng,
        )

        if (distanceToTrack < nearestDistance) {
          nearestDistance = distanceToTrack
          nearestTrackId = track.id
          nearestIndex = index
        }
      }

      if (nearestTrackId !== null && nearestDistance <= 80) {
        trackStore.setActiveTrack(nearestTrackId)
        trackStore.setSelectedTrack(nearestTrackId, nearestIndex)
      }
    },
  })

  return null
}

export const TrackMap = observer(function TrackMap() {
  const { trackStore } = useStore()

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

      {trackStore.visibleTracks.map((track) => {
        const previewColor = trackStore.getMergePreviewColor(track.id)
        const isInPreviewGroup = previewColor !== null

        return (
          <Polyline
            key={track.id}
            positions={track.polylineCoords}
            pathOptions={{
              color: previewColor ?? track.color,
              weight: isInPreviewGroup ? 5 : 4,
              opacity: isInPreviewGroup ? 1 : 0.9,
            }}
          />
        )
      })}

      {trackStore.segmentMergePreview?.flatMap((group) =>
        group.connections.map((connection, index) => (
          <Polyline
            key={`merge-preview-${group.id}-${index}`}
            positions={[connection.from, connection.to]}
            pathOptions={{
              color: group.color,
              weight: 3,
              opacity: 0.85,
              dashArray: '8 8',
            }}
          />
        )),
      )}

      {trackStore.hasTrack && (
        <>
          <TrackMarkers />
          <TrackInteractionLayer />
        </>
      )}
    </MapContainer>
  )
})
