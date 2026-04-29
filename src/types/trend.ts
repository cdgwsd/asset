export type TrendRange = 'LAST_7' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'ALL'

export interface NetAssetTrendPoint {
  date: string
  totalAsset: number
  totalLiability: number
  netAsset: number
}

export interface AccountTrendPoint {
  dateTime: string
  balance: number
}
