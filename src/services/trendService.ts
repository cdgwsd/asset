import { db } from '../db'
import { getAssetSnapshots } from './snapshotService'
import type { Account } from '../types/account'
import type { AccountTrendPoint, NetAssetTrendPoint, TrendRange } from '../types/trend'
import { dateDaysAgo } from '../utils/date'
import { normalizeMoney } from '../utils/money'

function applyRange<T>(points: T[], range: TrendRange, getDate: (point: T) => string): T[] {
  if (range === 'LAST_7') {
    return points.slice(-7)
  }

  if (range === 'ALL') {
    return points
  }

  const days = range === 'LAST_30_DAYS' ? 29 : 89
  const cutoff = dateDaysAgo(days)
  return points.filter((point) => getDate(point) >= cutoff)
}

function calculateTotals(accounts: Map<string, Account>, balances: Map<string, number>) {
  let totalAsset = 0
  let totalLiability = 0

  for (const [accountId, balance] of balances.entries()) {
    const account = accounts.get(accountId)
    if (!account) {
      continue
    }

    if (account.category === 'ASSET') {
      totalAsset = normalizeMoney(totalAsset + balance)
    } else {
      totalLiability = normalizeMoney(totalLiability + balance)
    }
  }

  return {
    totalAsset,
    totalLiability,
    netAsset: normalizeMoney(totalAsset - totalLiability)
  }
}

async function getNetAssetTrendFromHistory(): Promise<NetAssetTrendPoint[]> {
  const [accounts, histories] = await Promise.all([
    db.accounts.toArray(),
    db.balanceHistory.orderBy('changedAt').toArray()
  ])

  const accountMap = new Map(accounts.map((account) => [account.id, account]))
  const balances = new Map<string, number>()
  const dailyPoints = new Map<string, NetAssetTrendPoint>()

  for (const history of histories) {
    balances.set(history.accountId, history.newBalance)
    const totals = calculateTotals(accountMap, balances)
    const date = history.changedDate || history.changedAt.slice(0, 10)

    dailyPoints.set(date, {
      date,
      ...totals
    })
  }

  const points = [...dailyPoints.values()].sort((a, b) => a.date.localeCompare(b.date))
  return points
}

async function getAccountBalanceTrendFromHistory(accountId: string): Promise<AccountTrendPoint[]> {
  const histories = await db.balanceHistory.where('accountId').equals(accountId).sortBy('changedAt')
  const dailyPoints = new Map<string, AccountTrendPoint>()

  for (const history of histories) {
    const date = history.changedDate || history.changedAt.slice(0, 10)
    dailyPoints.set(date, {
      dateTime: history.changedAt,
      balance: history.newBalance
    })
  }

  return [...dailyPoints.values()].sort((a, b) => a.dateTime.localeCompare(b.dateTime))
}

export async function getNetAssetTrend(range: TrendRange): Promise<NetAssetTrendPoint[]> {
  const [snapshots, historyPoints] = await Promise.all([getAssetSnapshots(), getNetAssetTrendFromHistory()])

  if (snapshots.length === 0) {
    return applyRange(historyPoints, range, (point) => point.date)
  }

  const mergedPoints = new Map<string, NetAssetTrendPoint>()
  for (const point of historyPoints) {
    mergedPoints.set(point.date, point)
  }
  for (const snapshot of snapshots) {
    mergedPoints.set(snapshot.date, {
      date: snapshot.date,
      totalAsset: snapshot.totalAssets,
      totalLiability: snapshot.totalLiabilities,
      netAsset: snapshot.netAssets
    })
  }

  const points = [...mergedPoints.values()].sort((a, b) => a.date.localeCompare(b.date))
  return applyRange(points, range, (point) => point.date)
}

export async function getAccountBalanceTrend(
  accountId: string,
  range: TrendRange
): Promise<AccountTrendPoint[]> {
  const [snapshots, historyPoints] = await Promise.all([
    getAssetSnapshots(),
    getAccountBalanceTrendFromHistory(accountId)
  ])

  if (snapshots.length === 0) {
    return applyRange(historyPoints, range, (point) => point.dateTime.slice(0, 10))
  }

  const mergedPoints = new Map<string, AccountTrendPoint>()
  for (const point of historyPoints) {
    mergedPoints.set(point.dateTime.slice(0, 10), point)
  }
  for (const snapshot of snapshots) {
    const account = snapshot.accounts.find((item) => item.accountId === accountId)
    if (!account) {
      continue
    }

    mergedPoints.set(snapshot.date, {
      dateTime: snapshot.createdAt,
      balance: account.balance
    })
  }

  const points = [...mergedPoints.values()].sort((a, b) => a.dateTime.localeCompare(b.dateTime))
  return applyRange(points, range, (point) => point.dateTime.slice(0, 10))
}
