<!-- src/pages/Register.vue -->

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-200">
    <div class="flex flex-col w-[400px] bg-white p-6 mt-10 shadow-lg backdrop-blur-lg rounded-2xl">
      <h2 class="text-2xl font-bold mb-6 text-center text-[#19B4AC]">
        Create an account
      </h2>

      <form @submit.prevent="handleRegister" class="space-y-4">

        <!-- Username -->
        <div>
          <label for="username" class="block mb-2 text-[#19B4AC] text-left text-[16px] font-bold">
            Username
          </label>

          <input
            v-model.trim="username"
            id="username"
            type="text"
            placeholder="Enter your username"
            class="w-full rounded-lg border-2 border-gray-200 px-4 py-2 pr-10 text-gray-400 placeholder-slate-400 focus:outline-teal-400"
            :class="inputClass(usernameError)"
            required
          />
          <p v-if="usernameError" class="text-red-500 text-sm mt-1">
            {{ usernameError }}
          </p>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block mb-2 text-[#19B4AC] text-left text-[16px] font-bold">
            Email
          </label>

          <input
            v-model.trim="email"
            id="email"
            type="email"
            placeholder="you@example.com"
            class="w-full rounded-lg border-2 border-gray-200 px-4 py-2 pr-10 text-gray-400 placeholder-slate-400 focus:outline-teal-400"
            :class="inputClass(emailError)"
            required
          />
          <p v-if="emailError" class="text-red-500 text-sm mt-1">
            {{ emailError }}
          </p>
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block mb-2 text-[#19B4AC] text-left text-[16px] font-bold">
            Password
          </label>
          
          <div class="relative">
            <input
              v-model="password"
              id="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Min 6 characters"
              class="w-full rounded-lg border-2 border-gray-200 px-4 py-2 pr-10 text-gray-400 placeholder-slate-400 focus:outline-teal-400"
              :class="inputClass(passwordError)"
              required
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="text-sm absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              <Icon :name="showPassword ? 'password_visibility_true' : 'password_visibility_false'" class="w-5 h-5"/>
            </button>
          </div>
          <p v-if="passwordError" class="text-red-500 text-sm mt-1">
            {{ passwordError }}
          </p>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirm-password" class="block mb-2 text-[#19B4AC] text-left text-[16px] font-bold">
            Confirm Password
          </label>
          <div class="relative">
            <input
              v-model="confirmPassword"
              id="confirm-password"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="Re-enter your password"
              class="w-full rounded-lg border-2 border-gray-200 px-4 py-2 pr-10 text-gray-400 placeholder-slate-400 focus:outline-teal-400"
              :class="inputClass(confirmPasswordError)"
              required
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="text-sm absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              tabindex="-1"
            >
              <Icon :name="showConfirmPassword ? 'password_visibility_true' : 'password_visibility_false'" class="w-5 h-5"/>
            </button>
          </div>
          <p v-if="confirmPasswordError" class="text-red-500 text-sm mt-1">{{ confirmPasswordError }}</p>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-[#19B4AC] hover:bg-[#139690] text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          <span v-if="loading" class="loader mr-2"></span>
          {{ loading ? 'Creating account...' : 'Create account' }}
        </button>

        <!-- Login Link -->
        <div>
          <p class="text-sm text-gray-600 text-center">
            Already have an account?
            <RouterLink to="/login" class="text-[#19B4AC] hover:underline">Login</RouterLink>
          </p>
        </div>

        <p v-if="serverError" class="text-red-600 text-sm text-center mt-2">{{ serverError }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { register as apiRegister } from '@/api/api.js'
import { useRouter } from 'vue-router'

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const router = useRouter()

// state
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

// ui state
const loading = ref(false)
const usernameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const serverError = ref('')

// helpers: unify border + ring color; ring width is in base class
const inputClass = (err) =>
  err
    ? 'border-2 border-red-500 focus:ring-red-400'
    : 'border-2 border-gray-200 focus:ring-teal-400'

// actions
async function handleRegister () {
  usernameError.value = ''
  emailError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''
  serverError.value = ''

  if (!username.value.trim()) usernameError.value = 'Username is required'
  if (!email.value.includes('@')) emailError.value = 'Enter a valid email'
  if (password.value.length < 6) passwordError.value = 'Min 6 characters'
  if (password.value !== confirmPassword.value) confirmPasswordError.value = 'Passwords do not match'

  if (usernameError.value || emailError.value || passwordError.value || confirmPasswordError.value) return

  loading.value = true
  try {
    await apiRegister({
      user_name: username.value.trim(),
      user_email: email.value.trim(),
      user_password: password.value
    })
    router.push('/qr')
  } catch (e) {
    serverError.value = e?.response?.data?.error ?? 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
