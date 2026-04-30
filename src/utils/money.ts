import type { AccountCategory } from '../types/account'

export const MONEY_AMOUNT_LIMIT = 100_000_000

export function normalizeMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function isMoneyWithinLimit(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= MONEY_AMOUNT_LIMIT
}

export function assertMoneyWithinLimit(value: number, message = '金额不能超过 1 亿'): number {
  const normalized = normalizeMoney(value)
  if (!isMoneyWithinLimit(normalized)) {
    throw new Error(message)
  }

  return normalized
}

function toMoneyInputDraft(value: string): string {
  const trimmed = value.trim()
  const negative = trimmed.startsWith('-')
  const cleaned = trimmed.replace(/[,，\s¥￥]/g, '').replace(/[^\d.-]/g, '')
  const unsigned = cleaned.replace(/-/g, '')
  const [integer = '', ...decimalParts] = unsigned.split('.')
  const decimal = decimalParts.join('').slice(0, 2)
  const hasDecimal = decimalParts.length > 0
  const prefix = negative ? '-' : ''

  if (!integer && !hasDecimal) {
    return negative ? '-' : ''
  }

  if (hasDecimal) {
    return `${prefix}${integer || '0'}.${decimal}`
  }

  return `${prefix}${integer}`
}

function parseMoneyDraft(value: string): number | null {
  if (!value || value === '-') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function isMoneyInputDraftAllowed(value: string): boolean {
  const draft = toMoneyInputDraft(value)
  if (draft !== value) {
    return false
  }

  const parsed = parseMoneyDraft(draft)
  return parsed === null ? draft === '' || draft === '-' : isMoneyWithinLimit(parsed)
}

export function normalizeMoneyInputDraft(value: string, fallback = ''): string {
  const draft = toMoneyInputDraft(value)
  const parsed = parseMoneyDraft(draft)

  if (parsed === null) {
    return draft === '' || draft === '-' ? draft : fallback
  }

  return isMoneyWithinLimit(parsed) ? draft : fallback
}

export function applyMoneyInputChange(
  value: string,
  selectionStart: number | null,
  selectionEnd: number | null,
  insertedText: string
): string {
  const start = selectionStart ?? value.length
  const end = selectionEnd ?? start
  return `${value.slice(0, start)}${insertedText}${value.slice(end)}`
}

export function parseMoneyInput(value: string): number | null {
  const normalized = normalizeMoneyInputDraft(value)
  if (!normalized || normalized === '-') {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || !isMoneyWithinLimit(parsed)) {
    return null
  }

  return normalizeMoney(parsed)
}

export function formatMoneyInput(value: string): string {
  const normalized = normalizeMoneyInputDraft(value)
  if (!normalized || normalized === '-') {
    return '0'
  }

  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized
  const [integer = '', ...decimalParts] = unsigned.split('.')
  const decimal = decimalParts.join('').slice(0, 2)
  const formattedInteger = integer.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const prefix = negative && Number(unsigned) !== 0 ? '-' : ''

  if (decimalParts.length === 0) {
    return `${prefix}${formattedInteger || '0'}`
  }

  return `${prefix}${formattedInteger || '0'}.${decimal}`
}

export function unformatMoneyInput(value: string): string {
  return normalizeMoneyInputDraft(value.replace(/,/g, ''))
}

export function formatMoney(
  value: number,
  options: {
    hide?: boolean
    decimals?: number
    negative?: boolean
  } = {}
): string {
  const decimals = options.decimals ?? 2
  const shouldShowNegative = options.negative === true || (options.negative !== false && value < 0)
  if (options.hide) {
    return shouldShowNegative ? '-¥**,***.**' : '¥**,***.**'
  }

  const sign = shouldShowNegative ? '-' : ''
  const amount = Math.abs(value).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })

  return `${sign}¥${amount}`
}

export function formatAccountBalance(
  balance: number,
  category: AccountCategory,
  options: { hide?: boolean; decimals?: number } = {}
): string {
  return formatMoney(balance, {
    hide: options.hide,
    decimals: options.decimals,
    negative: category === 'LIABILITY' || balance < 0
  })
}
