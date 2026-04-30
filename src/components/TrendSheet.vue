<template>
  <BottomSheet panel-class="trend-panel" labelledby="trend-title" @close="$emit('close')">
      <header class="sheet-header">
        <div>
          <p class="sheet-kicker icon-label">
            <AppIcon :icon="LineChart" :size="16" />
            整体趋势
          </p>
          <h2 id="trend-title">资产变化趋势</h2>
        </div>
      </header>

      <div class="range-tabs">
        <button
          v-for="item in ranges"
          :key="item.value"
          type="button"
          :class="{ active: range === item.value }"
          @click="range = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <section class="chart-card">
        <div class="chart-title">
          <h3 class="icon-label">
            <AppIcon :icon="Activity" :size="17" />
            整体资产趋势
          </h3>
          <span v-if="netChangeText">{{ netChangeText }}</span>
          <span v-else>{{ netTrend.length }} 个节点</span>
        </div>
        <div v-show="netTrend.length > 0" ref="netChartRef" class="chart"></div>
        <p v-if="netTrend.length === 0" class="empty-chart icon-label">
          <AppIcon :icon="ChartNoAxesColumn" :size="17" />
          {{ netEmptyText }}
        </p>
        <p v-else-if="netTrend.length < 2" class="chart-hint icon-label">
          <AppIcon :icon="ChartNoAxesColumn" :size="17" />
          继续更新余额后将生成更清晰的趋势。
        </p>
      </section>
  </BottomSheet>
</template>

<script setup lang="ts">
import { LineChart as EChartsLineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { type ECharts, init, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { Activity, ChartNoAxesColumn, LineChart } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import BottomSheet from './BottomSheet.vue'
import { getNetAssetTrend } from '../services/trendService'
import type { NetAssetTrendPoint, TrendRange } from '../types/trend'
import { formatShortDate } from '../utils/date'
import { formatMoney } from '../utils/money'

const props = defineProps<{
  hideAmount: boolean
  decimals: number
}>()

defineEmits<{
  close: []
}>()

const ranges: Array<{ label: string; value: TrendRange }> = [
  { label: '近 7 次', value: 'LAST_7' },
  { label: '30 天', value: 'LAST_30_DAYS' },
  { label: '90 天', value: 'LAST_90_DAYS' },
  { label: '全部', value: 'ALL' }
]

const range = ref<TrendRange>('ALL')
const netTrend = ref<NetAssetTrendPoint[]>([])
const netChartRef = ref<HTMLDivElement | null>(null)
use([GridComponent, LegendComponent, TooltipComponent, EChartsLineChart, CanvasRenderer])

const netEmptyText = computed(() => '暂无趋势数据，更新余额后会自动生成。')
const netChangeText = computed(() => {
  if (netTrend.value.length < 2) {
    return ''
  }

  const first = netTrend.value[0].netAsset
  const last = netTrend.value[netTrend.value.length - 1].netAsset
  const delta = last - first

  return formatMoney(Math.abs(delta), {
    hide: props.hideAmount,
    decimals: props.decimals,
    negative: delta < 0
  })
})

let netChart: ECharts | null = null

function moneyLabel(value: number) {
  return formatMoney(Math.abs(value), {
    hide: props.hideAmount,
    decimals: props.decimals,
    negative: value < 0
  })
}

function renderNetChart() {
  if (!netChartRef.value || netTrend.value.length === 0) {
    return
  }

  netChart = netChart ?? init(netChartRef.value)
  netChart.setOption({
    color: ['#111111', '#4f8cff', '#ff8f70'],
    grid: { left: 8, right: 8, top: 24, bottom: 12, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => moneyLabel(value)
    },
    legend: { top: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#6f6f75' } },
    xAxis: {
      type: 'category',
      data: netTrend.value.map((point) => formatShortDate(point.date)),
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e6e6ea' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => (props.hideAmount ? '***' : `${Math.round(value / 1000)}k`)
      },
      splitLine: { lineStyle: { color: '#f0f0f3' } }
    },
    series: [
      {
        name: '净资产',
        type: 'line',
        smooth: true,
        data: netTrend.value.map((point) => point.netAsset),
        areaStyle: { opacity: 0.08 }
      },
      {
        name: '总资产',
        type: 'line',
        smooth: true,
        data: netTrend.value.map((point) => point.totalAsset)
      },
      {
        name: '总负债',
        type: 'line',
        smooth: true,
        data: netTrend.value.map((point) => -point.totalLiability)
      }
    ]
  })
}

async function loadNetTrend() {
  netTrend.value = await getNetAssetTrend(range.value)
  await nextTick()
  renderNetChart()
}

async function loadAll() {
  await loadNetTrend()
}

function resizeCharts() {
  netChart?.resize()
}

watch(range, async () => {
  await loadNetTrend()
})
watch(
  () => props.hideAmount,
  () => {
    renderNetChart()
  }
)

onMounted(() => {
  window.addEventListener('resize', resizeCharts)
  void loadAll()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  netChart?.dispose()
})
</script>
