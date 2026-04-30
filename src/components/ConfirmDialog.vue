<template>
  <div class="dialog-backdrop" role="presentation" @click="$emit('cancel')">
    <section class="confirm-dialog" role="dialog" aria-modal="true" @click.stop>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <div class="dialog-actions">
        <button class="secondary-button" type="button" @click="$emit('cancel')">{{ cancelText }}</button>
        <button
          class="primary-button icon-button-text"
          :class="{ danger }"
          type="button"
          :disabled="busy"
          @click="$emit('confirm')"
        >
          <AppIcon :icon="danger ? Trash2 : Check" />
          <span>{{ busy ? '处理中...' : confirmText }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Check, Trash2 } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    title: string
    message: string
    cancelText?: string
    confirmText?: string
    danger?: boolean
    busy?: boolean
  }>(),
  {
    cancelText: '取消',
    confirmText: '确认',
    danger: false,
    busy: false
  }
)

defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(12px);
  animation: overlay-in var(--transition-overlay) var(--ease-standard) backwards;
}

.confirm-dialog {
  width: min(100%, 360px);
  border-radius: 26px;
  background: var(--color-surface);
  padding: 22px;
  box-shadow: var(--shadow-card);
  animation: dialog-in var(--transition-dialog) var(--ease-standard) backwards;
  will-change: transform, opacity;
}

.dialog-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 6px;
}
</style>
