import { DEFAULT_GROUPS } from '../db/defaults'
import { getAccounts } from '../repositories/accountRepo'
import type { Account } from '../types/account'
import type { AccountGroupView, AccountRowView, HomeSummary } from '../types/summary'
import { formatAccountBalance, normalizeMoney } from '../utils/money'

const groupOrder = new Map<string, number>(DEFAULT_GROUPS.map((groupName, index) => [groupName, index]))

function compareGroupName(a: string, b: string): number {
  return (groupOrder.get(a) ?? 999) - (groupOrder.get(b) ?? 999) || a.localeCompare(b, 'zh-CN')
}

function toSignedBalance(account: Account): number {
  return account.category === 'LIABILITY' ? -account.currentBalance : account.currentBalance
}

export async function getHomeSummary(options: { showDeleted?: boolean } = {}): Promise<HomeSummary> {
  const accounts = await getAccounts({ includeDeleted: options.showDeleted })
  let totalAsset = 0
  let totalLiability = 0
  const groups = new Map<string, AccountGroupView>()

  for (const account of accounts) {
    if (!options.showDeleted && (!account.isActive || account.isDeleted)) {
      continue
    }

    if (account.category === 'ASSET') {
      totalAsset = normalizeMoney(totalAsset + account.currentBalance)
    } else {
      totalLiability = normalizeMoney(totalLiability + account.currentBalance)
    }

    const currentGroup =
      groups.get(account.groupName) ??
      ({
        groupName: account.groupName,
        totalAmount: 0,
        accounts: []
      } satisfies AccountGroupView)

    const signedBalance = toSignedBalance(account)
    const row: AccountRowView = {
      accountId: account.id,
      name: account.name,
      icon: account.icon,
      category: account.category,
      balance: account.currentBalance,
      displayBalance: formatAccountBalance(account.currentBalance, account.category),
      updatedAt: account.updatedAt,
      sortOrder: account.sortOrder,
      isDeleted: account.isDeleted
    }

    currentGroup.totalAmount = normalizeMoney(currentGroup.totalAmount + signedBalance)
    currentGroup.accounts.push(row)
    groups.set(account.groupName, currentGroup)
  }

  const sortedGroups = [...groups.values()]
    .map((group) => ({
      ...group,
      accounts: group.accounts.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'))
    }))
    .sort((a, b) => compareGroupName(a.groupName, b.groupName))

  return {
    totalAsset,
    totalLiability,
    netAsset: normalizeMoney(totalAsset - totalLiability),
    groups: sortedGroups
  }
}
