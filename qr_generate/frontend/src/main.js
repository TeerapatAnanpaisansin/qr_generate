// frontend/src/main.js

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

const router = createRouter({     // Create the router instance
  history: createWebHistory (import.meta.env.DEV ? '/' : '/app/'),   // Use browser history mode (no #)
  routes,                         // Plug in the route table above
})

export default router

const app = createApp(App)        // Create the Vue app with App.vue as root
app.use(router)                   // Tell the app to use Vue Router
app.component('Icon', Icon)       // global register the Icon component
app.mount('#app')                 // Mount the app onto <div id="app">