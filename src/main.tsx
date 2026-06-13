import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configure } from 'mobx'
import App from './App.tsx'
import { StoreContext } from './stores/StoreContext.tsx'
import { rootStore } from './stores/RootStore.ts'
import './index.css'

configure({
  enforceActions: 'never',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreContext.Provider value={rootStore}>
      <App />
    </StoreContext.Provider>
  </StrictMode>,
)
