import { createApp } from 'vue'
import { createWebHistory, createRouter } from 'vue-router'
import './styles/global.css'
import App from './App.vue'
import Login from './pages/Login.vue'
import Register from './pages/Register.vue'
import Qr from './pages/Qr.vue'
import Icon from '@/components/Icon.vue'
import { setToken, clearAuth } from '@/api/api.js'

// Restore saved JWT token
const saved = localStorage.getItem('jwt')
if (saved) setToken(saved)

const routes = [
  { path: '/', redirect: () => (localStorage.getItem('jwt') ? '/qr' : '/login') },
  { path: '/login', name: 'Login', component: Login, meta: { public: true } },
  { path: '/register', name: 'Register', component: Register, meta: { public: true } },
  { path: '/qr', name: 'Qr', component: Qr },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * Navigation guard - redirect unauthenticated users to login
 */
router.beforeEach((to) => {
  const authed = Boolean(localStorage.getItem('jwt'))
  if (!to.meta.public && !authed) return { path: '/login' }
  return true
})

const app = createApp(App)
app.use(router)
app.component('Icon', Icon)
app.mount('#app')