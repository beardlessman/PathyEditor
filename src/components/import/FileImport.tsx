import { useCallback, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { GpxParseError, parseGpx, validateGpxExtension } from '../../utils/gpx'
import { useStore } from '../../stores/StoreContext'

export const FileImport = observer(function FileImport() {
  const { trackStore, uiStore } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processFile = useCallback(
    async (file: File) => {
      try {
        validateGpxExtension(file.name)
        const text = await file.text()
        const points = parseGpx(text)

        if (points.length < 2) {
          throw new GpxParseError('Трек должен содержать минимум 2 точки')
        }

        trackStore.loadTrack(points, file.name)
        uiStore.showToast(`Загружено ${points.length} точек`, 'success')

        if (window.innerWidth < 768) {
          uiStore.closeSidebar()
        }
      } catch (error) {
        const message =
          error instanceof GpxParseError
            ? error.message
            : 'Не удалось загрузить GPX-файл'
        uiStore.showToast(message, 'error')
      }
    },
    [trackStore, uiStore],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file) void processFile(file)
    },
    [processFile],
  )

  const handleClearTrack = useCallback(() => {
    trackStore.clearTrack()
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [trackStore])

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Импорт GPX
      </h2>

      <div
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? 'border-sky-400 bg-sky-950/40'
            : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
        }`}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
      >
        <p className="text-sm text-slate-300">Перетащите .gpx файл сюда</p>
        <p className="mt-1 text-xs text-slate-500">или выберите через проводник</p>

        <button
          type="button"
          className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
          onClick={() => inputRef.current?.click()}
        >
          Выбрать файл
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".gpx,application/gpx+xml"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {trackStore.fileName && (
        <div className="group flex min-w-0 items-center gap-1 text-xs text-slate-400">
          <span className="shrink-0">Текущий файл:</span>
          <span className="truncate text-slate-200">{trackStore.fileName}</span>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-slate-800 hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
            aria-label="Удалить трек"
            title="Удалить трек"
            onClick={handleClearTrack}
          >
            ❌
          </button>
        </div>
      )}
    </section>
  )
})
