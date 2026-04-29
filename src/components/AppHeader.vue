<template>
  <header class="app-header">
    <button class="icon-button" type="button" aria-label="打开设置" @click="$emit('open-settings')">
      ⚙️
    </button>
    <h1>钱包</h1>
    <div class="header-actions">
      <button class="icon-button" type="button" aria-label="查看趋势" @click="$emit('open-trend')">
        📈
      </button>
      <button class="icon-button add-button" type="button" aria-label="新增账户" @click="$emit('add-account')">
        ＋
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineEmits<{
  'open-settings': []
  'open-trend': []
  'add-account': []
}>()
</script>
