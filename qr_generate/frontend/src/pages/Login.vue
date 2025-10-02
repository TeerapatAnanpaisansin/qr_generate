<!-- frontend/src/pages/Login.vue -->

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-200">    
    <!-- <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm"> -->
    <div class="flex flex-col w-[400px] bg-white p-6 mt-10 shadow-lg backdrop-blur-lg rounded-2xl"> 
      <h2 class="text-2xl font-bold font-sans mb-6 text-center text-[#19B4AC]">Welcome Back!</h2>

      <!-- Vue directive; prevents default form submission and calls -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        
        <!-- Username / Email -->
        <div>
          <label for="username" class="block mb-1 text-[#19B4AC] text-left text-[16px] font-bold">
            Username
          </label>
          <input
            v-model="username"
            type="text"
            id="username"
            :class="[inputClass(usernameError)]"
            class="w-full rounded-lg border-2 border-gray-200 px-4 py-2 pr-10 text-gray-400 placeholder-slate-400 focus:outline-teal-400"
            placeholder="Enter your username"
            required
          />
          <p v-if="usernameError" class="text-red-500 text-sm mt-1">
            {{ usernameError }}
          </p>
        </div>
        
        <!-- Password -->
        <div>
          <label for="password" class="block mb-1 text-[#19B4AC] text-left text-[16px] font-bold">Password</label>
          <div class="relative">
            <input
              v-model="password"
              id="password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full rounded-lg border-2 border-gray-200 px-4 py-2 pr-10 text-gray-400 placeholder-slate-400 focus:outline-teal-400"
              placeholder="Enter your password"
            />

            <!-- Toggle password visibility --> 
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="text-sm absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700">
              <Icon :name="showPassword ? 'password_visibility_true' : 'password_visibility_false' " class="w-5 h-5"/>
            </button>
          </div>
          <p v-if="passwordError" class="text-red-500 text-sm mt-1">
            {{ passwordError }}
          </p>
        </div>

        <!-- Remember Me + Forgot Password -->
        <!-- <div class="flex items-center justify-between">
          <label class="flex items-center">
            <input type="checkbox" v-model="rememberMe" class="mr-2">
            <span class="text-gray-600 text-sm">Remember me</span>
          </label>
          <a href="#" class="text-[#19B4AC] text-sm hover:underline">Forgot password?</a>
        </div> -->

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-[#19B4AC] hover:bg-[#139690] text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          <span v-if="loading" class="loader mr-2"></span>
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>

      <!-- Optional: Signup Link -->
      <p class="text-center text-gray-500 text-sm mt-4">
        Don't have an account?
        <router-link to="/register" class="text-[#19B4AC] hover:underline"> Sign up </router-link>
      </p>
    </div>
  </div>
</template>

<script> 
import { ref } from 'vue'
import { login } from "@/api/api.js";
const showPassword = ref(false)

export default {
  name: "LoginForm",
  data() {
    return {
      username: "",
      password: "",
      rememberMe: false,
      showPassword: false,
      loading: false,
      usernameError: "",
      passwordError: "",
    };
  },
  methods: {
    inputClass(error) {
      return [
        error ? "border-2 border-red-500 focus:ring-red-400" : "border-2 border-gray-200 focus:ring-teal-400",
      ];
    },
    validate() {
      let valid = true;
      this.usernameError = "";
      this.passwordError = "";

      if (!this.username.trim()) {
        this.usernameError = "Username is required.";
        valid = false;
      }
      if (!this.password.trim()) {
        this.passwordError = "Password is required.";
        valid = false;
      } else if (this.password.length < 6) {
        this.passwordError = "Password must be at least 6 characters.";
        valid = false;
      }

      return valid;
    },
    async handleLogin() {
      this.usernameError = "";
      this.passwordError = "";
      if (!this.validate()) return;
      this.loading = true;
      
      try {
        const req_data = {
          user_name_or_email: this.username,
          user_password: this.password,
          // remember_me: this.rememberMe,
        }
        console.log("Login request data:", JSON.stringify(req_data));
        const data = await login(req_data);
        localStorage.setItem("role", data.user.role); // store user role in localStorage

        console.log("Logged in:", data);
        this.$router.push("/qr");
      
      } catch (error) {
        this.passwordError =
          error?.response?.data?.error || "Invalid credentials";
        console.error("Login error:", error);
      } finally {
        this.loading = false;
      }
    },
  },
}
</script>