import { db } from '../db'
import { APP_VERSION, defaultAccountTypeSeeds } from '../db/defaults'
import { DEFAULT_SETTINGS_ID, createDefaultSettings } from '../repositories/settingsRepo'
import { buildAssetSnapshot, getSnapshotId } from './snapshotService'
import type { Account, AccountCategory, AccountType } from '../types/account'
import type { BackupPayload, ExportData, ImportPreview, ImportResult } from '../types/backup'
import type { BalanceChangeSource, BalanceHistory } from '../types/balance'
import type { AppSettings } from '../types/settings'
import type { AccountSnapshotItem, AssetSnapshot } from '../types/snapshot'
import { now, today } from '../utils/date'
import { normalizeMoney } from '../utils/money'

const BACKUP_APP_ID = 'asset-wallet'
const BACKUP_SCHEMA = 'asset-wallet.backup'
const BACKUP_VERSION = '2.0.0'
const SUPPORTED_BACKUP_MAJOR = 2

type LooseRecord = Record<string, unknown>

interface LooseBackupPayload {
  accountTypes?: unknown
  accounts?: unknown
  balanceHistory?: unknown
  assetSnapshots?: unknown
  settings?: unknown
}

interface NormalizedBackup {
  payload: BackupPayload
  adaptedLegacy: boolean
  sourceVersion: string
  warnings: string[]
}

class BackupImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupImportError'
  }
}

function isRecord(value: unknown): value is LooseRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function firstValue(record: LooseRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key]
    }
  }

  return undefined
}

function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return fallback
}

function toOptionalString(value: unknown): string | undefined {
  const text = toStringValue(value)
  return text || undefined
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/[,，\s¥￥]/g, '')
    if (normalized) {
      const parsed = Number(normalized)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

function toMoneyValue(value: unknown, fallback = 0): number {
  return normalizeMoney(Math.abs(toNumberValue(value, fallback)))
}

function toSignedMoneyValue(value: unknown, fallback = 0): number {
  return normalizeMoney(toNumberValue(value, fallback))
}

function toIntegerValue(value: unknown, fallback = 0): number {
  return Math.round(toNumberValue(value, fallback))
}

function toBooleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y', 'on', '是', '已开启', '开启'].includes(normalized)) {
      return true
    }

    if (['false', '0', 'no', 'n', 'off', '否', '已关闭', '关闭'].includes(normalized)) {
      return false
    }
  }

  return fallback
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function toDateTimeString(value: unknown, fallback = now()): string {
  const text = toStringValue(value)
  if (!text) {
    return fallback
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function toOptionalDateTimeString(value: unknown): string {
  const text = toStringValue(value)
  if (!text) {
    return ''
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function toDateString(value: unknown, fallback = today()): string {
  const text = toStringValue(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10)
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString().slice(0, 10)
}

function normalizeCategory(value: unknown, fallback: AccountCategory = 'ASSET'): AccountCategory {
  const text = toStringValue(value).trim()
  const upper = text.toUpperCase()

  if (upper === 'LIABILITY' || upper === 'DEBT' || upper === 'CREDIT' || text === '负债') {
    return 'LIABILITY'
  }

  if (upper === 'ASSET' || text === '资产') {
    return 'ASSET'
  }

  return fallback
}

function normalizeHistorySource(value: unknown): BalanceChangeSource {
  const source = toStringValue(value).toUpperCase()
  if (source === 'SYSTEM_INIT' || source === 'MANUAL_UPDATE' || source === 'IMPORT') {
    return source
  }

  return 'IMPORT'
}

function normalizeIcon(value: unknown): string | undefined {
  if (isRecord(value)) {
    return toOptionalString(firstValue(value, ['fileName', 'name', 'key', 'id']))
  }

  return toOptionalString(value)
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of items) {
    map.set(item.id, item)
  }

  return [...map.values()]
}

function defaultAccountTypes(timestamp: string): AccountType[] {
  return defaultAccountTypeSeeds.map((accountType) => ({
    ...accountType,
    createdAt: timestamp,
    updatedAt: timestamp
  }))
}

function normalizeAccountType(value: unknown, index: number, timestamp: string): AccountType | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const name = toStringValue(firstValue(value, ['name', 'typeName', 'label']))
  const rawId = toStringValue(firstValue(value, ['id', 'typeId', 'key']))
  if (!rawId && !name) {
    return undefined
  }

  const seededType = rawId ? defaultAccountTypeSeeds.find((accountType) => accountType.id === rawId) : undefined
  const category = normalizeCategory(firstValue(value, ['category', 'typeCategory']), seededType?.category ?? 'ASSET')
  const fallbackGroupName = category === 'LIABILITY' ? '信用' : '现金'
  const id = rawId || `custom_type_${index + 1}`

  return {
    id,
    name: name || seededType?.name || id,
    category,
    groupName: toStringValue(firstValue(value, ['groupName', 'group']), seededType?.groupName ?? fallbackGroupName) || fallbackGroupName,
    icon: normalizeIcon(firstValue(value, ['icon', 'iconKey', 'accountIcon'])) ?? seededType?.icon,
    sortOrder: toIntegerValue(firstValue(value, ['sortOrder', 'order']), seededType?.sortOrder ?? 950 + index),
    isSystem: toBooleanValue(firstValue(value, ['isSystem', 'system']), seededType?.isSystem ?? false),
    createdAt: toDateTimeString(firstValue(value, ['createdAt', 'createdTime']), timestamp),
    updatedAt: toDateTimeString(firstValue(value, ['updatedAt', 'updatedTime']), timestamp)
  }
}

function findAccountTypeByName(accountTypes: Map<string, AccountType>, typeName: string): AccountType | undefined {
  if (!typeName) {
    return undefined
  }

  return [...accountTypes.values()].find((accountType) => accountType.name === typeName)
}

function normalizeAccount(
  value: unknown,
  index: number,
  accountTypes: Map<string, AccountType>,
  timestamp: string
): Account | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const typeName = toStringValue(firstValue(value, ['typeName', 'accountTypeName']))
  const rawTypeId = toStringValue(firstValue(value, ['typeId', 'accountTypeId', 'type', 'accountType']))
  const matchedType = (rawTypeId ? accountTypes.get(rawTypeId) : undefined) ?? findAccountTypeByName(accountTypes, typeName)
  const inferredCategory = toBooleanValue(firstValue(value, ['isLiability', 'liability']), false)
    ? 'LIABILITY'
    : matchedType?.category ?? 'ASSET'
  const category = normalizeCategory(firstValue(value, ['category', 'accountCategory']), inferredCategory)
  const fallbackTypeId = category === 'LIABILITY' ? 'other_liability' : 'other_asset'
  const typeId = rawTypeId || matchedType?.id || fallbackTypeId
  const accountType = accountTypes.get(typeId) ?? matchedType
  const fallbackGroupName = accountType?.groupName ?? '其他'
  const isDeleted = toBooleanValue(firstValue(value, ['isDeleted', 'deleted']), false)
  const isActive = toBooleanValue(firstValue(value, ['isActive', 'active']), !isDeleted)
  const icon =
    normalizeIcon(firstValue(value, ['icon', 'iconKey', 'accountIcon', 'svgIcon'])) ??
    normalizeIcon(firstValue(value, ['customIcon', 'customIconFile'])) ??
    accountType?.icon

  return {
    id: toStringValue(firstValue(value, ['id', 'accountId']), `account_imported_${index + 1}`),
    name: toStringValue(firstValue(value, ['name', 'accountName', 'title']), `未命名账户 ${index + 1}`),
    typeId,
    typeName: typeName || accountType?.name || (category === 'LIABILITY' ? '其他负债' : '其他资产'),
    category,
    groupName: toStringValue(firstValue(value, ['groupName', 'group']), fallbackGroupName) || fallbackGroupName,
    currentBalance: toMoneyValue(firstValue(value, ['currentBalance', 'balance', 'amount']), 0),
    currency: 'CNY',
    icon,
    customIcon: toOptionalString(firstValue(value, ['customIcon', 'customIconFile'])),
    note: toOptionalString(firstValue(value, ['note', 'memo', 'remark'])),
    sortOrder: toIntegerValue(firstValue(value, ['sortOrder', 'order']), Date.now() + index),
    isActive,
    isDeleted,
    createdAt: toDateTimeString(firstValue(value, ['createdAt', 'createdTime']), timestamp),
    updatedAt: toDateTimeString(firstValue(value, ['updatedAt', 'updatedTime']), timestamp)
  }
}

function ensureAccountTypesForAccounts(accountTypes: AccountType[], accounts: Account[], timestamp: string): AccountType[] {
  const map = new Map(accountTypes.map((accountType) => [accountType.id, accountType]))

  for (const account of accounts) {
    if (map.has(account.typeId)) {
      continue
    }

    map.set(account.typeId, {
      id: account.typeId,
      name: account.typeName || (account.category === 'LIABILITY' ? '其他负债' : '其他资产'),
      category: account.category,
      groupName: account.groupName || '其他',
      icon: account.icon,
      sortOrder: 960 + map.size,
      isSystem: false,
      createdAt: timestamp,
      updatedAt: timestamp
    })
  }

  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'))
}

function normalizeBalanceHistory(
  value: unknown,
  index: number,
  accounts: Account[],
  timestamp: string
): BalanceHistory | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const accountId =
    toStringValue(firstValue(value, ['accountId', 'accountID'])) ||
    accounts.find((account) => account.name === toStringValue(firstValue(value, ['accountName', 'name'])))?.id

  if (!accountId || !accounts.some((account) => account.id === accountId)) {
    return undefined
  }

  const changedAt = toDateTimeString(firstValue(value, ['changedAt', 'createdAt', 'date']), timestamp)
  const oldBalance = toMoneyValue(firstValue(value, ['oldBalance', 'beforeBalance']), 0)
  const newBalance = toMoneyValue(firstValue(value, ['newBalance', 'balance', 'afterBalance']), oldBalance)

  return {
    id: toStringValue(firstValue(value, ['id', 'historyId']), `history_imported_${index + 1}`),
    accountId,
    oldBalance,
    newBalance,
    delta: toSignedMoneyValue(firstValue(value, ['delta', 'changeAmount']), newBalance - oldBalance),
    changedAt,
    changedDate: toDateString(firstValue(value, ['changedDate', 'date']), changedAt.slice(0, 10)),
    source: normalizeHistorySource(firstValue(value, ['source', 'changeSource'])),
    note: toOptionalString(firstValue(value, ['note', 'memo', 'remark'])),
    createdAt: toDateTimeString(firstValue(value, ['createdAt']), changedAt)
  }
}

function normalizeSnapshotAccount(value: unknown, index: number): AccountSnapshotItem | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const isLiability = toBooleanValue(firstValue(value, ['isLiability', 'liability']), false)

  return {
    accountId: toStringValue(firstValue(value, ['accountId', 'id']), `snapshot_account_${index + 1}`),
    accountName: toStringValue(firstValue(value, ['accountName', 'name']), `未命名账户 ${index + 1}`),
    accountType: toStringValue(firstValue(value, ['accountType', 'typeId', 'typeName']), 'other'),
    balance: toMoneyValue(firstValue(value, ['balance', 'currentBalance', 'amount']), 0),
    currency: 'CNY',
    isLiability
  }
}

function normalizeAssetSnapshotRecord(value: unknown, index: number, timestamp: string): AssetSnapshot | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const snapshotDate = toDateString(firstValue(value, ['date', 'snapshotDate', 'createdAt']), today())
  const createdAt = toDateTimeString(firstValue(value, ['createdAt', 'createdTime']), timestamp)
  const accounts = toArray(firstValue(value, ['accounts', 'items']))
    .map((account, accountIndex) => normalizeSnapshotAccount(account, accountIndex))
    .filter((account): account is AccountSnapshotItem => !!account)
  const computedAssets = accounts
    .filter((account) => !account.isLiability)
    .reduce((sum, account) => normalizeMoney(sum + account.balance), 0)
  const computedLiabilities = accounts
    .filter((account) => account.isLiability)
    .reduce((sum, account) => normalizeMoney(sum + account.balance), 0)
  const totalAssets = toMoneyValue(firstValue(value, ['totalAssets', 'assets']), computedAssets)
  const totalLiabilities = toMoneyValue(firstValue(value, ['totalLiabilities', 'liabilities']), computedLiabilities)

  return {
    id: toStringValue(firstValue(value, ['id', 'snapshotId']), getSnapshotId(snapshotDate) || `snapshot_imported_${index + 1}`),
    date: snapshotDate,
    createdAt,
    totalAssets,
    totalLiabilities,
    netAssets: toSignedMoneyValue(firstValue(value, ['netAssets', 'netAsset']), totalAssets - totalLiabilities),
    accounts
  }
}

function normalizeSettings(value: unknown): AppSettings {
  const defaults = createDefaultSettings()
  const source = Array.isArray(value)
    ? value.find((item) => isRecord(item) && item.id === DEFAULT_SETTINGS_ID) ?? value.find(isRecord)
    : value
  const record = isRecord(source) ? source : {}
  const theme = toStringValue(firstValue(record, ['theme', 'colorScheme'])).toLowerCase()
  const amountDecimalPlaces = Math.min(
    2,
    Math.max(0, toIntegerValue(firstValue(record, ['amountDecimalPlaces', 'decimalPlaces', 'decimals']), defaults.amountDecimalPlaces))
  )

  return {
    id: DEFAULT_SETTINGS_ID,
    hideAmount: toBooleanValue(firstValue(record, ['hideAmount', 'amountHidden', 'isAmountHidden']), defaults.hideAmount),
    darkMode: theme ? theme === 'dark' : toBooleanValue(firstValue(record, ['darkMode', 'isDarkMode']), defaults.darkMode),
    amountDecimalPlaces,
    showDeletedAccounts: toBooleanValue(
      firstValue(record, ['showDeletedAccounts', 'showDeleted', 'displayDeletedAccounts']),
      defaults.showDeletedAccounts
    ),
    lastExportDate: toOptionalDateTimeString(firstValue(record, ['lastExportDate', 'lastBackupDate'])),
    createdAt: toDateTimeString(firstValue(record, ['createdAt', 'createdTime']), defaults.createdAt),
    updatedAt: toDateTimeString(firstValue(record, ['updatedAt', 'updatedTime']), defaults.updatedAt)
  }
}

function normalizeBackupPayload(input: LooseBackupPayload): { payload: BackupPayload; warnings: string[] } {
  const timestamp = now()
  const warnings: string[] = []
  const baseTypes = defaultAccountTypes(timestamp)
  const importedTypes = toArray(input.accountTypes)
    .map((accountType, index) => normalizeAccountType(accountType, index, timestamp))
    .filter((accountType): accountType is AccountType => !!accountType)
  const accountTypesMap = new Map(defaultAccountTypes(timestamp).map((accountType) => [accountType.id, accountType]))

  for (const accountType of importedTypes) {
    accountTypesMap.set(accountType.id, accountType)
  }

  const rawAccounts = toArray(input.accounts)
  const accounts = rawAccounts
    .map((account, index) => normalizeAccount(account, index, accountTypesMap, timestamp))
    .filter((account): account is Account => !!account)

  if (rawAccounts.length > 0 && accounts.length === 0) {
    throw new BackupImportError('文件中的账户数据缺少必要信息，未覆盖当前数据')
  }

  if (rawAccounts.length > accounts.length) {
    warnings.push('部分账户数据异常，已自动跳过')
  }

  const accountTypes = ensureAccountTypesForAccounts(
    uniqueById([...baseTypes, ...importedTypes, ...accountTypesMap.values()]),
    accounts,
    timestamp
  )
  const rawHistories = toArray(input.balanceHistory)
  const balanceHistory = rawHistories
    .map((history, index) => normalizeBalanceHistory(history, index, accounts, timestamp))
    .filter((history): history is BalanceHistory => !!history)

  if (rawHistories.length > balanceHistory.length) {
    warnings.push('部分余额历史异常，已自动跳过')
  }

  const rawSnapshots = toArray(input.assetSnapshots)
  let assetSnapshots = rawSnapshots
    .map((snapshot, index) => normalizeAssetSnapshotRecord(snapshot, index, timestamp))
    .filter((snapshot): snapshot is AssetSnapshot => !!snapshot)

  if (rawSnapshots.length > assetSnapshots.length) {
    warnings.push('部分资产快照异常，已自动跳过')
  }

  if (assetSnapshots.length === 0 && accounts.length > 0) {
    assetSnapshots = [buildAssetSnapshot(accounts, today(), timestamp)]
  }

  return {
    payload: {
      accountTypes,
      accounts: uniqueById(accounts),
      balanceHistory: uniqueById(balanceHistory).sort((a, b) => a.changedAt.localeCompare(b.changedAt)),
      assetSnapshots: uniqueById(assetSnapshots).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)),
      settings: normalizeSettings(input.settings)
    },
    warnings
  }
}

function looksLikeLegacyPayload(record: LooseRecord): boolean {
  return ['accountTypes', 'accounts', 'balanceHistory', 'assetSnapshots', 'snapshots', 'histories', 'history'].some((key) =>
    Array.isArray(record[key])
  )
}

function toLoosePayload(record: LooseRecord): LooseBackupPayload {
  return {
    accountTypes: record.accountTypes,
    accounts: record.accounts,
    balanceHistory: record.balanceHistory ?? record.histories ?? record.history,
    assetSnapshots: record.assetSnapshots ?? record.snapshots,
    settings: record.settings
  }
}

function parseMajorVersion(version: string): number {
  const major = Number(version.split('.')[0])
  return Number.isInteger(major) ? major : Number.NaN
}

function extractBackupPayload(data: unknown): {
  loosePayload: LooseBackupPayload
  adaptedLegacy: boolean
  sourceVersion: string
} {
  if (!isRecord(data)) {
    throw new BackupImportError('文件格式无法识别，请选择本应用导出的 JSON 备份文件')
  }

  const schema = toStringValue(data.schema)
  if (schema === BACKUP_SCHEMA) {
    const version = toStringValue(data.version)
    const major = parseMajorVersion(version)
    if (!version || Number.isNaN(major) || !isRecord(data.data)) {
      throw new BackupImportError('文件内容异常或已损坏')
    }

    if (major > SUPPORTED_BACKUP_MAJOR) {
      throw new BackupImportError('暂不支持该版本的数据文件，请先使用较新版本应用导入')
    }

    return {
      loosePayload: toLoosePayload(data.data),
      adaptedLegacy: false,
      sourceVersion: version
    }
  }

  if (isRecord(data.data) && looksLikeLegacyPayload(data.data)) {
    return {
      loosePayload: toLoosePayload(data.data),
      adaptedLegacy: true,
      sourceVersion: toStringValue(data.version, 'legacy')
    }
  }

  if (looksLikeLegacyPayload(data)) {
    return {
      loosePayload: toLoosePayload(data),
      adaptedLegacy: true,
      sourceVersion: toStringValue(data.version, 'legacy')
    }
  }

  throw new BackupImportError('文件格式无法识别，请选择本应用导出的 JSON 备份文件')
}

function normalizeImportData(data: unknown): NormalizedBackup {
  const extracted = extractBackupPayload(data)
  const normalized = normalizeBackupPayload(extracted.loosePayload)

  return {
    payload: normalized.payload,
    adaptedLegacy: extracted.adaptedLegacy,
    sourceVersion: extracted.sourceVersion,
    warnings: normalized.warnings
  }
}

function toImportPreview(normalized: NormalizedBackup): ImportPreview {
  return {
    adaptedLegacy: normalized.adaptedLegacy,
    sourceVersion: normalized.sourceVersion,
    warnings: normalized.warnings,
    summary: {
      accountTypes: normalized.payload.accountTypes.length,
      accounts: normalized.payload.accounts.length,
      balanceHistory: normalized.payload.balanceHistory.length,
      assetSnapshots: normalized.payload.assetSnapshots.length
    }
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
  await db.accountTypes.bulkPut(defaultAccountTypes(timestamp))
  await db.settings.put(createDefaultSettings())
}

export function inspectImportData(data: unknown): ImportPreview {
  return toImportPreview(normalizeImportData(data))
}

export async function exportData(): Promise<ExportData> {
  const [accountTypes, accounts, balanceHistory, assetSnapshots, settings] = await Promise.all([
    db.accountTypes.toArray(),
    db.accounts.toArray(),
    db.balanceHistory.toArray(),
    db.assetSnapshots.toArray(),
    db.settings.toArray()
  ])
  const normalized = normalizeBackupPayload({
    accountTypes,
    accounts,
    balanceHistory,
    assetSnapshots,
    settings
  })

  return {
    app: BACKUP_APP_ID,
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    appVersion: APP_VERSION,
    exportedAt: now(),
    data: normalized.payload
  }
}

export async function importData(data: unknown): Promise<ImportResult> {
  const normalized = normalizeImportData(data)

  await db.transaction('rw', [db.accountTypes, db.accounts, db.balanceHistory, db.assetSnapshots, db.settings], async () => {
    await db.accountTypes.clear()
    await db.accounts.clear()
    await db.balanceHistory.clear()
    await db.assetSnapshots.clear()
    await db.settings.clear()

    await db.accountTypes.bulkPut(normalized.payload.accountTypes)
    await db.accounts.bulkPut(normalized.payload.accounts)
    await db.balanceHistory.bulkPut(normalized.payload.balanceHistory)
    await db.assetSnapshots.bulkPut(normalized.payload.assetSnapshots)
    await db.settings.put(normalized.payload.settings)
  })

  return {
    ...toImportPreview(normalized),
    importedAt: now()
  }
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

export async function exportSnapshotCSV(): Promise<string> {
  const snapshots = await db.assetSnapshots.orderBy('date').toArray()
  const header = ['\u65E5\u671F', '\u603B\u8D44\u4EA7', '\u603B\u8D1F\u503A', '\u51C0\u8D44\u4EA7', '\u8D26\u6237\u6570', '\u8D26\u6237\u660E\u7EC6']
  const rows = snapshots.map((snapshot) => {
    const accountDetails = snapshot.accounts
      .map((item) => `${item.accountName}:${item.isLiability ? '-' : ''}${item.balance}`)
      .join('; ')

    return [
      snapshot.date,
      snapshot.totalAssets,
      snapshot.totalLiabilities,
      snapshot.netAssets,
      snapshot.accounts.length,
      accountDetails
    ].map(escapeCsv)
  })

  return `\uFEFF${[header.map(escapeCsv), ...rows].map((row) => row.join(',')).join('\n')}`
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.accountTypes, db.accounts, db.balanceHistory, db.assetSnapshots, db.settings], async () => {
    await db.accountTypes.clear()
    await db.accounts.clear()
    await db.balanceHistory.clear()
    await db.assetSnapshots.clear()
    await db.settings.clear()
    await seedDefaults()
  })
}
