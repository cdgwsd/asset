<template>
  <section class="net-card">
    <div class="eyebrow">净资产</div>
    <div class="net-amount-row">
      <strong class="net-amount">{{ netAssetText }}</strong>
      <button class="eye-button" type="button" :aria-label="hideAmount ? '显示金额' : '隐藏金额'" @click="$emit('toggle-hide')">
        {{ hideAmount ? '🙈' : '👁' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
