<template>
  <header class="app-header">
    <button class="icon-button" type="button" aria-label="打开设置" @click="$emit('open-settings')">
      <AppIcon :icon="Settings" />
    </button>
    <h1>钱包</h1>
    <div class="header-actions">
      <button class="icon-button" type="button" aria-label="查看净资产趋势" @click="$emit('open-trend')">
        <AppIcon :icon="LineChart" />
      </button>
      <button class="icon-button add-button" type="button" aria-label="新增账户" @click="$emit('add-account')">
        <AppIcon :icon="Plus" :size="22" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { LineChart, Plus, Settings } from 'lucide-vue-next'
import AppIcon from './AppIcon.vue'

defineEmits<{
  'open-settings': []
  'open-trend': []
  'add-account': []
}>()
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 96px 1fr 96px;
  align-items: center;
  margin: -10px -20px 6px;
  padding: calc(10px + var(--safe-top)) 20px 10px;
  background: linear-gradient(180deg, rgba(247, 247, 248, 0.94), rgba(247, 247, 248, 0.82));
  backdrop-filter: blur(8px);
}

:root[data-theme='dark'] .app-header {
  background: linear-gradient(180deg, rgba(14, 14, 15, 0.96), rgba(14, 14, 15, 0.84));
}

.app-header h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: center;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
</style>
