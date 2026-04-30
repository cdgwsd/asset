<template>
  <Transition name="page-route" appear mode="out-in">
    <Home key="home" />
  </Transition>
  <ToastHost />
</template>

<script setup lang="ts">
import Home from './pages/Home.vue'
import ToastHost from './components/ToastHost.vue'
</script>
