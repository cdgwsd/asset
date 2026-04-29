import type { AccountType } from '../types/account'

export const APP_VERSION = '1.0.0'
export const DEFAULT_GROUPS = ['现金', '投资', '信用', '贷款', '其他'] as const

export const defaultAccountTypeSeeds: Array<Omit<AccountType, 'createdAt' | 'updatedAt'>> = [
  {
    id: 'cash',
    name: '现金',
    category: 'ASSET',
    groupName: '现金',
    icon: 'banknote',
    sortOrder: 10,
    isSystem: true
  },
  {
    id: 'bank_card',
    name: '银行卡',
    category: 'ASSET',
    groupName: '现金',
    icon: 'landmark',
    sortOrder: 20,
    isSystem: true
  },
  {
    id: 'alipay',
    name: '支付宝',
    category: 'ASSET',
    groupName: '现金',
    icon: 'wallet',
    sortOrder: 30,
    isSystem: true
  },
  {
    id: 'wechat',
    name: '微信',
    category: 'ASSET',
    groupName: '现金',
    icon: 'wallet',
    sortOrder: 40,
    isSystem: true
  },
  {
    id: 'fund',
    name: '基金账户',
    category: 'ASSET',
    groupName: '投资',
    icon: 'line_chart',
    sortOrder: 50,
    isSystem: true
  },
  {
    id: 'stock',
    name: '证券账户',
    category: 'ASSET',
    groupName: '投资',
    icon: 'trending_up',
    sortOrder: 60,
    isSystem: true
  },
  {
    id: 'deposit',
    name: '定期存款',
    category: 'ASSET',
    groupName: '现金',
    icon: 'landmark',
    sortOrder: 70,
    isSystem: true
  },
  {
    id: 'credit_card',
    name: '信用卡',
    category: 'LIABILITY',
    groupName: '信用',
    icon: 'credit_card',
    sortOrder: 80,
    isSystem: true
  },
  {
    id: 'huabei',
    name: '花呗 / 白条',
    category: 'LIABILITY',
    groupName: '信用',
    icon: 'receipt_text',
    sortOrder: 90,
    isSystem: true
  },
  {
    id: 'mortgage',
    name: '房贷',
    category: 'LIABILITY',
    groupName: '贷款',
    icon: 'mortgage',
    sortOrder: 100,
    isSystem: true
  },
  {
    id: 'car_loan',
    name: '车贷',
    category: 'LIABILITY',
    groupName: '贷款',
    icon: 'car_loan',
    sortOrder: 110,
    isSystem: true
  },
  {
    id: 'other_asset',
    name: '其他资产',
    category: 'ASSET',
    groupName: '其他',
    icon: 'other_asset',
    sortOrder: 900,
    isSystem: true
  },
  {
    id: 'other_liability',
    name: '其他负债',
    category: 'LIABILITY',
    groupName: '其他',
    icon: 'other_liability',
    sortOrder: 910,
    isSystem: true
  }
]
