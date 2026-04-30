<template>
  <BottomSheet
    panel-class="settings-panel"
    labelledby="settings-title"
    :hide-overlay="hideOverlay"
    :closing="closing"
    @close="$emit('close')"
    @after-close="$emit('after-close')"
  >
      <header class="sheet-header">
        <div>
          <p class="sheet-kicker icon-label">
            <AppIcon :icon="Settings" :size="16" />
            设置
          </p>
          <h2 id="settings-title">数据与显示</h2>
        </div>
      </header>

      <section class="settings-group">
        <h3 class="icon-label">
          <AppIcon :icon="DatabaseBackup" :size="17" />
          数据管理
        </h3>
        <button class="settings-row" type="button" :disabled="exportingJson" @click="handleExportJson">
          <span class="icon-button-text">
            <AppIcon :icon="backupOverdue ? ClockAlert : Download" />
            导出数据
          </span>
          <strong>{{ exportingJson ? '导出中' : backupOverdue ? '建议备份' : 'JSON' }}</strong>
        </button>
        <button class="settings-row" type="button" :disabled="importing" @click="fileInput?.click()">
          <span class="icon-button-text">
            <AppIcon :icon="Upload" />
            导入数据
          </span>
          <strong>{{ importing ? '导入中' : '覆盖当前数据' }}</strong>
        </button>
        <input ref="fileInput" class="sr-only" type="file" accept="application/json,.json" @change="handleImportJson" />
        <button class="settings-row" type="button" :disabled="exportingCsv" @click="handleExportCsv">
          <span class="icon-button-text">
            <AppIcon :icon="History" />
            导出 CSV
          </span>
          <strong>{{ exportingCsv ? '导出中' : '余额历史' }}</strong>
        </button>
        <button class="settings-row" type="button" :disabled="exportingSnapshotCsv" @click="handleExportSnapshotCsv">
          <span class="icon-button-text">
            <AppIcon :icon="ChartNoAxesColumn" />
            导出快照 CSV
          </span>
          <strong>{{ exportingSnapshotCsv ? '导出中' : '资产快照' }}</strong>
        </button>
        <button class="settings-row danger" type="button" :disabled="clearing" @click="confirmAction = 'clear'">
          <span class="icon-button-text">
            <AppIcon :icon="Trash2" />
            清空全部数据
          </span>
          <strong>{{ clearing ? '清空中' : '不可恢复' }}</strong>
        </button>
      </section>

      <section class="settings-group">
        <h3 class="icon-label">
          <AppIcon :icon="SlidersHorizontal" :size="17" />
          显示设置
        </h3>
        <button class="settings-row" type="button" @click="toggleHideAmount">
          <span class="icon-button-text">
            <AppIcon :icon="settingsStore.hideAmount ? EyeOff : Eye" />
            隐藏金额
          </span>
          <strong>{{ settingsStore.hideAmount ? '已开启' : '已关闭' }}</strong>
        </button>
        <button class="settings-row" type="button" @click="toggleDarkMode">
          <span class="icon-button-text">
            <AppIcon :icon="Moon" />
            深色模式
          </span>
          <strong>{{ settingsStore.darkMode ? '已开启' : '已关闭' }}</strong>
        </button>
        <label class="settings-row">
          <span class="icon-button-text">
            <AppIcon :icon="CircleDollarSign" />
            金额小数位
          </span>
          <select :value="settingsStore.amountDecimalPlaces" @change="setDecimals">
            <option :value="0">0 位</option>
            <option :value="1">1 位</option>
            <option :value="2">2 位</option>
          </select>
        </label>
      </section>

      <section class="settings-group">
        <h3 class="icon-label">
          <AppIcon :icon="WalletCards" :size="17" />
          账户设置
        </h3>
        <button class="settings-row" type="button" @click="toggleShowDeleted">
          <span class="icon-button-text">
            <AppIcon :icon="Trash2" />
            显示已删除账户
          </span>
          <strong>{{ settingsStore.showDeletedAccounts ? '已开启' : '已关闭' }}</strong>
        </button>
      </section>

      <section class="about-card">
        <h3 class="icon-label">
          <AppIcon :icon="Info" :size="17" />
          关于应用
        </h3>
        <p>个人资产钱包 1.0.0</p>
        <p>所有账户与余额历史保存在本机 IndexedDB 中，不会上传到云端。</p>
      </section>
  </BottomSheet>

  <Transition name="dialog-pop">
    <ConfirmDialog
      v-if="confirmAction"
      :title="confirmAction === 'import' ? '确认导入数据？' : '确认清空全部数据？'"
      :message="confirmMessage"
      :confirm-text="confirmAction === 'import' ? '确认导入' : '确认清空'"
      :busy="importing || clearing"
      danger
      @cancel="cancelConfirm"
      @confirm="handleConfirm"
    />
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChartNoAxesColumn,
  CircleDollarSign,
  ClockAlert,
  DatabaseBackup,
  Download,
  Eye,
  EyeOff,
  History,
  Info,
  Moon,
  Settings,
  SlidersHorizontal,
  Trash2,
  Upload,
  WalletCards
} from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'
import BottomSheet from './BottomSheet.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import {
  clearAllData,
  exportBalanceHistoryCSV,
  exportData,
  exportSnapshotCSV,
  importData,
  inspectImportData
} from '../services/backupService'
import { useSettingsStore } from '../stores/settingsStore'
import { useToastStore } from '../stores/toastStore'
import type { ImportPreview } from '../types/backup'
import { today, now } from '../utils/date'
import { downloadTextFile, readJsonFile } from '../utils/file'

const emit = defineEmits<{
  close: []
  'after-close': []
  changed: []
}>()

withDefaults(
  defineProps<{
    hideOverlay?: boolean
    closing?: boolean
  }>(),
  {
    hideOverlay: false,
    closing: false
  }
)

const settingsStore = useSettingsStore()
const toastStore = useToastStore()
const fileInput = ref<HTMLInputElement | null>(null)
const pendingImportData = ref<unknown | null>(null)
const pendingImportPreview = ref<ImportPreview | null>(null)
const confirmAction = ref<'import' | 'clear' | null>(null)
const exportingJson = ref(false)
const exportingCsv = ref(false)
const exportingSnapshotCsv = ref(false)
const importing = ref(false)
const clearing = ref(false)

const backupOverdue = computed(() => {
  const lastDate = settingsStore.lastExportDate
  if (!lastDate) {
    return true
  }

  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  return Date.now() - new Date(lastDate).getTime() > thirtyDays
})

const confirmMessage = computed(() => {
  if (confirmAction.value === 'import') {
    const preview = pendingImportPreview.value
    const summary = preview
      ? `将恢复 ${preview.summary.accounts} 个账户、${preview.summary.balanceHistory} 条余额历史、${preview.summary.assetSnapshots} 条资产快照。`
      : ''
    const legacy = preview?.adaptedLegacy ? '系统会自动适配旧版本数据。' : ''
    const warning = preview?.warnings[0] ? `${preview.warnings[0]}。` : ''

    return `导入会覆盖当前所有本地数据。${summary}${legacy}${warning}建议先导出备份，确认后再继续。`
  }

  return '该操作会清空账户、余额历史和设置，且不可恢复。建议先导出备份。'
})

async function handleExportJson() {
  if (exportingJson.value) {
    return
  }

  exportingJson.value = true
  try {
    const data = await exportData()
    downloadTextFile(
      `asset-wallet-${today()}.json`,
      JSON.stringify(data, null, 2),
      'application/json;charset=utf-8'
    )
    await settingsStore.updateSettings({ lastExportDate: now() })
    toastStore.show('数据已导出')
  } catch {
    toastStore.show('导出文件失败', 'error')
  } finally {
    exportingJson.value = false
  }
}

async function handleImportJson(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  try {
    const data = await readJsonFile<unknown>(file)
    const preview = inspectImportData(data)
    pendingImportData.value = data
    pendingImportPreview.value = preview
    confirmAction.value = 'import'
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '导入失败，请检查文件格式', 'error')
  } finally {
    input.value = ''
  }
}

async function handleExportCsv() {
  if (exportingCsv.value) {
    return
  }

  exportingCsv.value = true
  try {
    const csv = await exportBalanceHistoryCSV()
    downloadTextFile(`asset-wallet-history-${today()}.csv`, csv, 'text/csv;charset=utf-8')
    toastStore.show('CSV 已导出')
  } catch {
    toastStore.show('导出 CSV 失败', 'error')
  } finally {
    exportingCsv.value = false
  }
}

async function handleExportSnapshotCsv() {
  if (exportingSnapshotCsv.value) {
    return
  }

  exportingSnapshotCsv.value = true
  try {
    const csv = await exportSnapshotCSV()
    downloadTextFile(`asset-wallet-snapshots-${today()}.csv`, csv, 'text/csv;charset=utf-8')
    toastStore.show('快照 CSV 已导出')
  } catch {
    toastStore.show('导出快照 CSV 失败', 'error')
  } finally {
    exportingSnapshotCsv.value = false
  }
}

function cancelConfirm() {
  confirmAction.value = null
  pendingImportData.value = null
  pendingImportPreview.value = null
  toastStore.show('操作已取消', 'info')
}

async function handleConfirm() {
  if (confirmAction.value === 'import') {
    await confirmImport()
    return
  }

  await confirmClearAll()
}

async function confirmImport() {
  if (!pendingImportData.value || importing.value) {
    return
  }

  importing.value = true
  try {
    const result = await importData(pendingImportData.value)
    await settingsStore.loadSettings()
    const legacyMessage = result.adaptedLegacy ? '已自动适配旧版本数据' : ''
    const warningMessage = result.warnings[0] ?? ''
    const detail = [legacyMessage, warningMessage].filter(Boolean).join('，')
    toastStore.show(detail ? `导入成功，${detail}` : '导入成功')
    confirmAction.value = null
    pendingImportData.value = null
    pendingImportPreview.value = null
    emit('changed')
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '导入失败，请检查文件格式', 'error')
  } finally {
    importing.value = false
  }
}

async function confirmClearAll() {
  if (clearing.value) {
    return
  }

  clearing.value = true
  try {
    await clearAllData()
    await settingsStore.loadSettings()
    toastStore.show('数据已清空')
    confirmAction.value = null
    emit('changed')
  } catch {
    toastStore.show('清空全部数据失败', 'error')
  } finally {
    clearing.value = false
  }
}

async function toggleHideAmount() {
  await settingsStore.toggleHideAmount()
  toastStore.show(settingsStore.hideAmount ? '金额已隐藏' : '金额已显示', 'info')
}

async function toggleDarkMode() {
  await settingsStore.updateSettings({ darkMode: !settingsStore.darkMode })
  toastStore.show(settingsStore.darkMode ? '已开启深色模式' : '已关闭深色模式', 'info')
}

async function toggleShowDeleted() {
  await settingsStore.updateSettings({ showDeletedAccounts: !settingsStore.showDeletedAccounts })
  toastStore.show(settingsStore.showDeletedAccounts ? '已显示删除账户' : '已隐藏删除账户', 'info')
  emit('changed')
}

async function setDecimals(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value)
  await settingsStore.updateSettings({ amountDecimalPlaces: value })
  toastStore.show('小数位已更新', 'info')
}
</script>
