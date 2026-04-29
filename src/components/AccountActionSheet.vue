<template>
  <div class="sheet-backdrop" role="presentation" @click="$emit('close')">
    <section class="sheet-panel compact" role="dialog" aria-modal="true" @click.stop>
      <div class="sheet-handle"></div>
      <template v-if="account">
        <header class="sheet-header">
          <div>
            <p class="sheet-kicker">{{ account.typeName }}</p>
            <h2>{{ account.icon || '💼' }} {{ account.name }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="关闭" @click="$emit('close')">×</button>
        </header>

        <div class="account-detail-card">
          <span>当前余额</span>
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
            修改余额
          </button>
          <button class="action-row" type="button" @click="$emit('view-trend')">查看趋势</button>
          <button class="action-row" type="button" :disabled="account.isDeleted" @click="$emit('edit-account')">
            编辑账户
          </button>
          <button class="action-row danger" type="button" :disabled="account.isDeleted" @click="confirmVisible = true">
            删除账户
          </button>
        </div>
      </template>
      <div v-else class="sheet-loading">账户不存在</div>
    </section>
  </div>

  <ConfirmDialog
    v-if="confirmVisible"
    title="确认删除账户？"
    message="删除后，该账户将不再显示在首页。历史余额记录仍会保留，用于趋势统计。"
    confirm-text="确认删除"
    danger
    @cancel="confirmVisible = false"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { deleteAccount, getAccountById } from '../services/accountService'
import { useToastStore } from '../stores/toastStore'
import type { Account } from '../types/account'
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
  try {
    await deleteAccount(props.accountId)
    toastStore.show('账户已删除')
    confirmVisible.value = false
    emit('deleted')
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '删除账户失败', 'error')
  }
}

watch(() => props.accountId, loadAccount, { immediate: true })
</script>
