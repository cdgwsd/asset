<template>
  <section class="empty-state">
    <div class="empty-illustration">
      <AppIcon :icon="WalletCards" :size="28" />
    </div>
    <h2>还没有账户</h2>
    <p>添加你的第一个账户，开始记录资产余额。</p>
    <button class="primary-button icon-button-text" type="button" @click="$emit('add-account')">
      <AppIcon :icon="Plus" />
      <span>新增账户</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import { Plus, WalletCards } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'

defineEmits<{
  'add-account': []
}>()
</script>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 38px 22px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.54);
  text-align: center;
}

.empty-illustration {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 20px;
  background: var(--color-surface-strong);
  color: var(--color-muted);
}
</style>
