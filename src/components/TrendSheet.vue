<template>
  <BottomSheet
    panel-class="trend-panel"
    labelledby="trend-title"
    :hide-overlay="hideOverlay"
    :closing="closing"
    @close="$emit('close')"
    @after-close="$emit('after-close')"
  >
      <header class="sheet-header">
        <div>
          <p class="sheet-kicker icon-label">
            <AppIcon :icon="LineChart" :size="16" />
            净资产趋势
          </p>
          <h2 id="trend-title">月度净资产</h2>
        </div>
      </header>

      <section v-if="netTrend.length > 0" class="trend-summary" aria-label="净资产月度概览">
        <div class="trend-stat">
          <span>最新净资产</span>
          <strong>{{ latestNetAssetText }}</strong>
        </div>
        <div class="trend-stat trend-change" :class="changeClass">
          <span>较上月</span>
          <strong>{{ monthlyChangeText }}</strong>
        </div>
      </section>

      <section class="trend-chart-section">
        <div v-show="netTrend.length > 0" ref="netChartRef" class="chart"></div>
        <p v-if="netTrend.length === 0" class="empty-chart icon-label">
          <AppIcon :icon="ChartNoAxesColumn" :size="17" />
          暂无趋势数据，更新余额后会自动生成。
        </p>
        <p v-else-if="netTrend.length < 2" class="chart-hint icon-label">
          <AppIcon :icon="ChartNoAxesColumn" :size="17" />
          再积累一个月后，就能看到月度变化。
        </p>
      </section>
  </BottomSheet>
</template>

<script setup lang="ts">
import { LineChart as EChartsLineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { type ECharts, init, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ChartNoAxesColumn, LineChart } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import BottomSheet from './BottomSheet.vue'
import { getNetAssetTrend } from '../services/trendService'
import type { NetAssetTrendPoint } from '../types/trend'
import { formatMoney } from '../utils/money'

const props = withDefaults(
  defineProps<{
    hideAmount: boolean
    decimals: number
    hideOverlay?: boolean
    closing?: boolean
  }>(),
  {
    hideOverlay: false,
    closing: false
  }
)

defineEmits<{
  close: []
  'after-close': []
}>()

const netTrend = ref<NetAssetTrendPoint[]>([])
const netChartRef = ref<HTMLDivElement | null>(null)
use([GridComponent, TooltipComponent, EChartsLineChart, CanvasRenderer])

const latestPoint = computed(() => netTrend.value[netTrend.value.length - 1])
const previousPoint = computed(() => (netTrend.value.length >= 2 ? netTrend.value[netTrend.value.length - 2] : undefined))
const hasPreviousMonth = computed(() => !!previousPoint.value)
const monthlyDelta = computed(() => {
  if (!latestPoint.value || !previousPoint.value) {
    return 0
  }

  return latestPoint.value.netAsset - previousPoint.value.netAsset
})
const latestNetAssetText = computed(() => moneyLabel(latestPoint.value?.netAsset ?? 0))
const monthlyChangeText = computed(() => (hasPreviousMonth.value ? moneyLabel(monthlyDelta.value) : '暂无'))
const changeClass = computed(() => ({
  positive: hasPreviousMonth.value && monthlyDelta.value > 0,
  negative: hasPreviousMonth.value && monthlyDelta.value < 0,
  flat: !hasPreviousMonth.value || monthlyDelta.value === 0
}))

let netChart: ECharts | null = null

function moneyLabel(value: number) {
  return formatMoney(Math.abs(value), {
    hide: props.hideAmount,
    decimals: props.decimals,
    negative: value < 0
  })
}

function shortMoneyLabel(value: number) {
  if (props.hideAmount) {
    return '***'
  }

  const sign = value < 0 ? '-' : ''
  const absoluteValue = Math.abs(value)
  if (absoluteValue >= 10000) {
    const amount = absoluteValue / 10000
    return `${sign}${amount >= 100 ? Math.round(amount) : amount.toFixed(1)}万`
  }

  return `${sign}${Math.round(absoluteValue)}`
}

function formatMonthLabel(month: string) {
  const monthNumber = Number(month.slice(5, 7))
  return Number.isFinite(monthNumber) ? `${monthNumber}月` : month
}

function formatTooltipMonth(month: string) {
  const year = month.slice(0, 4)
  const monthNumber = Number(month.slice(5, 7))
  return Number.isFinite(monthNumber) ? `${year}年${monthNumber}月` : month
}

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function renderNetChart() {
  if (!netChartRef.value || netTrend.value.length === 0) {
    return
  }

  const textColor = cssVar('--color-text', '#111111')
  const mutedColor = cssVar('--color-muted', '#75757c')
  const borderColor = cssVar('--color-border', 'rgba(17, 17, 17, 0.08)')

  netChart = netChart ?? init(netChartRef.value)
  netChart.setOption(
    {
      animationDuration: 180,
      animationEasing: 'cubicOut',
      grid: { left: 4, right: 8, top: 18, bottom: 10, containLabel: true },
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: {
          type: 'line',
          lineStyle: { color: borderColor, width: 1 }
        },
        valueFormatter: (value: unknown) => moneyLabel(Number(value)),
        formatter: (params: unknown) => {
          const item = Array.isArray(params) ? params[0] : params
          if (!item || typeof item !== 'object') {
            return ''
          }

          const point = item as { axisValue?: string; value?: number }
          return `${formatTooltipMonth(point.axisValue ?? '')}<br />净资产 ${moneyLabel(Number(point.value ?? 0))}`
        }
      },
      xAxis: {
        type: 'category',
        data: netTrend.value.map((point) => point.month),
        boundaryGap: false,
        axisLabel: {
          color: mutedColor,
          hideOverlap: true,
          margin: 10,
          formatter: (value: string) => formatMonthLabel(value)
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: borderColor } }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          color: mutedColor,
          formatter: (value: number) => shortMoneyLabel(value)
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: borderColor, type: 'dashed' } }
      },
      series: [
        {
          name: '净资产',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: netTrend.value.length <= 18,
          data: netTrend.value.map((point) => point.netAsset),
          lineStyle: { width: 2, color: textColor },
          itemStyle: { color: textColor },
          emphasis: {
            focus: 'series',
            lineStyle: { width: 2 }
          }
        }
      ]
    },
    true
  )
}

async function loadNetTrend() {
  netTrend.value = await getNetAssetTrend()
  await nextTick()
  renderNetChart()
}

function resizeCharts() {
  netChart?.resize()
}

watch(
  () => [props.hideAmount, props.decimals],
  () => {
    renderNetChart()
  }
)

onMounted(() => {
  window.addEventListener('resize', resizeCharts)
  void loadNetTrend()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  netChart?.dispose()
})
</script>
