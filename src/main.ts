import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import './styles/variables.css'
import './styles/global.css'
import { startViewportKeyboardAdapter } from './utils/viewport'

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

startViewportKeyboardAdapter()

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
