import type { Account, AccountType } from './account'
import type { BalanceHistory } from './balance'
import type { AppSettings } from './settings'
import type { AssetSnapshot } from './snapshot'

export interface ExportData {
  version: string
  exportedAt: string
  accountTypes: AccountType[]
  accounts: Account[]
  balanceHistory: BalanceHistory[]
  assetSnapshots?: AssetSnapshot[]
  settings: AppSettings[]
}
