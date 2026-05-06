<template>
  <section class="summary-bar" aria-label="资产概要">
    <div>
      <span class="icon-label">
        <AppIcon :icon="Wallet" :size="17" />
        总资产
      </span>
      <strong>{{ totalAssetText }}</strong>
    </div>
    <div>
      <span class="icon-label">
        <AppIcon :icon="CreditCard" :size="17" />
        总负债
      </span>
      <strong>{{ totalLiabilityText }}</strong>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CreditCard, Wallet } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'
import { formatMoney } from '../utils/money'

const props = defineProps<{
  totalAsset: number
  totalLiability: number
  hideAmount: boolean
  decimals: number
}>()

const totalAssetText = computed(() =>
  formatMoney(props.totalAsset, {
    hide: props.hideAmount,
    decimals: props.decimals
  })
)

const totalLiabilityText = computed(() =>
  formatMoney(props.totalLiability, {
    hide: props.hideAmount,
    decimals: props.decimals,
    negative: props.totalLiability > 0
  })
)
</script>

<style scoped>
.summary-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0 0 12px;
}

.summary-bar div {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: 14px 15px;
}

.summary-bar span {
  display: block;
  margin-bottom: 6px;
  color: var(--color-muted);
  font-size: 12px;
}

.summary-bar strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}
</style>
