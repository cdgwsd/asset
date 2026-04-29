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
        @select="$emit('select-account', $event)"
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
}>()

defineEmits<{
  'select-account': [accountId: string]
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

.account-list .account-row:last-child {
  border-bottom: 0;
}
</style>
