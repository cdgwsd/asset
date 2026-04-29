<template>
  <div class="dialog-backdrop" role="presentation" @click="$emit('cancel')">
    <section class="confirm-dialog" role="dialog" aria-modal="true" @click.stop>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <div class="dialog-actions">
        <button class="secondary-button" type="button" @click="$emit('cancel')">{{ cancelText }}</button>
        <button class="primary-button" :class="{ danger }" type="button" @click="$emit('confirm')">
          {{ confirmText }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    message: string
    cancelText?: string
    confirmText?: string
    danger?: boolean
  }>(),
  {
    cancelText: '取消',
    confirmText: '确认',
    danger: false
  }
)

defineEmits<{
  cancel: []
  confirm: []
}>()
</script>
