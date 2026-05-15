<template>
  <div class="account-swipe" :class="{ open: expanded }" @click.stop>
    <div v-if="expanded || dragging" class="swipe-actions" aria-label="账户操作">
      <button class="swipe-action edit" type="button" @click.stop="$emit('edit', account.accountId)">编辑</button>
    </div>
    <button
      class="account-row"
      :class="{ deleted: account.isDeleted, dragging, changed: balanceChanged }"
      type="button"
      :style="rowStyle"
      :aria-label="`${account.name}，${account.typeName}，当前余额 ${balanceText}`"
      @click.stop="handleClick"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchCancel"
      @mousedown="handleMouseDown"
    >
      <span class="account-icon" aria-hidden="true">
        <img v-if="customSvgUrl" :src="customSvgUrl" width="30" height="30" alt="" />
        <AppIcon v-else-if="account.icon?.startsWith('fluent-emoji-flat:')" :iconify="account.icon" :size="24" />
        <AppIcon v-else-if="accountIconName.startsWith('fluent-emoji-flat:')" :iconify="accountIconName" :size="24" />
        <AppIcon v-else :icon="accountIcon" :size="18" />
      </span>
      <span class="account-copy">
        <span class="account-name">{{ account.name }}</span>
        <span class="account-meta">
          <span>{{ account.typeName }}</span>
          <small v-if="account.isDeleted">已删除</small>
        </span>
      </span>
      <span class="account-balance">{{ balanceText }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import type { AccountRowView } from '../types/summary'
import { getAccountIcon, resolveAccountIconName } from '../utils/accountIcon'
import { formatAccountBalance } from '../utils/money'
import { getSvgIconUrl } from '../utils/svgIcons'

const ACTION_WIDTH = 92

const props = defineProps<{
  account: AccountRowView
  hideAmount: boolean
  decimals: number
  expanded: boolean
}>()

const emit = defineEmits<{
  'quick-update': [accountId: string]
  edit: [accountId: string]
  'open-actions': [accountId: string]
  'close-actions': []
}>()

const dragging = ref(false)
const dragOffset = ref(0)
const suppressClick = ref(false)
const balanceChanged = ref(false)
let touchId: number | null = null
let mouseActive = false
let startX = 0
let startY = 0
let startOffset = 0
let horizontalIntent = false
let verticalIntent = false
let suppressTimer: number | undefined
let changedTimer: number | undefined

const balanceText = computed(() =>
  formatAccountBalance(props.account.balance, props.account.category, {
    hide: props.hideAmount,
    decimals: props.decimals
  })
)

const customSvgUrl = computed(() => {
  if (props.account.icon?.endsWith('.svg')) {
    return getSvgIconUrl(props.account.icon)
  }

  return undefined
})

const accountIcon = computed(() => getAccountIcon(props.account))
const accountIconName = computed(() => resolveAccountIconName(props.account))
const rowOffset = computed(() => (dragging.value ? dragOffset.value : props.expanded ? -ACTION_WIDTH : 0))
const rowStyle = computed(() => ({ transform: `translate3d(${rowOffset.value}px, 0, 0)` }))

function handleClick(event: MouseEvent) {
  if (suppressClick.value) {
    event.preventDefault()
    return
  }

  if (props.expanded) {
    emit('close-actions')
    return
  }

  emit('quick-update', props.account.accountId)
}

function beginGesture(clientX: number, clientY: number) {
  startX = clientX
  startY = clientY
  startOffset = props.expanded ? -ACTION_WIDTH : 0
  dragOffset.value = startOffset
  dragging.value = false
  horizontalIntent = false
  verticalIntent = false
}

function moveGesture(clientX: number, clientY: number, event: TouchEvent | MouseEvent) {
  if (verticalIntent) {
    return
  }

  const deltaX = clientX - startX
  const deltaY = clientY - startY
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)

  if (!horizontalIntent) {
    if (absY > 12 && absY > absX) {
      verticalIntent = true
      return
    }

    if (absX < 8 || absX < absY) {
      return
    }

    horizontalIntent = true
    dragging.value = true
    emit('open-actions', props.account.accountId)
  }

  event.preventDefault()
  dragOffset.value = Math.min(0, Math.max(-ACTION_WIDTH, startOffset + deltaX))
}

function finishGesture() {
  if (verticalIntent) {
    resetGesture()
    return
  }

  if (horizontalIntent) {
    suppressNextClick()

    if (dragOffset.value <= -ACTION_WIDTH * 0.45) {
      emit('open-actions', props.account.accountId)
    } else {
      emit('close-actions')
    }
  }

  resetGesture()
}

function resetGesture() {
  touchId = null
  mouseActive = false
  horizontalIntent = false
  verticalIntent = false
  dragging.value = false
}

function suppressNextClick() {
  suppressClick.value = true
  if (suppressTimer) {
    window.clearTimeout(suppressTimer)
  }
  suppressTimer = window.setTimeout(() => {
    suppressClick.value = false
    suppressTimer = undefined
  }, 320)
}

function findTouch(touches: TouchList): Touch | undefined {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index)
    if (touch && touch.identifier === touchId) {
      return touch
    }
  }

  return undefined
}

function handleTouchStart(event: TouchEvent) {
  if (event.touches.length !== 1) {
    return
  }

  const touch = event.touches[0]
  touchId = touch.identifier
  beginGesture(touch.clientX, touch.clientY)
}

function handleTouchMove(event: TouchEvent) {
  if (touchId === null) {
    return
  }

  const touch = findTouch(event.touches)
  if (!touch) {
    return
  }

  moveGesture(touch.clientX, touch.clientY, event)
}

function handleTouchEnd(event: TouchEvent) {
  if (touchId === null || !findTouch(event.changedTouches)) {
    return
  }

  finishGesture()
}

function handleTouchCancel() {
  resetGesture()
}

function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) {
    return
  }

  mouseActive = true
  beginGesture(event.clientX, event.clientY)
  window.addEventListener('mousemove', handleWindowMouseMove)
  window.addEventListener('mouseup', handleWindowMouseUp)
}

function handleWindowMouseMove(event: MouseEvent) {
  if (!mouseActive) {
    return
  }

  moveGesture(event.clientX, event.clientY, event)
}

function handleWindowMouseUp() {
  if (!mouseActive) {
    return
  }

  finishGesture()
  removeMouseListeners()
}

function removeMouseListeners() {
  window.removeEventListener('mousemove', handleWindowMouseMove)
  window.removeEventListener('mouseup', handleWindowMouseUp)
}

onBeforeUnmount(() => {
  removeMouseListeners()
  if (suppressTimer) {
    window.clearTimeout(suppressTimer)
  }
  if (changedTimer) {
    window.clearTimeout(changedTimer)
  }
})

watch(
  () => props.account.balance,
  (balance, previousBalance) => {
    if (previousBalance === undefined || balance === previousBalance) {
      return
    }

    balanceChanged.value = true
    if (changedTimer) {
      window.clearTimeout(changedTimer)
    }
    changedTimer = window.setTimeout(() => {
      balanceChanged.value = false
      changedTimer = undefined
    }, 520)
  }
)
</script>

<style scoped>
.account-swipe {
  position: relative;
  overflow: hidden;
  overscroll-behavior-x: contain;
  touch-action: pan-y;
}

.swipe-actions {
  position: absolute;
  inset: 0 0 0 auto;
  display: grid;
  width: 92px;
  grid-template-columns: 1fr;
}

.swipe-action {
  border: 0;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.swipe-action.edit {
  background: #3f7ee8;
  letter-spacing: 0.01em;
}

.account-row {
  display: grid;
  width: 100%;
  min-height: 66px;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  padding: 10px 16px 10px 12px;
  background: var(--color-surface);
  text-align: left;
  user-select: none;
  cursor: pointer;
  transition:
    transform var(--transition-normal) var(--ease-standard),
    background-color var(--transition-fast) var(--ease-standard),
    opacity var(--transition-fast) var(--ease-standard);
  -webkit-user-select: none;
  touch-action: pan-y;
  contain: layout paint;
}

.account-row.dragging {
  transition: none;
  will-change: transform;
}

button.account-row:active {
  background: var(--color-surface-strong);
  opacity: 0.96;
}

.account-row.deleted {
  opacity: 0.55;
}

.account-row .account-icon {
  width: 38px;
  height: 38px;
  margin-left: 0;
  border-radius: 12px;
}

.account-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.account-name {
  overflow: hidden;
  font-size: 16px;
  font-weight: 680;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 620;
  line-height: 1.2;
}

.account-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-meta small {
  flex: 0 0 auto;
  color: var(--color-faint);
  font-size: 11px;
  font-weight: 650;
}

.account-balance {
  max-width: 148px;
  margin-right: -2px;
  padding: 4px 0;
  overflow-wrap: anywhere;
  font-size: 15px;
  font-weight: 620;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  line-height: 1.2;
  text-align: right;
  transition:
    background-color var(--transition-list) var(--ease-standard),
    color var(--transition-list) var(--ease-standard);
}

.account-row.changed .account-balance {
  background: rgba(47, 154, 98, 0.1);
  color: var(--color-success);
  border-radius: 8px;
  padding: 4px 6px;
}

@media (max-width: 360px) {
  .account-row {
    grid-template-columns: 40px minmax(0, 1fr) minmax(86px, auto);
    gap: 10px;
    padding-right: 12px;
    padding-left: 10px;
  }

  .account-row .account-icon {
    width: 34px;
    height: 34px;
  }

  .account-balance {
    max-width: 118px;
    font-size: 14px;
  }
}
</style>
