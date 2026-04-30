<template>
  <BottomSheet labelledby="account-form-title" @close="$emit('close')">
      <header class="sheet-header">
        <div>
          <p class="sheet-kicker icon-label">
            <AppIcon :icon="PencilLine" :size="16" />
            编辑账户
          </p>
          <h2 id="account-form-title">调整账户信息</h2>
        </div>
        <button class="close-button" type="button" aria-label="返回" @click="$emit('close')">
          <AppIcon :icon="ArrowLeft" />
        </button>
      </header>

      <form class="form-stack" @submit.prevent="handleSubmit">
        <label class="field">
          <span>账户名称</span>
          <input v-model="form.name" placeholder="例如：支付宝、招商银行信用卡" enterkeyhint="next" />
        </label>

        <label class="field">
          <span>账户类型</span>
          <select v-model="form.typeId">
            <option v-for="accountType in accountTypes" :key="accountType.id" :value="accountType.id">
              {{ accountType.name }}
            </option>
          </select>
          <div v-if="selectedAccountType" class="selected-type-preview">
            <span class="account-icon" aria-hidden="true">
              <AppIcon :icon="selectedTypeIcon" :size="18" />
            </span>
            <span>{{ selectedAccountType.name }} · {{ selectedAccountType.groupName }}</span>
          </div>
        </label>

        <div class="segmented">
          <button
            type="button"
            :class="{ active: form.category === 'ASSET' }"
            @click="form.category = 'ASSET'"
          >
            资产
          </button>
          <button
            type="button"
            :class="{ active: form.category === 'LIABILITY' }"
            @click="form.category = 'LIABILITY'"
          >
            负债
          </button>
        </div>

        <label class="field">
          <span>账户分组</span>
          <select v-model="form.groupName">
            <option v-for="groupName in groupOptions" :key="groupName" :value="groupName">{{ groupName }}</option>
          </select>
        </label>

        <label class="field">
          <span>图标</span>
        </label>
        <button v-if="svgIcons.length > 0" class="form-choice-row edit-icon-row" type="button" @click="iconPickerVisible = !iconPickerVisible">
          <span class="form-choice-icon" aria-hidden="true">
            <img v-if="selectedSvgIcon" :src="selectedSvgIcon.url" width="28" height="28" alt="" />
            <AppIcon v-else :icon="Image" :size="20" />
          </span>
          <span class="form-choice-copy">
            <strong>{{ selectedSvgIcon ? selectedSvgIcon.label : '暂无可选图标' }}</strong>
          </span>
          <AppIcon :icon="ChevronRight" :size="18" />
        </button>
        <div v-else class="form-choice-row static edit-icon-row">
          <span class="form-choice-icon" aria-hidden="true">
            <AppIcon :icon="Image" :size="20" />
          </span>
          <span class="form-choice-copy">
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

        <label class="field">
          <span>备注</span>
          <textarea v-model="form.note" rows="3" placeholder="可选" enterkeyhint="done"></textarea>
        </label>

        <div class="edit-save-actions">
          <button class="primary-button icon-button-text" type="submit" :disabled="submitting">
            <AppIcon :icon="Check" />
            <span>{{ submitting ? '保存中...' : '保存' }}</span>
          </button>
        </div>

        <div class="edit-danger-zone">
          <button class="delete-account-button" type="button" :disabled="submitting || deleting" @click="confirmVisible = true">
            删除
          </button>
        </div>
      </form>
  </BottomSheet>

  <ConfirmDialog
    v-if="confirmVisible"
    title="确认删除账户？"
    message="确定要删除该账户吗？删除后该账户将不再显示。"
    confirm-text="确认删除"
    :busy="deleting"
    danger
    @cancel="confirmVisible = false"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowLeft, Check, ChevronRight, Image, PencilLine } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'
import BottomSheet from './BottomSheet.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { DEFAULT_GROUPS } from '../db/defaults'
import { deleteAccount, getAccountById, getAccountTypes, updateAccount } from '../services/accountService'
import { useToastStore } from '../stores/toastStore'
import type { AccountCategory, AccountType } from '../types/account'
import { getAccountTypeIcon } from '../utils/accountIcon'
import { getSvgIconOptions, type SvgIconOption } from '../utils/svgIcons'

const props = defineProps<{
  accountId: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
  deleted: []
}>()

const toastStore = useToastStore()
const accountTypes = ref<AccountType[]>([])
const groupOptions = DEFAULT_GROUPS
const iconPickerVisible = ref(false)
const form = reactive({
  name: '',
  typeId: '',
  category: 'ASSET' as AccountCategory,
  groupName: '现金',
  icon: '',
  note: ''
})
const selectedAccountType = computed(() => selectedType())
const selectedTypeIcon = computed(() => (selectedAccountType.value ? getAccountTypeIcon(selectedAccountType.value) : PencilLine))

const svgIcons = getSvgIconOptions()
const selectedSvgIcon = ref<SvgIconOption | null>(null)

function selectSvgIcon(icon: SvgIconOption) {
  selectedSvgIcon.value = selectedSvgIcon.value?.fileName === icon.fileName ? null : icon
}

const submitting = ref(false)
const deleting = ref(false)
const confirmVisible = ref(false)

let initializing = false

function selectedType(): AccountType | undefined {
  return accountTypes.value.find((accountType) => accountType.id === form.typeId)
}

function applyTypeDefaults(updateName = false) {
  const accountType = selectedType()
  if (!accountType) {
    return
  }

  form.category = accountType.category
  form.groupName = accountType.groupName
  form.icon = accountType.icon ?? ''
  if (updateName || !form.name.trim()) {
    form.name = accountType.name
  }
}

async function load() {
  initializing = true
  accountTypes.value = await getAccountTypes()

  const account = await getAccountById(props.accountId)
  if (!account) {
    toastStore.show('账户不存在', 'error')
    emit('close')
    return
  }

  form.name = account.name
  form.typeId = account.typeId
  form.category = account.category
  form.groupName = account.groupName
  form.icon = account.icon ?? ''
  form.note = account.note ?? ''

  if (account.icon?.endsWith('.svg')) {
    const found = svgIcons.find((s) => s.fileName === account.icon)
    if (found) {
      selectedSvgIcon.value = found
    }
  }

  initializing = false
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  const name = form.name.trim()
  if (!name) {
    toastStore.show('账户名称不能为空', 'error')
    return
  }

  if (!form.typeId) {
    toastStore.show('账户类型不能为空', 'error')
    return
  }

  submitting.value = true
  try {
    await updateAccount(props.accountId, {
      name,
      typeId: form.typeId,
      category: form.category,
      groupName: form.groupName,
      icon: selectedSvgIcon.value?.fileName || form.icon || undefined,
      note: form.note
    })

    toastStore.show('保存成功')
    emit('saved')
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '保存失败', 'error')
  } finally {
    submitting.value = false
  }
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

watch(
  () => form.typeId,
  () => {
    if (!initializing) {
      applyTypeDefaults()
    }
  }
)
watch(() => props.accountId, load, { immediate: true })
</script>

<style scoped>
.edit-icon-row {
  margin-top: 4px;
}

.edit-save-actions {
  display: grid;
  margin-top: 6px;
}

.edit-danger-zone {
  display: flex;
  justify-content: center;
  margin-top: 18px;
}

.delete-account-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: rgba(216, 79, 63, 0.78);
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}

.delete-account-button:active {
  background: transparent;
  opacity: 0.62;
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

.form-choice-row {
  display: grid;
  width: 100%;
  min-height: 50px;
  grid-template-columns: 34px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 11px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  padding: 0 4px;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.form-choice-row:active {
  background: var(--color-surface-strong);
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

.form-choice-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.form-choice-copy strong {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
