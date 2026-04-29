<template>
  <div class="sheet-backdrop" role="presentation" @click="$emit('close')">
    <section class="sheet-panel settings-panel" role="dialog" aria-modal="true" @click.stop>
      <div class="sheet-handle"></div>
      <header class="sheet-header">
        <div>
          <p class="sheet-kicker">设置</p>
          <h2>数据与显示</h2>
        </div>
        <button class="close-button" type="button" aria-label="关闭" @click="$emit('close')">×</button>
      </header>

      <section class="settings-group">
        <h3>数据管理</h3>
        <button class="settings-row" type="button" @click="handleExportJson">
          <span>导出数据</span>
          <strong>JSON</strong>
        </button>
        <button class="settings-row" type="button" @click="fileInput?.click()">
          <span>导入数据</span>
          <strong>覆盖当前数据</strong>
        </button>
        <input ref="fileInput" class="sr-only" type="file" accept="application/json,.json" @change="handleImportJson" />
        <button class="settings-row" type="button" @click="handleExportCsv">
          <span>导出 CSV</span>
          <strong>余额历史</strong>
        </button>
        <button class="settings-row danger" type="button" @click="handleClearAll">
          <span>清空全部数据</span>
          <strong>不可恢复</strong>
        </button>
      </section>

      <section class="settings-group">
        <h3>显示设置</h3>
        <button class="settings-row" type="button" @click="toggleHideAmount">
          <span>隐藏金额</span>
          <strong>{{ settingsStore.hideAmount ? '已开启' : '已关闭' }}</strong>
        </button>
        <button class="settings-row" type="button" @click="toggleDarkMode">
          <span>深色模式</span>
          <strong>{{ settingsStore.darkMode ? '已开启' : '已关闭' }}</strong>
        </button>
        <label class="settings-row">
          <span>金额小数位</span>
          <select :value="settingsStore.amountDecimalPlaces" @change="setDecimals">
            <option :value="0">0 位</option>
            <option :value="1">1 位</option>
            <option :value="2">2 位</option>
          </select>
        </label>
      </section>

      <section class="settings-group">
        <h3>账户设置</h3>
        <button class="settings-row" type="button" @click="toggleShowDeleted">
          <span>显示已删除账户</span>
          <strong>{{ settingsStore.showDeletedAccounts ? '已开启' : '已关闭' }}</strong>
        </button>
      </section>

      <section class="about-card">
        <h3>关于应用</h3>
        <p>个人资产钱包 1.0.0</p>
        <p>所有账户与余额历史保存在本机 IndexedDB 中，不会上传到云端。</p>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { clearAllData, exportBalanceHistoryCSV, exportData, importData } from '../services/backupService'
import { useSettingsStore } from '../stores/settingsStore'
import { useToastStore } from '../stores/toastStore'
import type { ExportData } from '../types/backup'
import { today } from '../utils/date'
import { downloadTextFile, readJsonFile } from '../utils/file'

const emit = defineEmits<{
  close: []
  changed: []
}>()

const settingsStore = useSettingsStore()
const toastStore = useToastStore()
const fileInput = ref<HTMLInputElement | null>(null)

async function handleExportJson() {
  try {
    const data = await exportData()
    downloadTextFile(
      `asset-wallet-${today()}.json`,
      JSON.stringify(data, null, 2),
      'application/json;charset=utf-8'
    )
    toastStore.show('数据已导出')
  } catch {
    toastStore.show('导出文件失败', 'error')
  }
}

async function handleImportJson(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  try {
    const data = await readJsonFile<ExportData>(file)
    if (!window.confirm('导入会覆盖当前数据，是否继续？')) {
      return
    }

    await importData(data)
    await settingsStore.loadSettings()
    toastStore.show('导入成功')
    emit('changed')
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '导入失败，请检查文件格式', 'error')
  } finally {
    input.value = ''
  }
}

async function handleExportCsv() {
  try {
    const csv = await exportBalanceHistoryCSV()
    downloadTextFile(`asset-wallet-history-${today()}.csv`, csv, 'text/csv;charset=utf-8')
    toastStore.show('CSV 已导出')
  } catch {
    toastStore.show('导出 CSV 失败', 'error')
  }
}

async function handleClearAll() {
  if (!window.confirm('确认清空全部数据？该操作不可恢复，请先导出备份。')) {
    return
  }

  if (!window.confirm('再次确认：真的要清空全部数据吗？')) {
    return
  }

  try {
    await clearAllData()
    await settingsStore.loadSettings()
    toastStore.show('数据已清空')
    emit('changed')
  } catch {
    toastStore.show('清空全部数据失败', 'error')
  }
}

async function toggleHideAmount() {
  await settingsStore.toggleHideAmount()
}

async function toggleDarkMode() {
  await settingsStore.updateSettings({ darkMode: !settingsStore.darkMode })
}

async function toggleShowDeleted() {
  await settingsStore.updateSettings({ showDeletedAccounts: !settingsStore.showDeletedAccounts })
  emit('changed')
}

async function setDecimals(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value)
  await settingsStore.updateSettings({ amountDecimalPlaces: value })
}
</script>
