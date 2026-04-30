import { db } from '../db'
import { getAssetSnapshots } from './snapshotService'
import type { Account } from '../types/account'
import type { NetAssetTrendPoint } from '../types/trend'
import { today } from '../utils/date'
import { normalizeMoney } from '../utils/money'

interface TrendEvent {
  month: string
  date: string
  timestamp: string
  netAsset: number
  priority: number
}

function isVisibleAccount(account: Account): boolean {
  return account.isActive !== false && account.isDeleted !== true
}

function toMonthKey(value: string): string {
  if (/^\d{4}-\d{2}/.test(value)) {
    return value.slice(0, 7)
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? today().slice(0, 7) : date.toISOString().slice(0, 7)
}

function compareMonth(a: string, b: string): number {
  return a.localeCompare(b)
}

function nextMonth(month: string): string {
  const [year = '0', monthNumber = '1'] = month.split('-')
  const date = new Date(Number(year), Number(monthNumber), 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function compareTrendEvents(a: TrendEvent, b: TrendEvent): number {
  return (
    a.date.localeCompare(b.date) ||
    a.timestamp.localeCompare(b.timestamp) ||
    a.priority - b.priority
  )
}

function calculateNetAsset(accounts: Account[]): number {
  return accounts.filter(isVisibleAccount).reduce((total, account) => {
    const signedBalance = account.category === 'LIABILITY' ? -account.currentBalance : account.currentBalance
    return normalizeMoney(total + signedBalance)
  }, 0)
}

function calculateNetAssetFromBalances(accounts: Map<string, Account>, balances: Map<string, number>): number {
  let netAsset = 0

  for (const [accountId, balance] of balances.entries()) {
    const account = accounts.get(accountId)
    if (!account || !isVisibleAccount(account)) {
      continue
    }

    netAsset = normalizeMoney(netAsset + (account.category === 'LIABILITY' ? -balance : balance))
  }

  return netAsset
}

async function getTrendEventsFromHistory(accounts: Account[]): Promise<TrendEvent[]> {
  const histories = await db.balanceHistory.orderBy('changedAt').toArray()
  const accountMap = new Map(accounts.map((account) => [account.id, account]))
  const balances = new Map<string, number>()
  const events: TrendEvent[] = []

  for (const history of histories) {
    balances.set(history.accountId, normalizeMoney(history.newBalance))
    const date = history.changedDate || history.changedAt.slice(0, 10)
    events.push({
      month: toMonthKey(date),
      date,
      timestamp: history.changedAt,
      netAsset: calculateNetAssetFromBalances(accountMap, balances),
      priority: 1
    })
  }

  return events
}

function toMonthlyPoints(events: TrendEvent[]): NetAssetTrendPoint[] {
  if (events.length === 0) {
    return []
  }

  const monthly = new Map<string, TrendEvent>()
  const sortedEvents = [...events].sort(compareTrendEvents)

  for (const event of sortedEvents) {
    const existing = monthly.get(event.month)
    if (!existing || compareTrendEvents(existing, event) <= 0) {
      monthly.set(event.month, event)
    }
  }

  const months = [...monthly.keys()].sort(compareMonth)
  const firstMonth = months[0]
  const lastEventMonth = months[months.length - 1]
  const currentMonth = today().slice(0, 7)
  const lastMonth = compareMonth(currentMonth, lastEventMonth) > 0 ? currentMonth : lastEventMonth
  const filled: NetAssetTrendPoint[] = []
  let cursor = firstMonth
  let latestNetAsset = monthly.get(firstMonth)?.netAsset ?? 0

  while (compareMonth(cursor, lastMonth) <= 0) {
    const point = monthly.get(cursor)
    if (point) {
      latestNetAsset = point.netAsset
    }

    filled.push({
      month: cursor,
      netAsset: latestNetAsset
    })
    cursor = nextMonth(cursor)
  }

  return filled
}

export async function getNetAssetTrend(): Promise<NetAssetTrendPoint[]> {
  const [accounts, snapshots] = await Promise.all([db.accounts.toArray(), getAssetSnapshots()])
  const historyEvents = await getTrendEventsFromHistory(accounts)
  const snapshotEvents: TrendEvent[] = snapshots.map((snapshot) => ({
    month: toMonthKey(snapshot.date),
    date: snapshot.date,
    timestamp: snapshot.createdAt,
    netAsset: normalizeMoney(snapshot.netAssets),
    priority: 2
  }))
  const currentDate = today()
  const currentEvent: TrendEvent | undefined =
    accounts.length > 0
      ? {
          month: toMonthKey(currentDate),
          date: currentDate,
          timestamp: new Date().toISOString(),
          netAsset: calculateNetAsset(accounts),
          priority: 3
        }
      : undefined
  const events = currentEvent ? [...historyEvents, ...snapshotEvents, currentEvent] : [...historyEvents, ...snapshotEvents]

  return toMonthlyPoints(events)
}
