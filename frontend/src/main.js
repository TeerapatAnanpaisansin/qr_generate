// frontend/src/main.js
import { createApp } from 'vue'
import { createWebHistory, createRouter } from 'vue-router'
import './styles/global.css'
import App from './App.vue'
import Login from './pages/Login.vue'
import Register from './pages/Register.vue'
import Qr from './pages/Qr.vue'
import Icon from '@/components/Icon.vue'
import { setToken } from '@/api/api.js'

const saved = localStorage.getItem('jwt')
if (saved) setToken(saved)

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login, meta: { public: true } },
  { path: '/register', name: 'Register', component: Register, meta: { public: true } },
  { path: '/qr', name: 'Qr', component: Qr },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const authed = Boolean(localStorage.getItem('jwt'))
  if (!to.meta.public && !authed) return { path: '/login' }
  if (to.name === 'Login' && authed) return { path: '/qr' }
  return true
})

const app = createApp(App)
app.use(router)
app.component('Icon', Icon)
app.mount('#app')
