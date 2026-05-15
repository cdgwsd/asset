<template>
  <BottomSheet
    panel-class="account-type-sheet"
    labelledby="account-type-title"
    :hide-overlay="hideOverlay"
    :closing="closing"
    @close="$emit('close')"
    @after-close="$emit('after-close')"
  >
      <header class="account-type-header">
        <h2 id="account-type-title">选择类型</h2>
      </header>

      <Transition name="sheet-content" mode="out-in">
        <div v-if="!showCustomForm" key="preset-types" class="account-type-list">
          <button
            v-for="choice in presetChoices"
            :key="choice.key"
            class="account-type-option"
            type="button"
            @click="$emit('select', choice.key)"
          >
            <span class="type-option-icon" aria-hidden="true">
              <AppIcon :iconify="choice.iconifyName" :size="30" />
            </span>
            <span class="type-option-copy">
              <strong>{{ choice.label }}</strong>
              <small>{{ choice.description }}</small>
            </span>
          </button>

          <button
            class="account-type-option"
            type="button"
            @click="showCustomForm = true"
          >
            <span class="type-option-icon" aria-hidden="true">
              <AppIcon :iconify="'fluent-emoji-flat:gem-stone'" :size="30" />
            </span>
            <span class="type-option-copy">
              <strong>自定义类型</strong>
              <small>创建你自己的账户类型</small>
            </span>
          </button>
        </div>

        <form v-else key="custom-type" class="custom-type-form" @submit.prevent="handleCreateCustom">
          <label class="custom-field">
            <span>类型名称</span>
            <input v-model="customName" placeholder="例如：公积金、储值卡" enterkeyhint="next" />
          </label>

          <div class="segmented">
            <button
              type="button"
              :class="{ active: customCategory === 'ASSET' }"
              @click="customCategory = 'ASSET'"
            >
              资产
            </button>
            <button
              type="button"
              :class="{ active: customCategory === 'LIABILITY' }"
              @click="customCategory = 'LIABILITY'"
            >
              负债
            </button>
          </div>

          <label class="custom-field">
            <span>账户分组</span>
            <select v-model="customGroup" class="custom-select">
              <option v-for="g in DEFAULT_GROUPS" :key="g" :value="g">{{ g }}</option>
            </select>
          </label>

          <div class="custom-form-actions">
            <button class="secondary-button" type="button" @click="showCustomForm = false">返回</button>
            <button class="primary-button" type="submit">创建</button>
          </div>
        </form>
      </Transition>
  </BottomSheet>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
import BottomSheet from './BottomSheet.vue'
import { accountTypeChoices, type AccountTypeChoiceKey } from '../constants/accountTypeChoices'
import { DEFAULT_GROUPS } from '../db/defaults'
import { createCustomAccountType } from '../services/accountService'
import { useToastStore } from '../stores/toastStore'
import type { AccountCategory } from '../types/account'

const emit = defineEmits<{
  close: []
  'after-close': []
  select: [key: AccountTypeChoiceKey]
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

const toastStore = useToastStore()
const presetChoices = accountTypeChoices.filter((c) => c.key !== 'custom')
const showCustomForm = ref(false)
const customName = ref('')
const customCategory = ref<AccountCategory>('ASSET')
const customGroup = ref('其他')

async function handleCreateCustom() {
  const name = customName.value.trim()
  if (!name) {
    toastStore.show('请输入类型名称', 'error')
    return
  }

  try {
    const customType = await createCustomAccountType(name, customCategory.value, customGroup.value)
    showCustomForm.value = false
    customName.value = ''

    presetChoices.push({
      key: customType.id as AccountTypeChoiceKey,
      label: customType.name,
      description: `${customType.category === 'ASSET' ? '资产' : '负债'} · ${customType.groupName}`,
      typeId: customType.id,
      defaultName: customType.name,
      category: customType.category,
      groupName: customType.groupName,
      iconKey: customType.icon ?? '',
      icon: presetChoices[0].icon,
      iconifyName: 'fluent-emoji-flat:gem-stone'
    })

    emit('select', customType.id as AccountTypeChoiceKey)
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '创建类型失败', 'error')
  }
}
</script>

<style scoped>
.account-type-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.account-type-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.account-type-list {
  display: grid;
  gap: 5px;
}

.account-type-option {
  display: grid;
  min-height: 76px;
  grid-template-columns: 52px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  padding: 8px 8px;
  text-align: left;
  cursor: pointer;
}

.account-type-option:active {
  background: var(--color-surface-strong);
  opacity: 0.9;
}

.type-option-icon {
  display: inline-flex;
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--color-surface-strong);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.type-option-copy {
  display: grid;
  gap: 7px;
}

.type-option-copy strong {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
}

.type-option-copy small {
  overflow: hidden;
  color: var(--color-faint);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-type-form {
  display: grid;
  gap: 14px;
}

.custom-field {
  display: grid;
  gap: 6px;
}

.custom-field span {
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 650;
}

.custom-field input,
.custom-select {
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface-strong);
  color: var(--color-text);
  padding: 0 14px;
  outline: none;
  font-size: 16px;
  scroll-margin: 96px;
  transition:
    background-color var(--transition-fast) var(--ease-standard),
    border-color var(--transition-fast) var(--ease-standard),
    box-shadow var(--transition-fast) var(--ease-standard);
}

.custom-field input:focus,
.custom-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.06);
}

:root[data-theme='dark'] .custom-field input:focus,
:root[data-theme='dark'] .custom-select:focus {
  box-shadow: 0 0 0 3px rgba(245, 245, 247, 0.08);
}

.custom-form-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 6px;
}
</style>
