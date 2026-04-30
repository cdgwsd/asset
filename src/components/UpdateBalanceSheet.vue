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
            @beforeinput="handleMoneyBeforeInput"
            @paste="handleMoneyPaste"
            @focus="handleMoneyFocus"
            @blur="handleMoneyBlur"
            @input="handleMoneyInput"
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
import {
  applyMoneyInputChange,
  formatAccountBalance,
  formatMoneyInput,
  isMoneyInputDraftAllowed,
  normalizeMoneyInputDraft,
  parseMoneyInput,
  unformatMoneyInput
} from '../utils/money'

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
let lastValidBalanceInput = ''

async function loadAccount() {
  account.value = (await getAccountById(props.accountId)) ?? null
  balanceInput.value = account.value ? String(account.value.currentBalance) : ''
  lastValidBalanceInput = balanceInput.value
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

function setBalanceInputValue(input: HTMLInputElement, value: string, cursorPosition = value.length) {
  input.value = value
  balanceInput.value = value
  lastValidBalanceInput = value

  if (document.activeElement === input) {
    window.requestAnimationFrame(() => {
      input.setSelectionRange(cursorPosition, cursorPosition)
    })
  }
}

function handleMoneyBeforeInput(event: InputEvent) {
  if (event.isComposing) {
    return
  }

  if (event.inputType.startsWith('delete') || event.inputType.startsWith('history')) {
    return
  }

  if (event.inputType === 'insertFromPaste') {
    return
  }

  const input = event.target as HTMLInputElement
  const nextValue = applyMoneyInputChange(input.value, input.selectionStart, input.selectionEnd, event.data ?? '')
  if (!isMoneyInputDraftAllowed(nextValue)) {
    event.preventDefault()
  }
}

function handleMoneyPaste(event: ClipboardEvent) {
  const input = event.target as HTMLInputElement
  const pastedText = event.clipboardData?.getData('text') ?? ''
  const nextValue = normalizeMoneyInputDraft(
    applyMoneyInputChange(input.value, input.selectionStart, input.selectionEnd, pastedText),
    lastValidBalanceInput
  )

  event.preventDefault()
  setBalanceInputValue(input, nextValue)
}

function handleMoneyInput(event: Event) {
  const input = event.target as HTMLInputElement
  const cursorPosition = input.selectionStart ?? input.value.length
  const nextValue = normalizeMoneyInputDraft(input.value, lastValidBalanceInput)
  setBalanceInputValue(input, nextValue, Math.min(cursorPosition, nextValue.length))
}

function handleMoneyFocus(event: FocusEvent) {
  const input = event.target as HTMLInputElement
  setBalanceInputValue(input, unformatMoneyInput(input.value))
}

function handleMoneyBlur(event: FocusEvent) {
  const input = event.target as HTMLInputElement
  setBalanceInputValue(input, formatMoneyInput(input.value || '0'))
}

const currentBalanceText = computed(() => {
  if (!account.value) {
    return ''
  }

  return formatAccountBalance(account.value.currentBalance, account.value.category)
})

watch(() => props.accountId, loadAccount, { immediate: true })
</script>
