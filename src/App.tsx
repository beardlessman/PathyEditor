import { observer } from 'mobx-react-lite'
import { Sidebar } from './components/layout/Sidebar'
import { TrackMap } from './components/map/TrackMap'
import { ToastContainer } from './components/ui/ToastContainer'
import { useStore } from './stores/StoreContext'

function App() {
  return <AppContent />
}

const AppContent = observer(function AppContent() {
  const { uiStore } = useStore()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />

      <main className="relative min-w-0 flex-1">
        <button
          type="button"
          className="absolute left-3 top-3 z-[500] rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 shadow-lg backdrop-blur md:hidden"
          aria-label="Открыть панель"
          onClick={() => uiStore.openSidebar()}
        >
          ☰ Меню
        </button>

        <TrackMap />
      </main>

      <ToastContainer />
    </div>
  )
})

export default App
