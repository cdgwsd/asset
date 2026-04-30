import { db } from '../db'
import { defaultAccountTypeSeeds } from '../db/defaults'
import { getAccountById as findAccountById, getAccounts as findAccounts } from '../repositories/accountRepo'
import { ensureSettings } from '../repositories/settingsRepo'
import { buildAssetSnapshot } from './snapshotService'
import type { Account, AccountCategory, AccountType, CreateAccountInput, UpdateAccountInput } from '../types/account'
import type { BalanceHistory } from '../types/balance'
import { now, today } from '../utils/date'
import { createId } from '../utils/id'
import { assertMoneyWithinLimit } from '../utils/money'

export async function initDefaultAccountTypes(): Promise<void> {
  const existingKeys = await db.accountTypes.toCollection().primaryKeys()
  const existingSet = new Set(existingKeys)
  const timestamp = now()
  const missingTypes: AccountType[] = defaultAccountTypeSeeds
    .filter((accountType) => !existingSet.has(accountType.id))
    .map((accountType) => ({
      ...accountType,
      createdAt: timestamp,
      updatedAt: timestamp
    }))

  if (missingTypes.length > 0) {
    await db.accountTypes.bulkPut(missingTypes)
  }

  await ensureSettings()
}

export async function getAccountTypes(): Promise<AccountType[]> {
  return db.accountTypes.orderBy('sortOrder').toArray()
}

export async function getAccounts(options: { includeDeleted?: boolean } = {}): Promise<Account[]> {
  return findAccounts(options)
}

export async function getActiveAccounts(): Promise<Account[]> {
  return findAccounts()
}

export async function getAccountById(accountId: string): Promise<Account | undefined> {
  return findAccountById(accountId)
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const accountType = await db.accountTypes.get(input.typeId)
  if (!accountType) {
    throw new Error('账户类型不存在')
  }

  const timestamp = now()
  const changedDate = today()
  const currentBalance = assertMoneyWithinLimit(input.currentBalance)
  const account: Account = {
    id: createId('account'),
    name: input.name.trim(),
    typeId: accountType.id,
    typeName: accountType.name,
    category: input.category,
    groupName: input.groupName,
    currentBalance,
    currency: 'CNY',
    icon: input.icon?.trim() || accountType.icon,
    note: input.note?.trim() || undefined,
    sortOrder: Date.now(),
    isActive: true,
    isDeleted: false,
    createdAt: timestamp,
    updatedAt: timestamp
  }

  const history: BalanceHistory = {
    id: createId('history'),
    accountId: account.id,
    oldBalance: 0,
    newBalance: currentBalance,
    delta: currentBalance,
    changedAt: timestamp,
    changedDate,
    source: 'SYSTEM_INIT',
    note: '账户初始余额',
    createdAt: timestamp
  }
  const accounts = await db.accounts.toArray()
  const snapshot = buildAssetSnapshot([...accounts, account], changedDate, timestamp)

  await db.transaction('rw', db.accounts, db.balanceHistory, db.assetSnapshots, async () => {
    await db.accounts.add(account)
    await db.balanceHistory.add(history)
    await db.assetSnapshots.put(snapshot)
  })

  return account
}

export async function updateAccount(accountId: string, input: UpdateAccountInput): Promise<Account> {
  const account = await db.accounts.get(accountId)
  if (!account) {
    throw new Error('账户不存在')
  }

  const accountType = await db.accountTypes.get(input.typeId)
  if (!accountType) {
    throw new Error('账户类型不存在')
  }

  const timestamp = now()
  const patch: Partial<Account> = {
    name: input.name.trim(),
    typeId: accountType.id,
    typeName: accountType.name,
    category: input.category,
    groupName: input.groupName,
    icon: input.icon?.trim() || accountType.icon,
    note: input.note?.trim() || undefined,
    updatedAt: timestamp
  }
  const accounts = await db.accounts.toArray()
  const updatedAccount = { ...account, ...patch }
  const snapshot = buildAssetSnapshot(
    accounts.map((item) => (item.id === accountId ? updatedAccount : item)),
    today(),
    timestamp
  )

  await db.transaction('rw', db.accounts, db.assetSnapshots, async () => {
    await db.accounts.update(accountId, patch)
    await db.assetSnapshots.put(snapshot)
  })
  return { ...account, ...patch }
}

export async function deleteAccount(accountId: string): Promise<void> {
  const account = await db.accounts.get(accountId)
  if (!account) {
    throw new Error('账户不存在')
  }

  const timestamp = now()
  const patch: Partial<Account> = {
    isDeleted: true,
    isActive: false,
    updatedAt: timestamp
  }
  const accounts = await db.accounts.toArray()
  const deletedAccount = { ...account, ...patch }
  const snapshot = buildAssetSnapshot(
    accounts.map((item) => (item.id === accountId ? deletedAccount : item)),
    today(),
    timestamp
  )

  await db.transaction('rw', db.accounts, db.assetSnapshots, async () => {
    await db.accounts.update(accountId, patch)
    await db.assetSnapshots.put(snapshot)
  })
}

export async function createCustomAccountType(
  name: string,
  category: AccountCategory,
  groupName: string
): Promise<AccountType> {
  const timestamp = now()
  const typeId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const customType: AccountType = {
    id: typeId,
    name: name.trim(),
    category,
    groupName,
    icon: category === 'LIABILITY' ? 'credit_card' : 'wallet',
    sortOrder: 950,
    isSystem: false,
    createdAt: timestamp,
    updatedAt: timestamp
  }

  await db.accountTypes.put(customType)
  return customType
}
