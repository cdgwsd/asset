<template>
  <Icon
    v-if="iconify"
    :icon="iconify"
    :width="size"
    :height="size"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : label"
    class="app-icon"
  />
  <component
    v-else
    :is="icon"
    class="app-icon"
    :size="size"
    :stroke-width="strokeWidth"
    :color="color"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : label"
  />
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { Icon } from '@iconify/vue'

withDefaults(
  defineProps<{
    icon?: Component
    iconify?: string
    size?: number | string
    strokeWidth?: number
    color?: string
    label?: string
    decorative?: boolean
  }>(),
  {
    icon: undefined,
    iconify: undefined,
    size: 20,
    strokeWidth: 1.8,
    color: 'currentColor',
    label: undefined,
    decorative: true
  }
)
</script>
