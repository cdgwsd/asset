<template>
  <main class="app-container" @click="closeSwipeActions">
    <AppHeader
      @open-settings="uiStore.openSheet('SETTINGS')"
      @open-trend="uiStore.openSheet('TREND')"
      @add-account="openAccountTypeSheet"
    />

    <section v-if="homeStore.loading && !summary" class="loading-card">正在打开钱包...</section>

    <template v-if="summary">
      <NetAssetCard
        :net-asset="summary.netAsset"
        :hide-amount="settingsStore.hideAmount"
        :decimals="settingsStore.amountDecimalPlaces"
        @toggle-hide="settingsStore.toggleHideAmount()"
      />
      <SummaryMiniBar
        :total-asset="summary.totalAsset"
        :total-liability="summary.totalLiability"
        :hide-amount="settingsStore.hideAmount"
        :decimals="settingsStore.amountDecimalPlaces"
      />

      <EmptyState v-if="summary.groups.length === 0" @add-account="openAccountTypeSheet" />
      <div v-else class="groups-stack">
        <AccountGroup
          v-for="group in summary.groups"
          :key="group.groupName"
          :group="group"
          :hide-amount="settingsStore.hideAmount"
          :decimals="settingsStore.amountDecimalPlaces"
          :expanded-account-id="expandedAccountId"
          @quick-update="openQuickBalance"
          @edit-account="openEditAccount"
          @open-actions="expandedAccountId = $event"
          @close-actions="closeSwipeActions"
        />
      </div>
    </template>

      <UpdateBalanceSheet
        v-if="renderedSheet === 'UPDATE_BALANCE' && renderedAccountId"
        :account-id="renderedAccountId"
        :closing="sheetClosing"
        hide-overlay
        @after-close="handleSheetAfterClose"
        @close="requestCloseSheet"
        @saved="handleBalanceSaved"
      />

      <AccountTypeSheet
        v-if="renderedSheet === 'SELECT_ACCOUNT_TYPE'"
        :closing="sheetClosing"
        hide-overlay
        @after-close="handleSheetAfterClose"
        @close="requestCloseSheet"
        @select="handleAccountTypeSelected"
      />

      <AddAccountSheet
        v-if="renderedSheet === 'ADD_ACCOUNT'"
        :initial-type="selectedAddAccountType"
        :closing="sheetClosing"
        hide-overlay
        @after-close="handleSheetAfterClose"
        @abandon="requestCloseSheet"
        @saved="handleSheetSaved"
      />

      <AccountFormSheet
        v-if="renderedSheet === 'EDIT_ACCOUNT' && renderedAccountId"
        :account-id="renderedAccountId"
        :closing="sheetClosing"
        hide-overlay
        @after-close="handleSheetAfterClose"
        @close="requestCloseSheet"
        @saved="handleSheetSaved"
        @deleted="handleSheetSaved"
      />

      <TrendSheet
        v-if="renderedSheet === 'TREND'"
        :hide-amount="settingsStore.hideAmount"
        :decimals="settingsStore.amountDecimalPlaces"
        :closing="sheetClosing"
        hide-overlay
        @after-close="handleSheetAfterClose"
        @close="requestCloseSheet"
      />

      <SettingsSheet
        v-if="renderedSheet === 'SETTINGS'"
        :closing="sheetClosing"
        hide-overlay
        @after-close="handleSheetAfterClose"
        @close="requestCloseSheet"
        @changed="refreshHome"
      />

      <Teleport to="body">
        <div
          v-if="renderedSheet !== 'NONE'"
          class="bottom-sheet-overlay shared-overlay"
          :class="{ closing: sheetClosing }"
          role="presentation"
          @click="requestCloseSheet"
        />
      </Teleport>
  </main>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AccountFormSheet from '../components/AccountFormSheet.vue'
import AccountGroup from '../components/AccountGroup.vue'
import AccountTypeSheet from '../components/AccountTypeSheet.vue'
import AddAccountSheet from '../components/AddAccountSheet.vue'
import AppHeader from '../components/AppHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import NetAssetCard from '../components/NetAssetCard.vue'
import SettingsSheet from '../components/SettingsSheet.vue'
import SummaryMiniBar from '../components/SummaryMiniBar.vue'
import UpdateBalanceSheet from '../components/UpdateBalanceSheet.vue'
import { initDefaultAccountTypes } from '../services/accountService'
import { useHomeStore } from '../stores/homeStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useToastStore } from '../stores/toastStore'
import { useUiStore, type ActiveSheet } from '../stores/uiStore'
import type { AccountTypeChoiceKey } from '../constants/accountTypeChoices'
import type { UpdateBalanceResult } from '../types/balance'

const homeStore = useHomeStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()
const uiStore = useUiStore()
const summary = computed(() => homeStore.summary)
const TrendSheet = defineAsyncComponent(() => import('../components/TrendSheet.vue'))
const selectedAddAccountType = ref<AccountTypeChoiceKey>('cash')
const expandedAccountId = ref<string | null>(null)
const renderedSheet = ref<ActiveSheet>('NONE')
const renderedAccountId = ref<string | undefined>()
const sheetClosing = ref(false)
let sheetHistoryOpen = false
let ignoreNextPopState = false

async function refreshHome() {
  await homeStore.refresh(settingsStore.showDeletedAccounts)
}

async function handleSheetSaved() {
  closeCurrentSheet()
  await refreshHome()
}

function handleBalanceSaved(result: UpdateBalanceResult) {
  closeCurrentSheet()
  if (result.changed) {
    homeStore.applyAccountBalance(result.accountId, result.newBalance, result.updatedAt)
  }
}

function closeCurrentSheet() {
  uiStore.closeSheet()
  closeSwipeActions()
  syncHistoryAfterSheetClose()
}

function requestCloseSheet() {
  if (uiStore.activeSheet === 'NONE') {
    sheetClosing.value = renderedSheet.value !== 'NONE'
    return
  }

  closeCurrentSheet()
}

function handleSheetAfterClose() {
  if (uiStore.activeSheet !== 'NONE' && !sheetClosing.value) {
    return
  }

  renderedSheet.value = 'NONE'
  renderedAccountId.value = undefined
  sheetClosing.value = false
}

function openAccountTypeSheet() {
  closeSwipeActions()
  uiStore.openSheet('SELECT_ACCOUNT_TYPE')
}

function handleAccountTypeSelected(type: AccountTypeChoiceKey) {
  selectedAddAccountType.value = type
  uiStore.openSheet('ADD_ACCOUNT')
}

function closeSwipeActions() {
  expandedAccountId.value = null
}

function openQuickBalance(accountId: string) {
  closeSwipeActions()
  uiStore.openSheet('UPDATE_BALANCE', accountId)
}

function openEditAccount(accountId: string) {
  closeSwipeActions()
  uiStore.openSheet('EDIT_ACCOUNT', accountId)
}

function currentHistoryState() {
  return window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
}

function syncHistoryForSheet(activeSheet: ActiveSheet) {
  if (activeSheet === 'NONE') {
    return
  }

  const state = {
    ...currentHistoryState(),
    assetWalletSheet: activeSheet
  }

  if (sheetHistoryOpen) {
    window.history.replaceState(state, '')
    return
  }

  window.history.pushState(state, '')
  sheetHistoryOpen = true
}

function syncHistoryAfterSheetClose() {
  if (!sheetHistoryOpen) {
    return
  }

  ignoreNextPopState = true
  sheetHistoryOpen = false
  window.history.back()
}

function handlePopState() {
  if (ignoreNextPopState) {
    ignoreNextPopState = false
    return
  }

  if (uiStore.activeSheet !== 'NONE') {
    sheetHistoryOpen = false
    uiStore.closeSheet()
    closeSwipeActions()
    return
  }

  sheetHistoryOpen = false
}

onMounted(async () => {
  window.addEventListener('popstate', handlePopState)
  try {
    await initDefaultAccountTypes()
    await settingsStore.loadSettings()
    await refreshHome()
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '数据库初始化失败', 'error')
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', handlePopState)
})

watch(
  () => settingsStore.showDeletedAccounts,
  () => {
    void refreshHome()
  }
)

watch(
  () => [uiStore.activeSheet, uiStore.selectedAccountId] as const,
  ([activeSheet, selectedAccountId]) => {
    if (activeSheet === 'NONE') {
      if (renderedSheet.value !== 'NONE') {
        sheetClosing.value = true
      }
      return
    }

    sheetClosing.value = false
    renderedSheet.value = activeSheet
    renderedAccountId.value = selectedAccountId
    syncHistoryForSheet(activeSheet)
  },
  { immediate: true }
)
</script>
