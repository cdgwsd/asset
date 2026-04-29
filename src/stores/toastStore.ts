import { defineStore } from 'pinia'
import { createId } from '../utils/id'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

let dismissTimer: number | undefined

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as ToastMessage[]
  }),
  actions: {
    show(message: string, type: ToastType = 'success') {
      const current = this.items[0]
      const id = current?.id ?? createId('toast')
      this.items = [{ id, message, type }]

      if (dismissTimer) {
        window.clearTimeout(dismissTimer)
      }

      dismissTimer = window.setTimeout(() => {
        this.remove(id)
      }, 1800)
    },
    remove(id: string) {
      this.items = this.items.filter((item) => item.id !== id)
    }
  }
})
