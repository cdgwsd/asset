export interface AccountSnapshotItem {
  accountId: string
  accountName: string
  accountType: string
  balance: number
  currency: 'CNY'
  isLiability: boolean
}

export interface AssetSnapshot {
  id: string
  date: string
  createdAt: string
  totalAssets: number
  totalLiabilities: number
  netAssets: number
  accounts: AccountSnapshotItem[]
}
