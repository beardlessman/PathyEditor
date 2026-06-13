import { TrackStore } from './TrackStore'
import { UiStore } from './UiStore'

export class RootStore {
  trackStore: TrackStore
  uiStore: UiStore

  constructor() {
    this.trackStore = new TrackStore()
    this.uiStore = new UiStore()
  }
}

export const rootStore = new RootStore()
