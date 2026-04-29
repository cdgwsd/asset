<template>
  <div class="sheet-backdrop" role="presentation" @click="$emit('close')">
    <section class="sheet-panel compact" role="dialog" aria-modal="true" @click.stop>
      <div class="sheet-handle"></div>
      <header class="sheet-header">
        <div>
          <p class="sheet-kicker">修改余额</p>
          <h2>{{ account?.name || '账户' }}</h2>
        </div>
        <button class="close-button" type="button" aria-label="关闭" @click="$emit('close')">×</button>
      </header>

      <form class="form-stack" @submit.prevent="handleSubmit">
        <label class="field">
          <span>当前余额</span>
          <input
            v-model="balanceInput"
            inputmode="decimal"
            autocomplete="off"
            placeholder="例如：17258.14"
            enterkeyhint="done"
          />
        </label>

        <label class="field">
          <span>备注，可选</span>
          <input v-model="note" placeholder="例如：月底更新" />
        </label>

        <p v-if="account?.category === 'LIABILITY'" class="helper-text">负债账户也输入正数，例如信用卡欠款 3000。</p>

        <div class="sheet-actions">
          <button class="secondary-button" type="button" @click="$emit('close')">取消</button>
          <button class="primary-button" type="submit">保存</button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getAccountById } from '../services/accountService'
import { updateAccountBalance } from '../services/balanceService'
import { useToastStore } from '../stores/toastStore'
import type { Account } from '../types/account'
import { parseMoneyInput } from '../utils/money'

const props = defineProps<{
  accountId: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const toastStore = useToastStore()
const account = ref<Account | null>(null)
const balanceInput = ref('')
const note = ref('')

async function loadAccount() {
  account.value = (await getAccountById(props.accountId)) ?? null
  balanceInput.value = account.value ? String(account.value.currentBalance) : ''
  note.value = ''
}

async function handleSubmit() {
  if (!account.value) {
    toastStore.show('账户不存在', 'error')
    return
  }

  const balance = parseMoneyInput(balanceInput.value)
  if (balance === null) {
    toastStore.show('余额格式不正确', 'error')
    return
  }

  try {
    const result = await updateAccountBalance({
      accountId: props.accountId,
      newBalance: balance,
      note: note.value,
      source: 'MANUAL_UPDATE'
    })

    toastStore.show(result.changed ? '保存成功' : '余额未变化', result.changed ? 'success' : 'info')
    emit('saved')
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '保存失败', 'error')
  }
}

watch(() => props.accountId, loadAccount, { immediate: true })
</script>
