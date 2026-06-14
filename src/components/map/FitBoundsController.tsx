import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { observer } from 'mobx-react-lite'
import { useStore } from '../../stores/StoreContext'

export const FitBoundsController = observer(function FitBoundsController() {
  const map = useMap()
  const { trackStore } = useStore()

  useEffect(() => {
    const coords = trackStore.combinedBoundsCoords
    if (coords.length === 0) return

    const bounds = L.latLngBounds(coords)
    map.fitBounds(bounds, { padding: [48, 48] })
  }, [map, trackStore.tracks.length, trackStore.visibleTracks.length])

  return null
})
