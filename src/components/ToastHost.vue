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
