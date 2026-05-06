<template>
  <BottomSheet
    panel-class="add-account-panel"
    content-class="add-account-sheet-content"
    labelledby="add-account-title"
    :hide-overlay="hideOverlay"
    :closing="closing"
    @close="$emit('abandon')"
    @after-close="$emit('after-close')"
  >
    <header class="add-account-header">
      <button class="icon-button" type="button" aria-label="返回" @click="$emit('abandon')">
        <AppIcon :icon="ArrowLeft" />
      </button>
    </header>

    <form class="add-account-form" @submit.prevent="handleSubmit">
      <h2 id="add-account-title">添加新的账户</h2>

      <button class="form-choice-row" type="button" @click="openTypeSheet">
        <span class="form-choice-icon" aria-hidden="true">
          <AppIcon :icon="selectedChoice.icon" :size="22" />
        </span>
        <span class="form-choice-copy">
          <small>选择类型</small>
          <strong>{{ selectedChoiceLabel }}</strong>
        </span>
        <AppIcon :icon="ChevronRight" :size="18" />
      </button>

      <label class="add-field">
        <span class="field-leading-icon" aria-hidden="true">
          <AppIcon :icon="WalletCards" :size="19" />
        </span>
        <span class="sr-only">账户名称</span>
        <input
          v-model="nameInput"
          :placeholder="`账户名称，例如${selectedChoice.defaultName}`"
          autocomplete="off"
          enterkeyhint="next"
        />
      </label>

      <button v-if="svgIcons.length > 0" class="form-choice-row" type="button" @click="iconPickerVisible = !iconPickerVisible">
        <span class="form-choice-icon" aria-hidden="true">
          <img v-if="selectedSvgIcon" :src="selectedSvgIcon.url" width="28" height="28" alt="" />
          <AppIcon v-else :icon="Image" :size="20" />
        </span>
        <span class="form-choice-copy">
          <small>图标</small>
          <strong>{{ selectedSvgIcon ? selectedSvgIcon.label : '暂无可选图标' }}</strong>
        </span>
        <AppIcon :icon="ChevronRight" :size="18" />
      </button>

      <div v-if="!svgIcons.length" class="form-choice-row static">
        <span class="form-choice-icon" aria-hidden="true">
          <AppIcon :icon="Image" :size="20" />
        </span>
        <span class="form-choice-copy">
          <small>图标</small>
          <strong>暂无可选图标</strong>
        </span>
        <AppIcon :icon="ChevronRight" :size="18" />
      </div>

      <div v-if="iconPickerVisible && svgIcons.length > 0" class="icon-picker-grid">
        <button
          v-for="icon in svgIcons"
          :key="icon.fileName"
          class="icon-picker-option"
          :class="{ selected: selectedSvgIcon?.fileName === icon.fileName }"
          type="button"
          @click="selectSvgIcon(icon); iconPickerVisible = false"
        >
          <img :src="icon.url" width="36" height="36" alt="" />
          <small>{{ icon.label }}</small>
        </button>
      </div>

      <label class="add-field">
        <span class="field-leading-icon" aria-hidden="true">
          <AppIcon :icon="PiggyBank" :size="19" />
        </span>
        <span class="sr-only">初始余额</span>
        <input
          v-model="balanceInput"
          inputmode="decimal"
          placeholder="初始化余额"
          autocomplete="off"
          enterkeyhint="next"
          @beforeinput="handleMoneyBeforeInput"
          @paste="handleMoneyPaste"
          @focus="handleMoneyFocus"
          @blur="handleMoneyBlur"
          @input="handleMoneyInput"
        />
      </label>

      <label class="add-field">
        <span class="field-leading-icon" aria-hidden="true">
          <AppIcon :icon="StickyNote" :size="19" />
        </span>
        <span class="sr-only">备注</span>
        <input v-model="noteInput" placeholder="备注" autocomplete="off" enterkeyhint="done" />
      </label>


      <div class="add-account-actions">
        <button class="add-submit-button" type="submit" :disabled="submitting">
          {{ submitting ? '添加中...' : '添加' }}
        </button>
        <button class="abandon-button" type="button" :disabled="submitting" @click="$emit('abandon')">放弃</button>
      </div>
    </form>
  </BottomSheet>

  <AccountTypeSheet
    v-if="typeSheetVisible"
    :closing="typeSheetClosing"
    @after-close="finishTypeSheetClose"
    @close="finishTypeSheetClose"
    @select="handleTypeSelected"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowLeft,
  ChevronRight,
  Image,
  PiggyBank,
  StickyNote,
  WalletCards
} from 'lucide-vue-next'
import AccountTypeSheet from './AccountTypeSheet.vue'
import AppIcon from './AppIcon.vue'
import BottomSheet from './BottomSheet.vue'
import {
  getAccountTypeChoice,
  type AccountTypeChoiceKey
} from '../constants/accountTypeChoices'
import { createAccount, getAccountTypes } from '../services/accountService'
import { getSvgIconOptions, type SvgIconOption } from '../utils/svgIcons'
import { useToastStore } from '../stores/toastStore'
import type { AccountType } from '../types/account'
import {
  applyMoneyInputChange,
  formatMoneyInput,
  isMoneyInputDraftAllowed,
  normalizeMoneyInputDraft,
  parseMoneyInput,
  unformatMoneyInput
} from '../utils/money'

const props = withDefaults(
  defineProps<{
    initialType: AccountTypeChoiceKey
    hideOverlay?: boolean
    closing?: boolean
  }>(),
  {
    hideOverlay: false,
    closing: false
  }
)

const emit = defineEmits<{
  abandon: []
  'after-close': []
  saved: []
}>()

const toastStore = useToastStore()
const accountTypes = ref<AccountType[]>([])
const selectedTypeKey = ref<AccountTypeChoiceKey>(props.initialType)
const typeSheetVisible = ref(false)
const typeSheetClosing = ref(false)
const iconPickerVisible = ref(false)
const nameInput = ref('')
const balanceInput = ref('')
const noteInput = ref('')
const submitting = ref(false)
let lastValidBalanceInput = ''

const svgIcons = getSvgIconOptions()
const selectedSvgIcon = ref<SvgIconOption | null>(svgIcons.find((i) => i.fileName === '钱包.svg') ?? null)

function selectSvgIcon(icon: SvgIconOption) {
  selectedSvgIcon.value = selectedSvgIcon.value?.fileName === icon.fileName ? null : icon
}

const isCustomType = computed(() => selectedTypeKey.value.startsWith('custom_'))
const selectedChoice = computed(() => getAccountTypeChoice(isCustomType.value ? 'custom' : selectedTypeKey.value))
const selectedSystemType = computed(() => {
  if (isCustomType.value) {
    return accountTypes.value.find((accountType) => accountType.id === selectedTypeKey.value)
  }

  return accountTypes.value.find((accountType) => accountType.id === selectedChoice.value.typeId)
})

const selectedChoiceLabel = computed(() => {
  if (isCustomType.value && selectedSystemType.value) {
    return selectedSystemType.value.name
  }

  return selectedChoice.value.label
})

const selectedChoiceCategory = computed(() => {
  if (isCustomType.value && selectedSystemType.value) {
    return selectedSystemType.value.category
  }

  return selectedChoice.value.category
})

const selectedChoiceGroupName = computed(() => {
  if (isCustomType.value && selectedSystemType.value) {
    return selectedSystemType.value.groupName
  }

  return selectedChoice.value.groupName
})

function handleTypeSelected(key: AccountTypeChoiceKey) {
  selectedTypeKey.value = key
  closeTypeSheet()
}

function openTypeSheet() {
  typeSheetClosing.value = false
  typeSheetVisible.value = true
}

function closeTypeSheet() {
  typeSheetClosing.value = true
}

function finishTypeSheetClose() {
  typeSheetVisible.value = false
  typeSheetClosing.value = false
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

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  const name = nameInput.value.trim()
  if (!name) {
    toastStore.show('账户名称不能为空', 'error')
    return
  }

  const balance = parseMoneyInput(balanceInput.value || '0')
  if (balance === null) {
    toastStore.show('初始余额格式不正确', 'error')
    return
  }

  if (accountTypes.value.length === 0) {
    accountTypes.value = await getAccountTypes()
  }

  const accountType = selectedSystemType.value
  if (!accountType) {
    toastStore.show('账户类型不存在', 'error')
    return
  }

  submitting.value = true
  try {
    await createAccount({
      name,
      typeId: accountType.id,
      category: selectedChoiceCategory.value,
      groupName: selectedChoiceGroupName.value,
      currentBalance: balance,
      icon: selectedSvgIcon.value?.fileName || accountType.icon,
      note: noteInput.value
    })
    toastStore.show('添加成功')
    emit('saved')
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '添加账户失败', 'error')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.initialType,
  (type) => {
    selectedTypeKey.value = type
  },
  { immediate: true }
)

void getAccountTypes().then((types) => {
  accountTypes.value = types
})
</script>

<style scoped>
.add-account-header {
  min-height: 34px;
  flex: 0 0 auto;
  margin-bottom: 4px;
}

.add-account-form {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
}

.add-account-form h2 {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 780;
  letter-spacing: 0;
}

.form-choice-row {
  display: grid;
  width: 100%;
  min-height: 50px;
  grid-template-columns: 34px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 11px;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--color-text);
  text-align: left;
}

.form-choice-row:not(.static) {
  cursor: pointer;
}

.form-choice-row:not(.static):active {
  background: var(--color-surface-strong);
  opacity: 0.9;
}

.form-choice-row.static {
  cursor: default;
}

.form-choice-icon {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--color-surface-strong);
  color: var(--color-text);
}

.field-leading-icon {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--color-surface-strong);
  color: var(--color-text);
}

.form-choice-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.form-choice-copy small {
  color: var(--color-faint);
  font-size: 12px;
  font-weight: 700;
}

.form-choice-copy strong {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-field {
  display: grid;
  width: 100%;
  min-height: 50px;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--color-text);
  text-align: left;
}

.add-field input {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text);
  outline: none;
  scroll-margin: 96px;
  transition: background-color var(--transition-fast) var(--ease-standard);
}

.add-field input::placeholder {
  color: var(--color-faint);
  font-weight: 700;
}

.add-account-actions {
  display: grid;
  flex: 0 0 auto;
  gap: 20px;
  margin-top: auto;
  padding: 0 34px;
}

.add-submit-button {
  min-height: 54px;
  border: 0;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-bg);
  font-size: 16px;
  font-weight: 780;
}

.add-submit-button:not(:disabled):active {
  opacity: 0.88;
}

.abandon-button {
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--color-danger);
  font-size: 15px;
  font-weight: 760;
}

.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 4px 0 8px;
}

.icon-picker-option {
  display: grid;
  justify-items: center;
  gap: 4px;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  background: var(--color-surface-strong);
  padding: 10px 4px;
  cursor: pointer;
}

.icon-picker-option.selected {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.icon-picker-option small {
  color: var(--color-muted);
  font-size: 10px;
  font-weight: 600;
}
</style>
