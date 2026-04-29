import type { Component } from 'vue'
import {
  Banknote,
  Building2,
  Car,
  CreditCard,
  BadgeDollarSign,
  Home,
  Landmark,
  LineChart,
  Package,
  ReceiptText,
  TrendingUp,
  Wallet
} from 'lucide-vue-next'
import type { AccountCategory, AccountType } from '../types/account'
import { getDefaultIconKey } from '../constants/accountIcons'

export interface AccountIconSource {
  typeId?: string
  typeName?: string
  category?: AccountCategory
  groupName?: string
  icon?: string
}

const iconByKey: Record<string, Component> = {
  cash: Banknote,
  banknote: Banknote,
  bank_card: Landmark,
  landmark: Landmark,
  alipay: Wallet,
  wechat: Wallet,
  fund: LineChart,
  stock: TrendingUp,
  line_chart: LineChart,
  trending_up: TrendingUp,
  deposit: Landmark,
  credit_card: CreditCard,
  huabei: ReceiptText,
  receipt_text: ReceiptText,
  mortgage: Home,
  car_loan: Car,
  other_asset: Package,
  other_liability: ReceiptText,
  receivable: BadgeDollarSign,
  wallet: Wallet,
  building: Building2
}

export function getAccountIcon(source: AccountIconSource): Component {
  if (source.icon && iconByKey[source.icon]) {
    return iconByKey[source.icon]
  }

  if (source.typeId && iconByKey[source.typeId]) {
    return iconByKey[source.typeId]
  }

  if (source.category === 'LIABILITY') {
    return source.groupName === '贷款' ? ReceiptText : CreditCard
  }

  if (source.groupName === '投资') {
    return LineChart
  }

  if (source.groupName === '现金') {
    return Landmark
  }

  return Wallet
}

export function getAccountTypeIcon(accountType: AccountType): Component {
  return getAccountIcon(accountType)
}

export function resolveAccountIconName(source: AccountIconSource): string {
  if (source.icon && source.icon.startsWith('fluent-emoji-flat:')) {
    return source.icon
  }

  if (source.icon && iconByKey[source.icon]) {
    const defaultKey = source.typeId ?? source.icon
    return `fluent-emoji-flat:${getDefaultIconKey(defaultKey)}`
  }

  if (source.typeId) {
    return `fluent-emoji-flat:${getDefaultIconKey(source.typeId)}`
  }

  return 'fluent-emoji-flat:money-bag'
}
