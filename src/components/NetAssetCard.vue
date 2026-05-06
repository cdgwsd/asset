<template>
  <section class="net-card">
    <div class="eyebrow icon-label">
      <AppIcon :icon="BadgeDollarSign" :size="18" />
      <span>净资产</span>
    </div>
    <div ref="amountRowRef" class="net-amount-row">
      <strong ref="amountRef" class="net-amount" :style="{ fontSize: `${amountFontSize}px` }">{{ netAssetText }}</strong>
      <button class="eye-button" type="button" :aria-label="hideAmount ? '显示金额' : '隐藏金额'" @click="$emit('toggle-hide')">
        <AppIcon :icon="hideAmount ? EyeOff : Eye" :size="22" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BadgeDollarSign, Eye, EyeOff } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'
import { formatMoney } from '../utils/money'

const BASE_AMOUNT_FONT_SIZE = 38
const COMPACT_AMOUNT_FONT_SIZE = 34
const MIN_AMOUNT_FONT_SIZE = 26
const EYE_BUTTON_SPACE = 50

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

const amountRowRef = ref<HTMLDivElement | null>(null)
const amountRef = ref<HTMLElement | null>(null)
const amountFontSize = ref(BASE_AMOUNT_FONT_SIZE)
let resizeObserver: ResizeObserver | undefined
let frameId: number | undefined

function preferredFontSize() {
  const rowWidth = amountRowRef.value?.clientWidth ?? 0
  return rowWidth > 0 && rowWidth < 320 ? COMPACT_AMOUNT_FONT_SIZE : BASE_AMOUNT_FONT_SIZE
}

async function fitAmountToRow() {
  const rowElement = amountRowRef.value
  const amountElement = amountRef.value
  if (!rowElement || !amountElement) {
    return
  }

  const baseFontSize = preferredFontSize()
  amountFontSize.value = baseFontSize
  await nextTick()

  const availableWidth = Math.max(0, rowElement.clientWidth - EYE_BUTTON_SPACE)
  if (availableWidth === 0) {
    return
  }

  const amountWidth = amountElement.scrollWidth
  amountFontSize.value =
    amountWidth > availableWidth
      ? Math.max(MIN_AMOUNT_FONT_SIZE, Math.floor((baseFontSize * availableWidth) / amountWidth))
      : baseFontSize
}

function scheduleAmountFit() {
  if (frameId !== undefined) {
    window.cancelAnimationFrame(frameId)
  }

  frameId = window.requestAnimationFrame(() => {
    frameId = undefined
    void fitAmountToRow()
  })
}

watch(netAssetText, scheduleAmountFit)

onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleAmountFit)
  if (amountRowRef.value) {
    resizeObserver.observe(amountRowRef.value)
  }
  scheduleAmountFit()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (frameId !== undefined) {
    window.cancelAnimationFrame(frameId)
  }
})
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
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.net-amount {
  min-width: 0;
  overflow: hidden;
  font-size: 38px;
  font-weight: 760;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 360px) {
  .net-card {
    padding: 24px 14px 22px;
  }
}
</style>
