import { db } from '../db'
import { APP_VERSION, defaultAccountTypeSeeds } from '../db/defaults'
import { createDefaultSettings } from '../repositories/settingsRepo'
import type { Account } from '../types/account'
import type { ExportData } from '../types/backup'
import type { BalanceHistory } from '../types/balance'
import { now } from '../utils/date'

function assertExportData(data: unknown): asserts data is ExportData {
  if (!data || typeof data !== 'object') {
    throw new Error('导入失败，请检查文件格式')
  }

  const candidate = data as Partial<ExportData>
  if (
    typeof candidate.version !== 'string' ||
    !Array.isArray(candidate.accountTypes) ||
    !Array.isArray(candidate.accounts) ||
    !Array.isArray(candidate.balanceHistory) ||
    !Array.isArray(candidate.settings)
  ) {
    throw new Error('导入失败，请检查文件格式')
  }
}

function escapeCsv(value: string | number | undefined): string {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

async function seedDefaults(): Promise<void> {
  const timestamp = now()
  await db.accountTypes.bulkPut(
    defaultAccountTypeSeeds.map((accountType) => ({
      ...accountType,
      createdAt: timestamp,
      updatedAt: timestamp
    }))
  )
  await db.settings.put(createDefaultSettings())
}

export async function exportData(): Promise<ExportData> {
  const [accountTypes, accounts, balanceHistory, settings] = await Promise.all([
    db.accountTypes.toArray(),
    db.accounts.toArray(),
    db.balanceHistory.toArray(),
    db.settings.toArray()
  ])

  return {
    version: APP_VERSION,
    exportedAt: now(),
    accountTypes,
    accounts,
    balanceHistory,
    settings
  }
}

export async function importData(data: unknown): Promise<void> {
  assertExportData(data)

  if (!data.version.startsWith('1.')) {
    throw new Error('暂不支持该版本的数据文件')
  }

  await db.transaction('rw', db.accountTypes, db.accounts, db.balanceHistory, db.settings, async () => {
    await Promise.all([
      db.accountTypes.clear(),
      db.accounts.clear(),
      db.balanceHistory.clear(),
      db.settings.clear()
    ])

    await Promise.all([
      db.accountTypes.bulkPut(data.accountTypes),
      db.accounts.bulkPut(data.accounts),
      db.balanceHistory.bulkPut(data.balanceHistory),
      db.settings.bulkPut(data.settings)
    ])
  })
}

export async function exportBalanceHistoryCSV(): Promise<string> {
  const [histories, accounts] = await Promise.all([db.balanceHistory.toArray(), db.accounts.toArray()])
  const accountMap = new Map<string, Account>(accounts.map((account) => [account.id, account]))
  const header = ['账户名称', '账户类型', '账户性质', '旧余额', '新余额', '变化金额', '变动时间', '备注']
  const rows = histories
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt))
    .map((history: BalanceHistory) => {
      const account = accountMap.get(history.accountId)

      return [
        account?.name ?? '未知账户',
        account?.typeName ?? '',
        account?.category === 'LIABILITY' ? '负债' : '资产',
        history.oldBalance,
        history.newBalance,
        history.delta,
        history.changedAt,
        history.note
      ].map(escapeCsv)
    })

  return `\uFEFF${[header.map(escapeCsv), ...rows].map((row) => row.join(',')).join('\n')}`
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.accountTypes, db.accounts, db.balanceHistory, db.settings, async () => {
    await Promise.all([
      db.accountTypes.clear(),
      db.accounts.clear(),
      db.balanceHistory.clear(),
      db.settings.clear()
    ])
    await seedDefaults()
  })
}
