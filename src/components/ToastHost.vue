<template>
  <div class="toast-host" aria-live="polite" aria-atomic="true">
    <div v-for="toast in toastStore.items" :key="toast.id" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toastStore'

const toastStore = useToastStore()
</script>

<style scoped>
.toast-host {
  position: fixed;
  bottom: calc(18px + var(--safe-bottom) + var(--keyboard-height));
  right: 16px;
  left: 16px;
  z-index: 1200;
  display: grid;
  justify-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast {
  max-width: min(100%, 360px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(20, 20, 20, 0.88);
  color: #ffffff;
  padding: 10px 15px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
  font-size: 14px;
  font-weight: 650;
  animation: toast-in var(--transition-fast) var(--ease-standard) backwards;
  will-change: transform, opacity;
}

.toast.error {
  background: rgba(198, 62, 48, 0.94);
}

.toast.info {
  background: rgba(71, 88, 104, 0.94);
}
</style>
