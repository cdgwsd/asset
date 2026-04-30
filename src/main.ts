import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import './styles/variables.css'
import './styles/global.css'

if (import.meta.env.DEV) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations
      .filter((registration) => registration.scope.includes('/asset/'))
      .forEach((registration) => {
        void registration.unregister()
      })
  })
} else {
  registerSW({ immediate: true })
}

function isFormFieldActive() {
  const activeElement = document.activeElement
  return activeElement instanceof HTMLElement && Boolean(activeElement.closest('input, textarea, select'))
}

let stableVh = window.innerHeight * 0.01

function setStableViewportHeight() {
  if (isFormFieldActive()) {
    return
  }

  stableVh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--stable-vh', `${stableVh}px`)
}

setStableViewportHeight()
window.addEventListener('resize', setStableViewportHeight)
window.addEventListener('orientationchange', () => {
  window.setTimeout(setStableViewportHeight, 300)
})

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    if (!isFormFieldActive()) {
      setStableViewportHeight()
    }
  })
}

document.addEventListener('focusout', () => {
  if (!isFormFieldActive()) {
    window.setTimeout(setStableViewportHeight, 120)
  }
})

let lastTouchEnd = 0
document.addEventListener(
  'touchend',
  (event) => {
    const target = event.target
    if (target instanceof HTMLElement && target.closest('input, textarea, select')) {
      lastTouchEnd = Date.now()
      return
    }

    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      event.preventDefault()
    }
    lastTouchEnd = now
  },
  { passive: false }
)

createApp(App).use(createPinia()).mount('#app')
