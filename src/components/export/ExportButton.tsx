import { observer } from 'mobx-react-lite'
import { downloadGpx } from '../../utils/gpx'
import { useStore } from '../../stores/StoreContext'

export const ExportButton = observer(function ExportButton() {
  const { trackStore, uiStore } = useStore()

  const handleExport = () => {
    if (!trackStore.hasTrack) {
      uiStore.showToast('Нет загруженного трека для экспорта', 'error')
      return
    }

    downloadGpx(trackStore.points, trackStore.exportFileName)
    uiStore.showToast('GPX-файл успешно скачан', 'success')
  }

  return (
    <button
      type="button"
      disabled={!trackStore.hasTrack}
      className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      onClick={handleExport}
    >
      Экспорт GPX
    </button>
  )
})
