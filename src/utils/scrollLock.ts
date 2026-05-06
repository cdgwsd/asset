let lockCount = 0
let pendingUnlock = false

function applyLock(): void {
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.documentElement.dataset.scrollLocked = 'true'
}

function applyUnlock(): void {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  delete document.documentElement.dataset.scrollLocked
}

export function lockBodyScroll(): void {
  lockCount += 1
  pendingUnlock = false
  if (lockCount > 1) {
    return
  }

  applyLock()
}

export function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) {
    return
  }

  pendingUnlock = true
  queueMicrotask(() => {
    if (!pendingUnlock || lockCount > 0) {
      return
    }

    pendingUnlock = false
    applyUnlock()
  })
}
