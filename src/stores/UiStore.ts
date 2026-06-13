import { makeAutoObservable } from 'mobx'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  type: ToastType
  message: string
}

let toastId = 0

export class UiStore {
  sidebarOpen = false
  toasts: ToastMessage[] = []

  constructor() {
    makeAutoObservable(this)
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen
  }

  openSidebar(): void {
    this.sidebarOpen = true
  }

  closeSidebar(): void {
    this.sidebarOpen = false
  }

  showToast(message: string, type: ToastType = 'info'): void {
    const id = ++toastId
    this.toasts.push({ id, type, message })

    window.setTimeout(() => {
      this.dismissToast(id)
    }, 4500)
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((toast) => toast.id !== id)
  }
}
