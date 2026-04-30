import { db } from '../db'
import { buildAssetSnapshot } from './snapshotService'
import type { BalanceHistory, UpdateBalanceInput, UpdateBalanceResult } from '../types/balance'
import { now, today } from '../utils/date'
import { createId } from '../utils/id'
import { assertMoneyWithinLimit, normalizeMoney } from '../utils/money'

export async function updateAccountBalance(input: UpdateBalanceInput): Promise<UpdateBalanceResult> {
  const account = await db.accounts.get(input.accountId)
  if (!account || account.isDeleted) {
    throw new Error('账户不存在')
  }

  const oldBalance = account.currentBalance
  const newBalance = assertMoneyWithinLimit(input.newBalance)

  if (oldBalance === newBalance) {
    return {
      changed: false,
      accountId: account.id,
      oldBalance,
      newBalance,
      updatedAt: account.updatedAt
    }
  }

  const timestamp = now()
  const changedDate = today()
  const history: BalanceHistory = {
    id: createId('history'),
    accountId: account.id,
    oldBalance,
    newBalance,
    delta: normalizeMoney(newBalance - oldBalance),
    changedAt: timestamp,
    changedDate,
    source: input.source,
    note: input.note?.trim() || undefined,
    createdAt: timestamp
  }
  const accounts = await db.accounts.toArray()
  const snapshot = buildAssetSnapshot(
    accounts.map((item) =>
      item.id === account.id
        ? {
            ...item,
            currentBalance: newBalance,
            updatedAt: timestamp
          }
        : item
    ),
    changedDate,
    timestamp
  )

  await db.transaction('rw', db.accounts, db.balanceHistory, db.assetSnapshots, async () => {
    await db.accounts.update(account.id, {
      currentBalance: newBalance,
      updatedAt: timestamp
    })
    await db.balanceHistory.add(history)
    await db.assetSnapshots.put(snapshot)
  })

  return {
    changed: true,
    accountId: account.id,
    oldBalance,
    newBalance,
    updatedAt: timestamp
  }
}
