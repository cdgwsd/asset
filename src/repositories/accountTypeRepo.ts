import { db } from '../db'
import type { AccountType } from '../types/account'

export async function getAllAccountTypes(): Promise<AccountType[]> {
  return db.accountTypes.orderBy('sortOrder').toArray()
}

export async function getAccountTypeById(id: string): Promise<AccountType | undefined> {
  return db.accountTypes.get(id)
}

export async function upsertAccountTypes(accountTypes: AccountType[]): Promise<void> {
  await db.accountTypes.bulkPut(accountTypes)
}
