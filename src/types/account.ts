export type AccountCategory = 'ASSET' | 'LIABILITY'

export interface AccountType {
  id: string
  name: string
  category: AccountCategory
  groupName: string
  icon?: string
  sortOrder: number
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  name: string
  typeId: string
  typeName: string
  category: AccountCategory
  groupName: string
  currentBalance: number
  currency: 'CNY'
  icon?: string
  customIcon?: string
  note?: string
  sortOrder: number
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAccountInput {
  name: string
  typeId: string
  category: AccountCategory
  groupName: string
  currentBalance: number
  icon?: string
  customIcon?: string
  note?: string
}

export interface UpdateAccountInput {
  name: string
  typeId: string
  category: AccountCategory
  groupName: string
  icon?: string
  customIcon?: string
  note?: string
}
