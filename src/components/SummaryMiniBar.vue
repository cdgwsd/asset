<template>
  <section class="summary-bar" aria-label="资产概要">
    <div>
      <span>总资产</span>
      <strong>{{ totalAssetText }}</strong>
    </div>
    <div>
      <span>总负债</span>
      <strong>{{ totalLiabilityText }}</strong>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
