import type { AccountCategory } from './account'

export interface AccountRowView {
  accountId: string
  name: string
  icon?: string
  category: AccountCategory
  balance: number
  displayBalance: string
  updatedAt: string
  sortOrder: number
  isDeleted: boolean
}

export interface AccountGroupView {
  groupName: string
  totalAmount: number
  accounts: AccountRowView[]
}

export interface HomeSummary {
  totalAsset: number
  totalLiability: number
  netAsset: number
  groups: AccountGroupView[]
}
