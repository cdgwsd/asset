<template>
  <button class="account-row" :class="{ deleted: account.isDeleted }" type="button" @click="$emit('select', account.accountId)">
    <span class="account-icon" aria-hidden="true">{{ account.icon || '💼' }}</span>
    <span class="account-name">
      {{ account.name }}
      <small v-if="account.isDeleted">已删除</small>
    </span>
    <span class="account-balance">{{ balanceText }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AccountRowView } from '../types/summary'
import { formatAccountBalance } from '../utils/money'

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
</script>
