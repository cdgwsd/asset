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
