import { observer } from 'mobx-react-lite'
import { useStore } from '../../stores/StoreContext'

const toastStyles: Record<string, string> = {
  success: 'border-emerald-500 bg-emerald-950 text-emerald-100',
  error: 'border-red-500 bg-red-950 text-red-100',
  info: 'border-sky-500 bg-sky-950 text-sky-100',
}

export const ToastContainer = observer(function ToastContainer() {
  const { uiStore } = useStore()

  if (uiStore.toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[2000] flex w-full max-w-sm flex-col gap-2">
      {uiStore.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${toastStyles[toast.type]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
})
