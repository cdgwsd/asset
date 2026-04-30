export type BalanceChangeSource = 'SYSTEM_INIT' | 'MANUAL_UPDATE' | 'IMPORT'

export interface BalanceHistory {
  id: string
  accountId: string
  oldBalance: number
  newBalance: number
  delta: number
  changedAt: string
  changedDate: string
  source: BalanceChangeSource
  note?: string
  createdAt: string
}

export interface UpdateBalanceInput {
  accountId: string
  newBalance: number
  note?: string
  source: BalanceChangeSource
}

export interface UpdateBalanceResult {
  changed: boolean
  accountId: string
  oldBalance: number
  newBalance: number
  updatedAt: string
}
