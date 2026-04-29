import { defineStore } from 'pinia'

export type ActiveSheet =
  | 'NONE'
  | 'ADD_ACCOUNT'
  | 'EDIT_ACCOUNT'
  | 'ACCOUNT_ACTION'
  | 'UPDATE_BALANCE'
  | 'TREND'
  | 'SETTINGS'

export const useUiStore = defineStore('ui', {
  state: () => ({
    activeSheet: 'NONE' as ActiveSheet,
    selectedAccountId: undefined as string | undefined
  }),
  actions: {
    openSheet(sheet: ActiveSheet, accountId?: string) {
      this.activeSheet = sheet
      this.selectedAccountId = accountId
    },
    closeSheet() {
      this.activeSheet = 'NONE'
      this.selectedAccountId = undefined
    }
  }
})
