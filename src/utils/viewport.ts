const KEYBOARD_THRESHOLD = 80
const MIN_SHEET_VISIBLE_HEIGHT = 220
const SHEET_HEIGHT_RATIO = 0.8

let stableAppHeight = 0
let frameId: number | undefined
let lockedAppScrollTop: number | null = null

function isFormFieldActive() {
  const activeElement = document.activeElement
  return activeElement instanceof HTMLElement && Boolean(activeElement.closest('input, textarea, select'))
}

function appScroller() {
  return document.querySelector<HTMLElement>('.app-container')
}

function setRootPixelVar(name: string, value: number) {
  document.documentElement.style.setProperty(name, `${Math.max(0, Math.round(value))}px`)
}

function resetRootScroll() {
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0)
  }

  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

function lockAppScrollPosition() {
  const scroller = appScroller()
  if (!scroller || lockedAppScrollTop !== null) {
    return
  }

  lockedAppScrollTop = scroller.scrollTop
}

function restoreAppScrollPosition() {
  const scroller = appScroller()
  if (!scroller || lockedAppScrollTop === null || scroller.scrollTop === lockedAppScrollTop) {
    return
  }

  scroller.scrollTop = lockedAppScrollTop
}

function releaseAppScrollPosition() {
  if (isFormFieldActive()) {
    return
  }

  lockedAppScrollTop = null
}

function updateViewportVars() {
  const visualViewport = window.visualViewport
  const layoutHeight = window.innerHeight
  const visualHeight = visualViewport?.height ?? layoutHeight
  const visualOffsetTop = visualViewport?.offsetTop ?? 0
  const visualBottom = visualOffsetTop + visualHeight
  const measuredKeyboardHeight = Math.max(0, layoutHeight - visualBottom)
  const inferredKeyboardHeight = stableAppHeight > 0 ? Math.max(0, stableAppHeight - visualHeight) : 0
  const possibleKeyboardHeight = Math.max(measuredKeyboardHeight, isFormFieldActive() ? inferredKeyboardHeight : 0)
  const keyboardOpen = isFormFieldActive() && possibleKeyboardHeight > KEYBOARD_THRESHOLD
  const keyboardHeight = keyboardOpen ? possibleKeyboardHeight : 0

  if (!stableAppHeight || !keyboardOpen) {
    stableAppHeight = layoutHeight
  }

  const sheetHeight = stableAppHeight * SHEET_HEIGHT_RATIO
  const sheetVisibleHeight = Math.max(MIN_SHEET_VISIBLE_HEIGHT, sheetHeight - keyboardHeight)

  setRootPixelVar('--vvh', visualHeight)
  setRootPixelVar('--visual-offset-top', visualOffsetTop)
  setRootPixelVar('--keyboard-height', keyboardHeight)
  setRootPixelVar('--app-height', stableAppHeight)
  setRootPixelVar('--sheet-height', sheetHeight)
  setRootPixelVar('--sheet-visible-height', Math.min(sheetHeight, sheetVisibleHeight))
  document.documentElement.style.setProperty('--stable-vh', `${stableAppHeight * 0.01}px`)
  document.documentElement.dataset.keyboard = keyboardOpen ? 'open' : 'closed'
  resetRootScroll()
  if (isFormFieldActive()) {
    restoreAppScrollPosition()
  }
}

function scheduleViewportUpdate() {
  if (frameId !== undefined) {
    window.cancelAnimationFrame(frameId)
  }

  frameId = window.requestAnimationFrame(() => {
    frameId = undefined
    updateViewportVars()
  })
}

export function startViewportKeyboardAdapter() {
  updateViewportVars()

  window.addEventListener('resize', scheduleViewportUpdate, { passive: true })
  window.addEventListener('orientationchange', () => {
    window.setTimeout(scheduleViewportUpdate, 320)
  })
  window.addEventListener('scroll', resetRootScroll, { passive: true })
  document.addEventListener(
    'focusin',
    () => {
      lockAppScrollPosition()
      scheduleViewportUpdate()
    },
    true
  )
  document.addEventListener(
    'focusout',
    () => {
      window.setTimeout(scheduleViewportUpdate, 180)
      window.setTimeout(releaseAppScrollPosition, 220)
      window.setTimeout(scheduleViewportUpdate, 360)
      window.setTimeout(releaseAppScrollPosition, 420)
    },
    true
  )
  document.addEventListener(
    'scroll',
    (event) => {
      if (event.target === appScroller() && isFormFieldActive()) {
        restoreAppScrollPosition()
      }
    },
    true
  )

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleViewportUpdate, { passive: true })
    window.visualViewport.addEventListener('scroll', scheduleViewportUpdate, { passive: true })
  }
}
