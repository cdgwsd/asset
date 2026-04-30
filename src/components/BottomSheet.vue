<template>
  <Teleport to="body">
    <template v-if="hideOverlay">
      <section
        ref="panelRef"
        class="bottom-sheet-panel"
        :class="[panelClass, { dragging: isDragging, closing: isClosing }]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelledby"
        :style="{ '--sheet-drag-y': `${dragY}px` }"
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
      :class="{ closing: isClosing }"
      role="presentation"
      @click="emitClose"
    >
      <section
        ref="panelRef"
        class="bottom-sheet-panel"
        :class="[panelClass, { dragging: isDragging, closing: isClosing }]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelledby"
        :style="{ '--sheet-drag-y': `${dragY}px` }"
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const props = withDefaults(
  defineProps<{
    panelClass?: string
    contentClass?: string
    labelledby?: string
    hideOverlay?: boolean
    closing?: boolean
  }>(),
  {
    panelClass: '',
    contentClass: '',
    labelledby: undefined,
    hideOverlay: false,
    closing: false
  }
)

const emit = defineEmits<{
  close: []
  'after-close': []
}>()

const panelRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const startY = ref(0)
const dragY = ref(0)
const isDragging = ref(false)
const canDrag = ref(false)
const internalClosing = ref(false)
const closeCompleted = ref(false)
const isClosing = computed(() => props.closing || internalClosing.value)

function panelHeight(): number {
  return panelRef.value?.offsetHeight ?? window.innerHeight * 0.8
}

function emitClose() {
  if (isClosing.value) {
    return
  }

  closeCompleted.value = false
  internalClosing.value = true
  isDragging.value = false
  dragY.value = 0
}

function onTransitionEnd(event: TransitionEvent) {
  if (
    event.target !== panelRef.value ||
    event.propertyName !== 'transform' ||
    !isClosing.value ||
    closeCompleted.value
  ) {
    return
  }

  closeCompleted.value = true

  if (internalClosing.value) {
    emit('close')
  }

  emit('after-close')
}

function onTouchStart(event: TouchEvent) {
  if (isClosing.value) {
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
  if (isClosing.value) {
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
  if (isClosing.value) {
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

watch(
  () => props.closing,
  (closing) => {
    if (closing) {
      closeCompleted.value = false
      isDragging.value = false
      dragY.value = 0
    }
  }
)
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
  animation: overlay-in var(--transition-overlay) var(--ease-standard) backwards;
  transition: opacity var(--transition-overlay) var(--ease-exit);
  will-change: opacity;
}

.bottom-sheet-overlay.closing {
  animation: none;
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
  transform: translate3d(0, var(--sheet-drag-y, 0), 0);
  transition:
    transform var(--transition-sheet) var(--ease-standard),
    opacity var(--transition-sheet) var(--ease-standard);
  animation: sheet-in var(--transition-sheet) var(--ease-standard) backwards;
  backface-visibility: hidden;
  will-change: transform, opacity;
}

.bottom-sheet-panel.dragging {
  transition: none;
}

.bottom-sheet-panel.closing {
  animation: none;
  opacity: 0;
  transform: translate3d(0, calc(100% + var(--safe-bottom) + 24px), 0);
  transition:
    transform var(--transition-sheet) var(--ease-exit),
    opacity var(--transition-overlay) var(--ease-exit);
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
