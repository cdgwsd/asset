import Dexie, { type Table } from 'dexie'
import type { Account, AccountType } from '../types/account'
import type { BalanceHistory } from '../types/balance'
import type { AppSettings } from '../types/settings'
import type { AssetSnapshot } from '../types/snapshot'

class AssetWalletDatabase extends Dexie {
  accountTypes!: Table<AccountType, string>
  accounts!: Table<Account, string>
  balanceHistory!: Table<BalanceHistory, string>
  assetSnapshots!: Table<AssetSnapshot, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super('asset_wallet_db')

    this.version(1).stores({
      accountTypes: 'id, name, category, groupName, sortOrder, isSystem',
      accounts: 'id, name, typeId, category, groupName, isActive, isDeleted, sortOrder',
      balanceHistory: 'id, accountId, changedAt, changedDate, source',
      settings: 'id'
    })

    this.version(2).stores({
      accountTypes: 'id, name, category, groupName, sortOrder, isSystem',
      accounts: 'id, name, typeId, category, groupName, isActive, isDeleted, sortOrder',
      balanceHistory: 'id, accountId, changedAt, changedDate, source',
      assetSnapshots: 'id, date, createdAt',
      settings: 'id'
    })
  }
}

export const db = new AssetWalletDatabase()
