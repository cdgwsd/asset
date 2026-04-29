<template>
  <section class="empty-state">
    <div class="empty-illustration">⌁</div>
    <h2>还没有账户</h2>
    <p>添加你的第一个账户，开始记录资产余额。</p>
    <button class="primary-button" type="button" @click="$emit('add-account')">新增账户</button>
  </section>
</template>

<script setup lang="ts">
defineEmits<{
  'add-account': []
}>()
</script>
