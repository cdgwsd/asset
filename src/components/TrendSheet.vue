<template>
  <div class="sheet-backdrop" role="presentation" @click="$emit('close')">
    <section class="sheet-panel trend-panel" role="dialog" aria-modal="true" @click.stop>
      <div class="sheet-handle"></div>
      <header class="sheet-header">
        <div>
          <p class="sheet-kicker">趋势</p>
          <h2>余额变化</h2>
        </div>
        <button class="close-button" type="button" aria-label="关闭" @click="$emit('close')">×</button>
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
          <h3>净资产趋势</h3>
          <span>{{ netTrend.length }} 个节点</span>
        </div>
        <div v-show="netTrend.length > 0" ref="netChartRef" class="chart"></div>
        <p v-if="netTrend.length === 0" class="empty-chart">暂无余额历史，新增账户或修改余额后会自动生成趋势。</p>
      </section>

      <section class="chart-card">
        <div class="chart-title">
          <h3>账户余额趋势</h3>
          <select v-model="selectedAccountId">
            <option value="">选择账户</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.icon }} {{ account.name }}
            </option>
          </select>
        </div>
        <div v-show="accountTrend.length > 0" ref="accountChartRef" class="chart"></div>
        <p v-if="accountTrend.length === 0" class="empty-chart">请选择有余额历史的账户。</p>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { type ECharts, init, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { getAccounts } from '../services/accountService'
import { getAccountBalanceTrend, getNetAssetTrend } from '../services/trendService'
import type { Account } from '../types/account'
import type { AccountTrendPoint, NetAssetTrendPoint, TrendRange } from '../types/trend'
import { formatShortDate } from '../utils/date'
import { formatMoney } from '../utils/money'

const props = defineProps<{
  accountId?: string
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
const accounts = ref<Account[]>([])
const selectedAccountId = ref(props.accountId ?? '')
const netTrend = ref<NetAssetTrendPoint[]>([])
const accountTrend = ref<AccountTrendPoint[]>([])
const netChartRef = ref<HTMLDivElement | null>(null)
const accountChartRef = ref<HTMLDivElement | null>(null)
use([GridComponent, LegendComponent, TooltipComponent, LineChart, CanvasRenderer])

let netChart: ECharts | null = null
let accountChart: ECharts | null = null

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

function renderAccountChart() {
  if (!accountChartRef.value || accountTrend.value.length === 0) {
    return
  }

  accountChart = accountChart ?? init(accountChartRef.value)
  accountChart.setOption({
    color: ['#111111'],
    grid: { left: 8, right: 8, top: 14, bottom: 12, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => moneyLabel(value)
    },
    xAxis: {
      type: 'category',
      data: accountTrend.value.map((point) => formatShortDate(point.dateTime)),
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
        name: '账户余额',
        type: 'line',
        smooth: true,
        data: accountTrend.value.map((point) => point.balance),
        areaStyle: { opacity: 0.08 }
      }
    ]
  })
}

async function loadNetTrend() {
  netTrend.value = await getNetAssetTrend(range.value)
  await nextTick()
  renderNetChart()
}

async function loadAccountTrend() {
  if (!selectedAccountId.value) {
    accountTrend.value = []
    return
  }

  accountTrend.value = await getAccountBalanceTrend(selectedAccountId.value, range.value)
  await nextTick()
  renderAccountChart()
}

async function loadAll() {
  accounts.value = await getAccounts({ includeDeleted: true })
  if (!selectedAccountId.value && accounts.value[0]) {
    selectedAccountId.value = accounts.value[0].id
  }

  await Promise.all([loadNetTrend(), loadAccountTrend()])
}

function resizeCharts() {
  netChart?.resize()
  accountChart?.resize()
}

watch(range, async () => {
  await Promise.all([loadNetTrend(), loadAccountTrend()])
})
watch(selectedAccountId, loadAccountTrend)
watch(
  () => props.hideAmount,
  () => {
    renderNetChart()
    renderAccountChart()
  }
)

onMounted(() => {
  window.addEventListener('resize', resizeCharts)
  void loadAll()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  netChart?.dispose()
  accountChart?.dispose()
})
</script>
