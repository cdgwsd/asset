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
    <p v-if="showBreakdown" class="net-breakdown">
      总资产 {{ totalAssetText }} − 总负债 {{ totalLiabilityText }}
    </p>
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
  totalAsset?: number
  totalLiability?: number
}>()

defineEmits<{
  'toggle-hide': []
}>()

const showBreakdown = computed(() =>
  props.totalAsset !== undefined && props.totalLiability !== undefined
)

const netAssetText = computed(() =>
  formatMoney(Math.abs(props.netAsset), {
    hide: props.hideAmount,
    decimals: props.decimals,
    negative: props.netAsset < 0
  })
)

const totalAssetText = computed(() =>
  formatMoney(props.totalAsset ?? 0, {
    hide: props.hideAmount,
    decimals: props.decimals
  })
)

const totalLiabilityText = computed(() =>
  formatMoney(props.totalLiability ?? 0, {
    hide: props.hideAmount,
    decimals: props.decimals,
    negative: (props.totalLiability ?? 0) > 0
  })
)
</script>

<style scoped>
.net-card {
  padding: 30px 4px 20px;
  text-align: center;
}

.net-amount-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.net-amount {
  font-size: clamp(34px, 11vw, 48px);
  font-weight: 760;
  letter-spacing: -0.05em;
  line-height: 1.05;
}

.net-breakdown {
  margin: 10px 0 0;
  color: var(--color-faint);
  font-size: 13px;
  font-weight: 500;
}
</style>
