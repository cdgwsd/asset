export interface AccountIconChoice {
  key: string
  icon: string
  label: string
}

export const accountIconChoices: AccountIconChoice[] = [
  { key: 'money-bag', icon: 'fluent-emoji-flat:money-bag', label: '现金' },
  { key: 'bank', icon: 'fluent-emoji-flat:bank', label: '银行' },
  { key: 'credit-card', icon: 'fluent-emoji-flat:credit-card', label: '信用卡' },
  { key: 'yen-banknote', icon: 'fluent-emoji-flat:yen-banknote', label: '储蓄卡' },
  { key: 'coin', icon: 'fluent-emoji-flat:coin', label: '存款' },
  { key: 'money-with-wings', icon: 'fluent-emoji-flat:money-with-wings', label: '基金' },
  { key: 'chart-increasing', icon: 'fluent-emoji-flat:chart-increasing', label: '股票' },
  { key: 'briefcase', icon: 'fluent-emoji-flat:briefcase', label: '证券' },
  { key: 'house', icon: 'fluent-emoji-flat:house', label: '房产' },
  { key: 'automobile', icon: 'fluent-emoji-flat:automobile', label: '车辆' },
  { key: 'gem-stone', icon: 'fluent-emoji-flat:gem-stone', label: '资产' },
  { key: 'handshake', icon: 'fluent-emoji-flat:handshake', label: '借贷' },
  { key: 'receipt', icon: 'fluent-emoji-flat:receipt', label: '负债' },
  { key: 'package', icon: 'fluent-emoji-flat:package', label: '其他' },
]

export function getAccountIconChoice(key: string): AccountIconChoice {
  return accountIconChoices.find((c) => c.key === key) ?? accountIconChoices[0]
}

export function getDefaultIconKey(typeId: string): string {
  const map: Record<string, string> = {
    cash: 'money-bag',
    bank_card: 'bank',
    credit_card: 'credit-card',
    alipay: 'money-bag',
    wechat: 'money-bag',
    fund: 'money-with-wings',
    stock: 'chart-increasing',
    deposit: 'coin',
    huabei: 'credit-card',
    mortgage: 'house',
    car_loan: 'automobile',
    other_asset: 'gem-stone',
    other_liability: 'receipt',
  }

  return map[typeId] ?? 'money-bag'
}
