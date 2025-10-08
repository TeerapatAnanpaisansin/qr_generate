import { createApp } from 'vue'
import { createWebHistory, createRouter } from 'vue-router'
import './styles/global.css'
import App from './App.vue'
import Login from './pages/Login.vue'
import Register from './pages/Register.vue'
import Qr from './pages/Qr.vue'
// import Test from './pages/Test.vue'

import Icon from '@/components/Icon.vue'

import { setToken } from "@/api/api.js";

const saved = localStorage.getItem("jwt");
if (saved) setToken(saved);

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/qr', name: 'Qr', component: Qr },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const app = createApp(App)
app.use(router) 
app.component('Icon', Icon) 
app.mount('#app') 