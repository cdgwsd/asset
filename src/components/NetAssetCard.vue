<template>
  <section class="net-card">
    <div class="eyebrow icon-label">
      <AppIcon :icon="BadgeDollarSign" :size="18" />
      <span>净资产</span>
    </div>
    <div class="net-amount-row">
      <strong class="net-amount">{{ netAssetText }}</strong>
      <button class="eye-button" type="button" :aria-label="hideAmount ? '显示金额' : '隐藏金额'" @click="$emit('toggle-hide')">
        <AppIcon :icon="hideAmount ? EyeOff : Eye" :size="22" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BadgeDollarSign, Eye, EyeOff } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'
import { formatMoney } from '../utils/money'

const props = defineProps<{
  netAsset: number
  hideAmount: boolean
  decimals: number
}>()

defineEmits<{
  'toggle-hide': []
}>()

const netAssetText = computed(() =>
  formatMoney(Math.abs(props.netAsset), {
    hide: props.hideAmount,
    decimals: props.decimals,
    negative: props.netAsset < 0
  })
)
</script>

<style scoped>
.net-card {
  display: grid;
  gap: 12px;
  margin: 6px 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  padding: 28px 18px 24px;
  text-align: center;
}

.net-card .eyebrow {
  justify-content: center;
  margin: 0;
}

.net-amount-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.net-amount {
  overflow-wrap: anywhere;
  font-size: 44px;
  font-weight: 760;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  line-height: 1.05;
}

@media (max-width: 360px) {
  .net-card {
    padding: 24px 14px 22px;
  }

  .net-amount {
    font-size: 38px;
  }
}
</style>
