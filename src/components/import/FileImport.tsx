import { useCallback, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from '../../stores/StoreContext'

export const FileImport = observer(function FileImport() {
  const { trackStore, uiStore } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setIsImporting(true)
      try {
        const beforeCount = trackStore.tracks.length
        await trackStore.importFiles(files)

        const imported = trackStore.tracks.length - beforeCount
        const ready = trackStore.readyTracks.length
        const errors = trackStore.tracks.filter((track) => track.status === 'error').length

        if (imported > 0) {
          uiStore.showToast(
            `Загружено файлов: ${imported}${errors > 0 ? `, ошибок: ${errors}` : ''}`,
            errors > 0 ? 'info' : 'success',
          )
        }

        if (ready > 0 && window.innerWidth < 768) {
          uiStore.closeSidebar()
        }
      } finally {
        setIsImporting(false)
        if (inputRef.current) {
          inputRef.current.value = ''
        }
      }
    },
    [trackStore, uiStore],
  )

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
          void handleFiles(event.dataTransfer.files)
        }}
      >
        <p className="text-sm text-slate-300">Перетащите .gpx файлы сюда</p>
        <p className="mt-1 text-xs text-slate-500">или выберите через проводник (несколько файлов)</p>

        <button
          type="button"
          disabled={isImporting}
          className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => inputRef.current?.click()}
        >
          {isImporting ? 'Загрузка…' : 'Выбрать файлы'}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".gpx,application/gpx+xml"
          multiple
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>
    </section>
  )
})
