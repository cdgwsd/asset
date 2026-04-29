<template>
  <Teleport to="body">
    <template v-if="hideOverlay">
      <section
        ref="panelRef"
        class="bottom-sheet-panel"
        :class="[panelClass, { dragging: isDragging, closing }]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelledby"
        :style="{ transform: `translateY(${dragY}px)` }"
        @click.stop
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
        @transitionend="onTransitionEnd"
      >
        <div class="bottom-sheet-handle" aria-hidden="true"></div>
        <div ref="contentRef" class="bottom-sheet-content" :class="contentClass">
          <slot />
        </div>
      </section>
    </template>
    <div
      v-else
      class="bottom-sheet-overlay"
      :class="{ closing }"
      role="presentation"
      @click="emitClose"
    >
      <section
        ref="panelRef"
        class="bottom-sheet-panel"
        :class="[panelClass, { dragging: isDragging, closing }]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelledby"
        :style="{ transform: `translateY(${dragY}px)` }"
        @click.stop
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
        @transitionend="onTransitionEnd"
      >
        <div class="bottom-sheet-handle" aria-hidden="true"></div>
        <div ref="contentRef" class="bottom-sheet-content" :class="contentClass">
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

withDefaults(
  defineProps<{
    panelClass?: string
    contentClass?: string
    labelledby?: string
    hideOverlay?: boolean
  }>(),
  {
    panelClass: '',
    contentClass: '',
    labelledby: undefined,
    hideOverlay: false
  }
)

const emit = defineEmits<{
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const startY = ref(0)
const dragY = ref(0)
const isDragging = ref(false)
const canDrag = ref(false)
const closing = ref(false)

function panelHeight(): number {
  return panelRef.value?.offsetHeight ?? window.innerHeight * 0.8
}

function emitClose() {
  if (closing.value) {
    return
  }

  closing.value = true
  isDragging.value = false
  dragY.value = panelHeight()
}

function onTransitionEnd(event: TransitionEvent) {
  if (closing.value && event.propertyName === 'transform') {
    emit('close')
  }
}

function onTouchStart(event: TouchEvent) {
  if (closing.value) {
    return
  }

  const touch = event.touches[0]
  if (!touch) {
    return
  }

  startY.value = touch.clientY
  canDrag.value = (contentRef.value?.scrollTop ?? 0) <= 0
  isDragging.value = false
}

function onTouchMove(event: TouchEvent) {
  if (closing.value) {
    return
  }

  const touch = event.touches[0]
  if (!touch || !canDrag.value) {
    return
  }

  const nextDragY = Math.max(0, touch.clientY - startY.value)
  if (nextDragY <= 0) {
    dragY.value = 0
    return
  }

  dragY.value = nextDragY
  isDragging.value = true
  event.preventDefault()
}

function onTouchEnd() {
  if (closing.value) {
    return
  }

  if (!isDragging.value) {
    dragY.value = 0
    return
  }

  const shouldClose = dragY.value > 100 || dragY.value > panelHeight() * 0.2

  if (shouldClose) {
    emitClose()
    return
  }

  dragY.value = 0
  isDragging.value = false
}

onMounted(lockBodyScroll)
onUnmounted(unlockBodyScroll)
</script>

<style scoped>
.bottom-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  touch-action: manipulation;
  animation: overlay-in 180ms ease-out;
  transition: opacity 160ms ease-in;
}

.bottom-sheet-overlay.closing {
  opacity: 0;
}

.bottom-sheet-panel {
  position: fixed;
  z-index: 1000;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  width: min(100%, 560px);
  height: 80svh;
  height: calc(var(--stable-vh) * 80);
  max-height: 80svh;
  max-height: calc(var(--stable-vh) * 80);
  min-height: 80svh;
  min-height: calc(var(--stable-vh) * 80);
  flex-direction: column;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 30px 30px 0 0;
  background: var(--color-surface);
  box-shadow: 0 -24px 70px rgba(0, 0, 0, 0.18);
  transition: transform 200ms ease-out;
  animation: sheet-in 200ms ease-out;
  will-change: transform;
}

.bottom-sheet-panel.dragging {
  transition: none;
}

.bottom-sheet-panel.closing {
  transition: transform 200ms ease-in;
}

.bottom-sheet-handle {
  width: 44px;
  height: 5px;
  flex: 0 0 auto;
  margin: 12px auto 16px;
  border-radius: 999px;
  background: var(--color-border);
}

.bottom-sheet-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px calc(22px + var(--safe-bottom));
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
</style>
