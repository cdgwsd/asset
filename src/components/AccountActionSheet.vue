<template>
  <BottomSheet panel-class="compact" labelledby="account-action-title" @close="$emit('close')">
      <template v-if="account">
        <header class="sheet-header">
          <div>
            <p class="sheet-kicker">{{ account.typeName }}</p>
            <h2 id="account-action-title" class="title-with-icon">
              <span class="title-icon">
                <img v-if="customSvgUrl" :src="customSvgUrl" width="34" height="34" alt="" />
                <AppIcon v-else-if="account?.icon?.startsWith('fluent-emoji-flat:')" :iconify="account.icon" :size="28" />
                <AppIcon v-else-if="accountIconName.startsWith('fluent-emoji-flat:')" :iconify="accountIconName" :size="28" />
                <AppIcon v-else :icon="accountIcon" :size="22" />
              </span>
              <span>{{ account.name }}</span>
            </h2>
          </div>
        </header>

        <div class="account-detail-card">
          <span class="icon-label">
            <AppIcon :icon="Wallet" :size="17" />
            当前余额
          </span>
          <strong>{{ balanceText }}</strong>
        </div>

        <dl class="detail-list">
          <div>
            <dt>账户性质</dt>
            <dd>{{ account.category === 'ASSET' ? '资产' : '负债' }}</dd>
          </div>
          <div>
            <dt>账户分组</dt>
            <dd>{{ account.groupName }}</dd>
          </div>
          <div>
            <dt>最近更新</dt>
            <dd>{{ formatDateTime(account.updatedAt) }}</dd>
          </div>
          <div v-if="account.note">
            <dt>备注</dt>
            <dd>{{ account.note }}</dd>
          </div>
        </dl>

        <div class="action-list">
          <button class="action-row primary" type="button" :disabled="account.isDeleted" @click="$emit('update-balance')">
            <span class="icon-button-text">
              <AppIcon :icon="RefreshCw" />
              修改余额
            </span>
          </button>
          <button class="action-row" type="button" @click="$emit('view-trend')">
            <span class="icon-button-text">
              <AppIcon :icon="LineChart" />
              查看趋势
            </span>
          </button>
          <button class="action-row" type="button" :disabled="account.isDeleted" @click="$emit('edit-account')">
            <span class="icon-button-text">
              <AppIcon :icon="PencilLine" />
              编辑账户
            </span>
          </button>
          <button class="action-row danger" type="button" :disabled="account.isDeleted || deleting" @click="confirmVisible = true">
            <span class="icon-button-text">
              <AppIcon :icon="Trash2" />
              删除账户
            </span>
          </button>
        </div>
      </template>
      <div v-else class="sheet-loading">账户不存在</div>
  </BottomSheet>

  <ConfirmDialog
    v-if="confirmVisible"
    title="确认删除账户？"
    message="删除后，该账户将不再显示在首页。历史余额记录仍会保留，用于趋势统计。"
    confirm-text="确认删除"
    :busy="deleting"
    danger
    @cancel="confirmVisible = false"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LineChart, PencilLine, RefreshCw, Trash2, Wallet } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'
import BottomSheet from './BottomSheet.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { deleteAccount, getAccountById } from '../services/accountService'
import { useToastStore } from '../stores/toastStore'
import type { Account } from '../types/account'
import { getAccountIcon, resolveAccountIconName } from '../utils/accountIcon'
import { getSvgIconUrl } from '../utils/svgIcons'
import { formatDateTime } from '../utils/date'
import { formatAccountBalance } from '../utils/money'

const props = defineProps<{
  accountId: string
  hideAmount: boolean
  decimals: number
}>()

const emit = defineEmits<{
  close: []
  'update-balance': []
  'view-trend': []
  'edit-account': []
  deleted: []
}>()

const toastStore = useToastStore()
const account = ref<Account | null>(null)
const confirmVisible = ref(false)
const deleting = ref(false)
const accountIcon = computed(() => (account.value ? getAccountIcon(account.value) : Wallet))
const accountIconName = computed(() => (account.value ? resolveAccountIconName(account.value) : 'fluent-emoji-flat:money-bag'))
const customSvgUrl = computed(() => {
  if (account.value?.icon?.endsWith('.svg')) {
    return getSvgIconUrl(account.value.icon)
  }

  return undefined
})

const balanceText = computed(() => {
  if (!account.value) {
    return ''
  }

  return formatAccountBalance(account.value.currentBalance, account.value.category, {
    hide: props.hideAmount,
    decimals: props.decimals
  })
})

async function loadAccount() {
  account.value = (await getAccountById(props.accountId)) ?? null
}

async function handleDelete() {
  if (deleting.value) {
    return
  }

  deleting.value = true
  try {
    await deleteAccount(props.accountId)
    toastStore.show('账户已删除')
    confirmVisible.value = false
    emit('deleted')
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '删除账户失败', 'error')
  } finally {
    deleting.value = false
  }
}

watch(() => props.accountId, loadAccount, { immediate: true })
</script>

<style scoped>
.account-detail-card {
  display: grid;
  gap: 4px;
  margin-bottom: 16px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: var(--shadow-card);
}

:root[data-theme='dark'] .account-detail-card {
  background: rgba(26, 26, 28, 0.86);
}

.account-detail-card span {
  display: block;
  margin-bottom: 6px;
  color: var(--color-muted);
  font-size: 12px;
}

.account-detail-card strong {
  font-size: 17px;
  letter-spacing: -0.02em;
}

.detail-list {
  display: grid;
  gap: 12px;
  margin: 0 0 18px;
}

.detail-list div {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.detail-list dt {
  color: var(--color-muted);
  font-size: 13px;
}

.detail-list dd {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  text-align: right;
}
</style>
