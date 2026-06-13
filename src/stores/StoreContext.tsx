import { createContext, useContext } from 'react'
import { rootStore, type RootStore } from './RootStore'

export const StoreContext = createContext<RootStore>(rootStore)

export function useStore(): RootStore {
  return useContext(StoreContext)
}
