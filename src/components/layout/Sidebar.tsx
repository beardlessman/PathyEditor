import { observer } from 'mobx-react-lite'
import { FileImport } from '../import/FileImport'
import { TrackList } from '../tracks/TrackList'
import { MetricsPanel } from '../metrics/MetricsPanel'
import { FilterPanel } from '../filters/FilterPanel'
import { SegmentMergePanel } from '../merge/SegmentMergePanel'
import { ElevationChart } from '../chart/ElevationChart'
import { useStore } from '../../stores/StoreContext'

export const Sidebar = observer(function Sidebar() {
  const { uiStore } = useStore()

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden ${
          uiStore.sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => uiStore.closeSidebar()}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(100%,22rem)] flex-col border-r border-slate-800 bg-slate-950 shadow-xl transition-transform duration-300 md:static md:z-0 md:w-96 md:translate-x-0 md:shadow-none ${
          uiStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-white">PathyEditor</h1>
            <p className="text-xs text-slate-400">GPX Viewer & Analyzer</p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Закрыть панель"
            onClick={() => uiStore.closeSidebar()}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <FileImport />
          <TrackList />
          <SegmentMergePanel />
          <FilterPanel />
          <MetricsPanel />
          <ElevationChart />
        </div>
      </aside>
    </>
  )
})
