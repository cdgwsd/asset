import { defineStore } from 'pinia'
import { getHomeSummary } from '../services/summaryService'
import type { HomeSummary } from '../types/summary'
import { normalizeMoney } from '../utils/money'

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
    },
    applyAccountBalance(accountId: string, newBalance: number, updatedAt: string) {
      if (!this.summary) {
        return
      }

      let oldBalance = 0
      let signedDelta = 0
      let totalAssetDelta = 0
      let totalLiabilityDelta = 0
      let found = false

      const groups = this.summary.groups.map((group) => {
        let groupDelta = 0
        let groupChanged = false
        const accounts = group.accounts.map((account) => {
          if (account.accountId !== accountId) {
            return account
          }

          oldBalance = account.balance
          const delta = normalizeMoney(newBalance - oldBalance)
          signedDelta = account.category === 'LIABILITY' ? -delta : delta
          totalAssetDelta = account.category === 'ASSET' ? delta : 0
          totalLiabilityDelta = account.category === 'LIABILITY' ? delta : 0
          groupDelta = signedDelta
          groupChanged = true
          found = true

          return {
            ...account,
            balance: newBalance,
            updatedAt
          }
        })

        if (!groupChanged) {
          return group
        }

        return groupDelta === 0
          ? { ...group, accounts }
          : {
              ...group,
              totalAmount: normalizeMoney(group.totalAmount + groupDelta),
              accounts
            }
      })

      if (!found || oldBalance === newBalance) {
        return
      }

      this.summary = {
        totalAsset: normalizeMoney(this.summary.totalAsset + totalAssetDelta),
        totalLiability: normalizeMoney(this.summary.totalLiability + totalLiabilityDelta),
        netAsset: normalizeMoney(this.summary.netAsset + signedDelta),
        groups
      }
    }
  }
})
