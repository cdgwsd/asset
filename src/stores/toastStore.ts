import { defineStore } from 'pinia'
import { createId } from '../utils/id'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as ToastMessage[]
  }),
  actions: {
    show(message: string, type: ToastType = 'success') {
      const id = createId('toast')
      this.items.push({ id, message, type })

      window.setTimeout(() => {
        this.remove(id)
      }, 2400)
    },
    remove(id: string) {
      this.items = this.items.filter((item) => item.id !== id)
    }
  }
})
