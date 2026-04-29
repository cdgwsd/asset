import { db } from '../db'
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

export async function getNetAssetTrend(range: TrendRange): Promise<NetAssetTrendPoint[]> {
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
  return applyRange(points, range, (point) => point.date)
}

export async function getAccountBalanceTrend(
  accountId: string,
  range: TrendRange
): Promise<AccountTrendPoint[]> {
  const histories = await db.balanceHistory.where('accountId').equals(accountId).sortBy('changedAt')
  const points = histories.map((history) => ({
    dateTime: history.changedAt,
    balance: history.newBalance
  }))

  return applyRange(points, range, (point) => point.dateTime.slice(0, 10))
}
