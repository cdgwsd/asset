import type { Account, AccountType } from './account'
import type { BalanceHistory } from './balance'
import type { AppSettings } from './settings'

export interface ExportData {
  version: string
  exportedAt: string
  accountTypes: AccountType[]
  accounts: Account[]
  balanceHistory: BalanceHistory[]
  settings: AppSettings[]
}
