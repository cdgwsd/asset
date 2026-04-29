import { defineStore } from 'pinia'
import { getHomeSummary } from '../services/summaryService'
import type { HomeSummary } from '../types/summary'

export const useHomeStore = defineStore('home', {
  state: () => ({
    summary: null as HomeSummary | null,
    loading: false,
    error: ''
  }),
  actions: {
    async loadHomeSummary(showDeleted = false) {
      this.loading = true
      this.error = ''

      try {
        this.summary = await getHomeSummary({ showDeleted })
      } catch (error) {
        this.error = error instanceof Error ? error.message : '首页数据加载失败'
        throw error
      } finally {
        this.loading = false
      }
    },
    async refresh(showDeleted = false) {
      await this.loadHomeSummary(showDeleted)
    }
  }
})
