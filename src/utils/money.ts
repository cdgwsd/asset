import type { AccountCategory } from '../types/account'

export function normalizeMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function parseMoneyInput(value: string): number | null {
  const normalized = value.trim().replace(/,/g, '')
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return normalizeMoney(parsed)
}

export function formatMoneyInput(value: string): string {
  const normalized = value.replace(/[^\d.]/g, '')
  const [integer = '', ...decimalParts] = normalized.split('.')
  const decimal = decimalParts.join('').slice(0, 2)
  const formattedInteger = integer.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  if (decimalParts.length === 0) {
    return formattedInteger || '0'
  }

  return `${formattedInteger || '0'}.${decimal}`
}

export function unformatMoneyInput(value: string): string {
  return value.replace(/,/g, '')
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
  if (options.hide) {
    return options.negative ? '-¥**,***.**' : '¥**,***.**'
  }

  const sign = options.negative ? '-' : ''
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
    negative: category === 'LIABILITY'
  })
}
