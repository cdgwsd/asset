<template>
  <section class="account-group">
    <div class="group-heading">
      <span>{{ group.groupName }}</span>
      <strong>{{ groupTotalText }}</strong>
    </div>
    <div class="account-list">
      <AccountRow
        v-for="account in group.accounts"
        :key="account.accountId"
        :account="account"
        :hide-amount="hideAmount"
        :decimals="decimals"
        :expanded="expandedAccountId === account.accountId"
        @quick-update="$emit('quick-update', $event)"
        @edit="$emit('edit-account', $event)"
        @open-actions="$emit('open-actions', $event)"
        @close-actions="$emit('close-actions')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AccountRow from './AccountRow.vue'
import type { AccountGroupView } from '../types/summary'
import { formatMoney } from '../utils/money'


const props = defineProps<{
  group: AccountGroupView
  hideAmount: boolean
  decimals: number
  expandedAccountId: string | null
}>()

defineEmits<{
  'quick-update': [accountId: string]
  'edit-account': [accountId: string]
  'open-actions': [accountId: string]
  'close-actions': []
}>()

const groupTotalText = computed(() =>
  formatMoney(Math.abs(props.group.totalAmount), {
    hide: props.hideAmount,
    decimals: props.decimals,
    negative: props.group.totalAmount < 0
  })
)
</script>

<style scoped>
.account-group {
  display: grid;
  gap: 8px;
}

.group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 700;
}

.group-heading strong {
  color: var(--color-faint);
  font-weight: 650;
}

.account-list {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.account-list :deep(.account-swipe:last-child .account-row) {
  border-bottom: 0;
}
</style>
