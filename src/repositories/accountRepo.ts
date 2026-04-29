import { db } from '../db'
import type { Account } from '../types/account'

export async function getAccountById(id: string): Promise<Account | undefined> {
  return db.accounts.get(id)
}

export async function getAccounts(options: { includeDeleted?: boolean } = {}): Promise<Account[]> {
  const accounts = await db.accounts.orderBy('sortOrder').toArray()

  if (options.includeDeleted) {
    return accounts
  }

  return accounts.filter((account) => account.isActive && !account.isDeleted)
}

export async function putAccount(account: Account): Promise<void> {
  await db.accounts.put(account)
}

export async function updateAccountById(id: string, patch: Partial<Account>): Promise<number> {
  return db.accounts.update(id, patch)
}
