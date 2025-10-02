<!-- frontend/src/App.vue -->

<template>
  <div class="bg-gray-200">
    <!-- <p class="text-center text-lg font-bold mb-2 "> Current Route: {{ $route.path }}</p>
    <nav class="mb-4 flex gap-4 justify-center">
      <RouterLink to="/login" class="hover:underline">Login</RouterLink>
      <RouterLink to="/register" class="hover:underline">Register</RouterLink>
      <RouterLink to="/qr" class="hover:underline">Qr</RouterLink>
    </nav> -->
    <RouterView />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();

</script>