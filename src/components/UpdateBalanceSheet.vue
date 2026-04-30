<template>
  <BottomSheet
    panel-class="compact"
    labelledby="update-balance-title"
    :hide-overlay="hideOverlay"
    :closing="closing"
    @close="$emit('close')"
    @after-close="$emit('after-close')"
  >
      <header class="sheet-header">
        <div>
          <p class="sheet-kicker icon-label">
            <AppIcon :icon="RefreshCw" :size="16" />
            快速调整
          </p>
          <h2 id="update-balance-title">快速调整余额</h2>
        </div>
      </header>

      <form class="form-stack" @submit.prevent="handleSubmit">
        <div v-if="account" class="balance-update-summary">
          <div>
            <span>账户名称</span>
            <strong>{{ account.name }}</strong>
          </div>
          <div>
            <span>当前余额</span>
            <strong>{{ currentBalanceText }}</strong>
          </div>
        </div>

        <label class="field">
          <span>新余额</span>
          <input
            v-model="balanceInput"
            inputmode="decimal"
            autocomplete="off"
            placeholder="例如：17,258.14"
            enterkeyhint="next"
            @focus="balanceInput = unformatMoneyInput(balanceInput)"
            @blur="balanceInput = formatMoneyInput(balanceInput)"
            @input="balanceInput = sanitizeMoneyInput(balanceInput)"
          />
        </label>

        <p v-if="account?.category === 'LIABILITY'" class="helper-text">负债账户也输入正数，例如信用卡欠款 3000。</p>

        <div class="sheet-actions">
          <button class="secondary-button" type="button" :disabled="submitting" @click="$emit('close')">取消</button>
          <button class="primary-button icon-button-text" type="submit" :disabled="submitting">
            <AppIcon :icon="Check" />
            <span>{{ submitting ? '保存中...' : '保存' }}</span>
          </button>
        </div>
      </form>
  </BottomSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, RefreshCw } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'
import BottomSheet from './BottomSheet.vue'
import { getAccountById } from '../services/accountService'
import { updateAccountBalance } from '../services/balanceService'
import { useToastStore } from '../stores/toastStore'
import type { Account } from '../types/account'
import type { UpdateBalanceResult } from '../types/balance'
import { formatAccountBalance, formatMoneyInput, parseMoneyInput, unformatMoneyInput } from '../utils/money'

const props = withDefaults(
  defineProps<{
    accountId: string
    hideOverlay?: boolean
    closing?: boolean
  }>(),
  {
    hideOverlay: false,
    closing: false
  }
)

const emit = defineEmits<{
  close: []
  'after-close': []
  saved: [result: UpdateBalanceResult]
}>()

const toastStore = useToastStore()
const account = ref<Account | null>(null)
const balanceInput = ref('')
const submitting = ref(false)

async function loadAccount() {
  account.value = (await getAccountById(props.accountId)) ?? null
  balanceInput.value = account.value ? String(account.value.currentBalance) : ''
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  if (!account.value) {
    toastStore.show('账户不存在', 'error')
    return
  }

  const balance = parseMoneyInput(balanceInput.value)
  if (balance === null) {
    toastStore.show('余额格式不正确', 'error')
    return
  }

  submitting.value = true
  try {
    const result = await updateAccountBalance({
      accountId: props.accountId,
      newBalance: balance,
      source: 'MANUAL_UPDATE'
    })

    toastStore.show(result.changed ? '余额已更新' : '余额未变化', result.changed ? 'success' : 'info')
    emit('saved', result)
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

function sanitizeMoneyInput(value: string): string {
  const normalized = value.replace(/[^\d.]/g, '')
  const [integer = '', ...decimalParts] = normalized.split('.')
  const decimal = decimalParts.join('').slice(0, 2)

  return decimalParts.length > 0 ? `${integer}.${decimal}` : integer
}

const currentBalanceText = computed(() => {
  if (!account.value) {
    return ''
  }

  return formatAccountBalance(account.value.currentBalance, account.value.category)
})

watch(() => props.accountId, loadAccount, { immediate: true })
</script>
