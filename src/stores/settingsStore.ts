import { defineStore } from 'pinia'
import { ensureSettings, updateSettings as persistSettings } from '../repositories/settingsRepo'
import type { AppSettings } from '../types/settings'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    loaded: false,
    hideAmount: false,
    darkMode: false,
    amountDecimalPlaces: 2,
    showDeletedAccounts: false,
    lastExportDate: ''
  }),
  actions: {
    apply(settings: AppSettings) {
      this.hideAmount = settings.hideAmount
      this.darkMode = settings.darkMode
      this.amountDecimalPlaces = settings.amountDecimalPlaces
      this.showDeletedAccounts = settings.showDeletedAccounts
      this.lastExportDate = settings.lastExportDate
      this.loaded = true
      this.syncTheme()
    },
    syncTheme() {
      document.documentElement.dataset.theme = this.darkMode ? 'dark' : 'light'
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', this.darkMode ? '#111111' : '#ffffff')
    },
    async loadSettings() {
      const settings = await ensureSettings()
      this.apply(settings)
    },
    async updateSettings(patch: Partial<AppSettings>) {
      const settings = await persistSettings(patch)
      this.apply(settings)
    },
    async toggleHideAmount() {
      await this.updateSettings({ hideAmount: !this.hideAmount })
    }
  }
})
