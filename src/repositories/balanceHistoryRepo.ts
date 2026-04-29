import { db } from '../db'
import type { BalanceHistory } from '../types/balance'

export async function getAllBalanceHistory(): Promise<BalanceHistory[]> {
  return db.balanceHistory.orderBy('changedAt').toArray()
}

export async function getBalanceHistoryByAccount(accountId: string): Promise<BalanceHistory[]> {
  return db.balanceHistory.where('accountId').equals(accountId).sortBy('changedAt')
}

export async function addBalanceHistory(history: BalanceHistory): Promise<void> {
  await db.balanceHistory.add(history)
}
