<template>
  <main class="app-container">
    <AppHeader
      @open-settings="uiStore.openSheet('SETTINGS')"
      @open-trend="uiStore.openSheet('TREND')"
      @add-account="uiStore.openSheet('ADD_ACCOUNT')"
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

      <EmptyState v-if="summary.groups.length === 0" @add-account="uiStore.openSheet('ADD_ACCOUNT')" />
      <div v-else class="groups-stack">
        <AccountGroup
          v-for="group in summary.groups"
          :key="group.groupName"
          :group="group"
          :hide-amount="settingsStore.hideAmount"
          :decimals="settingsStore.amountDecimalPlaces"
          @select-account="uiStore.openSheet('ACCOUNT_ACTION', $event)"
        />
      </div>
    </template>

    <AccountActionSheet
      v-if="uiStore.activeSheet === 'ACCOUNT_ACTION' && uiStore.selectedAccountId"
      :account-id="uiStore.selectedAccountId"
      :hide-amount="settingsStore.hideAmount"
      :decimals="settingsStore.amountDecimalPlaces"
      @close="uiStore.closeSheet()"
      @update-balance="uiStore.openSheet('UPDATE_BALANCE', uiStore.selectedAccountId)"
      @view-trend="uiStore.openSheet('TREND', uiStore.selectedAccountId)"
      @edit-account="uiStore.openSheet('EDIT_ACCOUNT', uiStore.selectedAccountId)"
      @deleted="handleSheetSaved"
    />

    <UpdateBalanceSheet
      v-if="uiStore.activeSheet === 'UPDATE_BALANCE' && uiStore.selectedAccountId"
      :account-id="uiStore.selectedAccountId"
      @close="uiStore.closeSheet()"
      @saved="handleSheetSaved"
    />

    <AccountFormSheet
      v-if="uiStore.activeSheet === 'ADD_ACCOUNT'"
      mode="add"
      @close="uiStore.closeSheet()"
      @saved="handleSheetSaved"
    />

    <AccountFormSheet
      v-if="uiStore.activeSheet === 'EDIT_ACCOUNT' && uiStore.selectedAccountId"
      mode="edit"
      :account-id="uiStore.selectedAccountId"
      @close="uiStore.closeSheet()"
      @saved="handleSheetSaved"
    />

    <TrendSheet
      v-if="uiStore.activeSheet === 'TREND'"
      :account-id="uiStore.selectedAccountId"
      :hide-amount="settingsStore.hideAmount"
      :decimals="settingsStore.amountDecimalPlaces"
      @close="uiStore.closeSheet()"
    />

    <SettingsSheet
      v-if="uiStore.activeSheet === 'SETTINGS'"
      @close="uiStore.closeSheet()"
      @changed="refreshHome"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, watch } from 'vue'
import AccountActionSheet from '../components/AccountActionSheet.vue'
import AccountFormSheet from '../components/AccountFormSheet.vue'
import AccountGroup from '../components/AccountGroup.vue'
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
import { useUiStore } from '../stores/uiStore'

const homeStore = useHomeStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()
const uiStore = useUiStore()
const summary = computed(() => homeStore.summary)
const TrendSheet = defineAsyncComponent(() => import('../components/TrendSheet.vue'))

async function refreshHome() {
  await homeStore.refresh(settingsStore.showDeletedAccounts)
}

async function handleSheetSaved() {
  uiStore.closeSheet()
  await refreshHome()
}

onMounted(async () => {
  try {
    await initDefaultAccountTypes()
    await settingsStore.loadSettings()
    await refreshHome()
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '数据库初始化失败', 'error')
  }
})

watch(
  () => settingsStore.showDeletedAccounts,
  () => {
    void refreshHome()
  }
)
</script>
