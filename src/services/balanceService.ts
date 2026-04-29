import { db } from '../db'
import type { BalanceHistory, UpdateBalanceInput, UpdateBalanceResult } from '../types/balance'
import { now, today } from '../utils/date'
import { createId } from '../utils/id'
import { normalizeMoney } from '../utils/money'

export async function updateAccountBalance(input: UpdateBalanceInput): Promise<UpdateBalanceResult> {
  const account = await db.accounts.get(input.accountId)
  if (!account || account.isDeleted) {
    throw new Error('账户不存在')
  }

  const oldBalance = account.currentBalance
  const newBalance = normalizeMoney(input.newBalance)

  if (oldBalance === newBalance) {
    return { changed: false }
  }

  const timestamp = now()
  const history: BalanceHistory = {
    id: createId('history'),
    accountId: account.id,
    oldBalance,
    newBalance,
    delta: normalizeMoney(newBalance - oldBalance),
    changedAt: timestamp,
    changedDate: today(),
    source: input.source,
    note: input.note?.trim() || undefined,
    createdAt: timestamp
  }

  await db.transaction('rw', db.accounts, db.balanceHistory, async () => {
    await db.accounts.update(account.id, {
      currentBalance: newBalance,
      updatedAt: timestamp
    })
    await db.balanceHistory.add(history)
  })

  return { changed: true }
}
