<!-- frontend/src/App.vue -->

<template>
  <div class="bg-gray-200">
    <RouterView />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();

</script>