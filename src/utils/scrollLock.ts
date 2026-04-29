let lockCount = 0
let scrollY = 0
let pendingUnlock = false

function applyLock(): void {
  scrollY = window.scrollY

  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'relative'
  document.body.style.top = `-${scrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
}

function applyUnlock(): void {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  window.scrollTo(0, scrollY)
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
