import type { Component } from 'vue'
import {
  BadgeDollarSign,
  Banknote,
  CreditCard,
  Landmark,
  LineChart,
  ReceiptText,
  Wallet
} from 'lucide-vue-next'
import type { AccountCategory } from '../types/account'

export type AccountTypeChoiceKey =
  | 'cash'
  | 'credit'
  | 'investment'
  | 'saving'
  | 'liability'
  | 'receivable'
  | 'other'
  | 'custom'

export interface AccountTypeChoice {
  key: AccountTypeChoiceKey
  label: string
  description: string
  typeId: string
  defaultName: string
  category: AccountCategory
  groupName: string
  iconKey: string
  icon: Component
  iconifyName: string
}

export const accountTypeChoices: AccountTypeChoice[] = [
  {
    key: 'cash',
    label: '现金账户',
    description: '如现金、支付宝余额、微信钱包等',
    typeId: 'cash',
    defaultName: '现金账户',
    category: 'ASSET',
    groupName: '现金',
    iconKey: 'banknote',
    icon: Banknote,
    iconifyName: 'fluent-emoji-flat:money-bag'
  },
  {
    key: 'credit',
    label: '信用账户',
    description: '用于透支的信用账户，比如信用卡、花呗等',
    typeId: 'credit_card',
    defaultName: '信用账户',
    category: 'LIABILITY',
    groupName: '信用',
    iconKey: 'credit_card',
    icon: CreditCard,
    iconifyName: 'fluent-emoji-flat:credit-card'
  },
  {
    key: 'investment',
    label: '投资账户',
    description: '用于管理资产，比如股票、基金等',
    typeId: 'fund',
    defaultName: '投资账户',
    category: 'ASSET',
    groupName: '投资',
    iconKey: 'line_chart',
    icon: LineChart,
    iconifyName: 'fluent-emoji-flat:chart-increasing'
  },
  {
    key: 'saving',
    label: '储蓄账户',
    description: '如活期账户、储蓄卡、存折、借记卡',
    typeId: 'bank_card',
    defaultName: '储蓄账户',
    category: 'ASSET',
    groupName: '现金',
    iconKey: 'landmark',
    icon: Landmark,
    iconifyName: 'fluent-emoji-flat:bank'
  },
  {
    key: 'liability',
    label: '负债',
    description: '车贷、房贷、个人借款等',
    typeId: 'other_liability',
    defaultName: '负债',
    category: 'LIABILITY',
    groupName: '贷款',
    iconKey: 'receipt_text',
    icon: ReceiptText,
    iconifyName: 'fluent-emoji-flat:receipt'
  },
  {
    key: 'receivable',
    label: '债权',
    description: '借给亲友、银行定期存单、国债等',
    typeId: 'other_asset',
    defaultName: '债权',
    category: 'ASSET',
    groupName: '其他',
    iconKey: 'receivable',
    icon: BadgeDollarSign,
    iconifyName: 'fluent-emoji-flat:handshake'
  },
  {
    key: 'other',
    label: '其他账户',
    description: '其他或不常用账户，比如储值卡、公积金等',
    typeId: 'other_asset',
    defaultName: '其他账户',
    category: 'ASSET',
    groupName: '其他',
    iconKey: 'wallet',
    icon: Wallet,
    iconifyName: 'fluent-emoji-flat:package'
  },
  {
    key: 'custom',
    label: '自定义类型',
    description: '创建你自己的账户类型，如公积金、储值卡等',
    typeId: '',
    defaultName: '自定义账户',
    category: 'ASSET',
    groupName: '其他',
    iconKey: 'wallet',
    icon: Wallet,
    iconifyName: 'fluent-emoji-flat:gem-stone'
  }
]

export function getAccountTypeChoice(key: AccountTypeChoiceKey): AccountTypeChoice {
  return accountTypeChoices.find((choice) => choice.key === key) ?? accountTypeChoices[0]
}
