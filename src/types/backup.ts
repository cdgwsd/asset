import type { Account, AccountType } from './account'
import type { BalanceHistory } from './balance'
import type { AppSettings } from './settings'
import type { AssetSnapshot } from './snapshot'

export interface BackupPayload {
  accountTypes: AccountType[]
  accounts: Account[]
  balanceHistory: BalanceHistory[]
  assetSnapshots: AssetSnapshot[]
  settings: AppSettings
}

export interface ExportData {
  app: 'asset-wallet'
  schema: 'asset-wallet.backup'
  version: string
  appVersion: string
  exportedAt: string
  data: BackupPayload
}

export interface ImportPreview {
  adaptedLegacy: boolean
  sourceVersion: string
  warnings: string[]
  summary: {
    accountTypes: number
    accounts: number
    balanceHistory: number
    assetSnapshots: number
  }
}

export interface ImportResult extends ImportPreview {
  importedAt: string
}
