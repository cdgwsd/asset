<template>
  <div class="sheet-backdrop" role="presentation" @click="$emit('close')">
    <section class="sheet-panel" role="dialog" aria-modal="true" @click.stop>
      <div class="sheet-handle"></div>
      <header class="sheet-header">
        <div>
          <p class="sheet-kicker">{{ mode === 'add' ? '新增账户' : '编辑账户' }}</p>
          <h2>{{ mode === 'add' ? '添加余额账户' : '调整账户信息' }}</h2>
        </div>
        <button class="close-button" type="button" aria-label="关闭" @click="$emit('close')">×</button>
      </header>

      <form class="form-stack" @submit.prevent="handleSubmit">
        <label class="field">
          <span>账户名称</span>
          <input v-model="form.name" placeholder="例如：支付宝、招商银行信用卡" />
        </label>

        <label class="field">
          <span>账户类型</span>
          <select v-model="form.typeId">
            <option v-for="accountType in accountTypes" :key="accountType.id" :value="accountType.id">
              {{ accountType.icon }} {{ accountType.name }}
            </option>
          </select>
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

        <label v-if="mode === 'add'" class="field">
          <span>当前余额</span>
          <input v-model="balanceInput" inputmode="decimal" placeholder="例如：1000" />
        </label>

        <label class="field">
          <span>图标</span>
          <input v-model="form.icon" placeholder="可留空，默认使用账户类型图标" />
        </label>

        <label class="field">
          <span>备注</span>
          <textarea v-model="form.note" rows="3" placeholder="可选"></textarea>
        </label>

        <div class="sheet-actions">
          <button class="secondary-button" type="button" @click="$emit('close')">取消</button>
          <button class="primary-button" type="submit">保存</button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { DEFAULT_GROUPS } from '../db/defaults'
import { createAccount, getAccountById, getAccountTypes, updateAccount } from '../services/accountService'
import { useToastStore } from '../stores/toastStore'
import type { AccountCategory, AccountType } from '../types/account'
import { parseMoneyInput } from '../utils/money'

const props = defineProps<{
  mode: 'add' | 'edit'
  accountId?: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const toastStore = useToastStore()
const accountTypes = ref<AccountType[]>([])
const groupOptions = DEFAULT_GROUPS
const balanceInput = ref('')
const form = reactive({
  name: '',
  typeId: '',
  category: 'ASSET' as AccountCategory,
  groupName: '现金',
  icon: '',
  note: ''
})

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

  if (props.mode === 'edit' && props.accountId) {
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
    balanceInput.value = String(account.currentBalance)
  } else {
    const firstType = accountTypes.value[0]
    form.name = ''
    form.typeId = firstType?.id ?? ''
    form.category = firstType?.category ?? 'ASSET'
    form.groupName = firstType?.groupName ?? '现金'
    form.icon = firstType?.icon ?? ''
    form.note = ''
    balanceInput.value = ''
    applyTypeDefaults(true)
  }

  initializing = false
}

async function handleSubmit() {
  const name = form.name.trim()
  if (!name) {
    toastStore.show('账户名称不能为空', 'error')
    return
  }

  if (!form.typeId) {
    toastStore.show('账户类型不能为空', 'error')
    return
  }

  try {
    if (props.mode === 'add') {
      const balance = parseMoneyInput(balanceInput.value)
      if (balance === null) {
        toastStore.show('当前余额格式不正确', 'error')
        return
      }

      await createAccount({
        name,
        typeId: form.typeId,
        category: form.category,
        groupName: form.groupName,
        currentBalance: balance,
        icon: form.icon,
        note: form.note
      })
    } else if (props.accountId) {
      await updateAccount(props.accountId, {
        name,
        typeId: form.typeId,
        category: form.category,
        groupName: form.groupName,
        icon: form.icon,
        note: form.note
      })
    }

    toastStore.show('保存成功')
    emit('saved')
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '保存失败', 'error')
  }
}

watch(
  () => form.typeId,
  () => {
    if (!initializing) {
      applyTypeDefaults(props.mode === 'add' && !form.name.trim())
    }
  }
)
watch(() => [props.mode, props.accountId] as const, load, { immediate: true })
</script>
