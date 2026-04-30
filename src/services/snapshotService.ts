import { db } from '../db'
import type { Account } from '../types/account'
import type { AccountSnapshotItem, AssetSnapshot } from '../types/snapshot'
import { now, today } from '../utils/date'
import { normalizeMoney } from '../utils/money'

export function getSnapshotId(date: string): string {
  return `asset_snapshot_${date}`
}

function isVisibleAccount(account: Account): boolean {
  return account.isActive !== false && account.isDeleted !== true
}

function toSnapshotAccount(account: Account): AccountSnapshotItem {
  return {
    accountId: account.id,
    accountName: account.name || '未命名账户',
    accountType: account.typeId || 'other',
    balance: normalizeMoney(account.currentBalance || 0),
    currency: account.currency || 'CNY',
    isLiability: account.category === 'LIABILITY'
  }
}

function toMoneyValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeMoney(value)
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(/[,，\s¥￥]/g, ''))
    if (Number.isFinite(parsed)) {
      return normalizeMoney(parsed)
    }
  }

  return 0
}

export function buildAssetSnapshot(
  accounts: Account[],
  snapshotDate = today(),
  timestamp = now()
): AssetSnapshot {
  let totalAssets = 0
  let totalLiabilities = 0

  const accountSnapshots = accounts.filter(isVisibleAccount).map((account) => {
    const accountSnapshot = toSnapshotAccount(account)

    if (accountSnapshot.isLiability) {
      totalLiabilities = normalizeMoney(totalLiabilities + accountSnapshot.balance)
    } else {
      totalAssets = normalizeMoney(totalAssets + accountSnapshot.balance)
    }

    return accountSnapshot
  })

  return {
    id: getSnapshotId(snapshotDate),
    date: snapshotDate,
    createdAt: timestamp,
    totalAssets,
    totalLiabilities,
    netAssets: normalizeMoney(totalAssets - totalLiabilities),
    accounts: accountSnapshots
  }
}

export function normalizeAssetSnapshot(snapshot: Partial<AssetSnapshot>): AssetSnapshot {
  const date = snapshot.date || today()
  const createdAt = snapshot.createdAt || now()
  const accounts = (snapshot.accounts ?? []).map((account) => ({
    accountId: account.accountId,
    accountName: account.accountName || '未命名账户',
    accountType: account.accountType || 'other',
    balance: toMoneyValue(account.balance),
    currency: account.currency || 'CNY',
    isLiability: account.isLiability === true
  }))
  const totalAssets =
    snapshot.totalAssets !== undefined
      ? toMoneyValue(snapshot.totalAssets)
      : normalizeMoney(accounts.filter((account) => !account.isLiability).reduce((sum, account) => sum + account.balance, 0))
  const totalLiabilities =
    snapshot.totalLiabilities !== undefined
      ? toMoneyValue(snapshot.totalLiabilities)
      : normalizeMoney(accounts.filter((account) => account.isLiability).reduce((sum, account) => sum + account.balance, 0))

  return {
    id: snapshot.id || getSnapshotId(date),
    date,
    createdAt,
    totalAssets,
    totalLiabilities,
    netAssets:
      snapshot.netAssets !== undefined
        ? toMoneyValue(snapshot.netAssets)
        : normalizeMoney(totalAssets - totalLiabilities),
    accounts
  }
}

export async function upsertDailySnapshot(snapshotDate = today(), timestamp = now()): Promise<AssetSnapshot> {
  const accounts = await db.accounts.toArray()
  const snapshot = buildAssetSnapshot(accounts, snapshotDate, timestamp)
  await db.assetSnapshots.put(snapshot)
  return snapshot
}

export async function getAssetSnapshots(): Promise<AssetSnapshot[]> {
  const snapshots = await db.assetSnapshots.orderBy('date').toArray()
  return snapshots
    .map(normalizeAssetSnapshot)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
}
