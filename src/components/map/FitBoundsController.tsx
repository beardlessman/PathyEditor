import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { observer } from 'mobx-react-lite'
import { useStore } from '../../stores/StoreContext'

export const FitBoundsController = observer(function FitBoundsController() {
  const map = useMap()
  const { trackStore } = useStore()

  useEffect(() => {
    if (!trackStore.hasTrack) return

    const bounds = L.latLngBounds(trackStore.polylineCoords)
    map.fitBounds(bounds, { padding: [48, 48] })
  }, [map, trackStore.fileName])

  return null
})
