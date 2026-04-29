<template>
  <button class="account-row" :class="{ deleted: account.isDeleted }" type="button" @click="$emit('select', account.accountId)">
    <span class="account-icon" aria-hidden="true">
      <img v-if="customSvgUrl" :src="customSvgUrl" width="30" height="30" alt="" />
      <AppIcon v-else-if="account.icon?.startsWith('fluent-emoji-flat:')" :iconify="account.icon" :size="24" />
      <AppIcon v-else-if="accountIconName.startsWith('fluent-emoji-flat:')" :iconify="accountIconName" :size="24" />
      <AppIcon v-else :icon="accountIcon" :size="18" />
    </span>
    <span class="account-name">
      {{ account.name }}
      <small v-if="account.isDeleted">已删除</small>
    </span>
    <span class="account-balance">{{ balanceText }}</span>
    <AppIcon class="account-chevron" :icon="ChevronRight" :size="18" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'
import type { AccountRowView } from '../types/summary'
import { getAccountIcon, resolveAccountIconName } from '../utils/accountIcon'
import { formatAccountBalance } from '../utils/money'
import { getSvgIconUrl } from '../utils/svgIcons'

const props = defineProps<{
  account: AccountRowView
  hideAmount: boolean
  decimals: number
}>()

defineEmits<{
  select: [accountId: string]
}>()

const balanceText = computed(() =>
  formatAccountBalance(props.account.balance, props.account.category, {
    hide: props.hideAmount,
    decimals: props.decimals
  })
)

const customSvgUrl = computed(() => {
  if (props.account.icon?.endsWith('.svg')) {
    return getSvgIconUrl(props.account.icon)
  }

  return undefined
})

const accountIcon = computed(() => getAccountIcon(props.account))
const accountIconName = computed(() => resolveAccountIconName(props.account))
</script>

<style scoped>
.account-row {
  display: grid;
  width: 100%;
  min-height: 58px;
  grid-template-columns: 40px minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 8px;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  padding: 0 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.account-row:active {
  background: var(--color-surface-strong);
}

.account-row.deleted {
  opacity: 0.55;
}

.account-name {
  display: grid;
  gap: 2px;
  font-size: 16px;
  font-weight: 600;
}

.account-name small {
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 500;
}

.account-balance {
  padding-right: 0;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
  text-align: right;
  white-space: nowrap;
}

.account-chevron {
  color: var(--color-faint);
}
</style>
