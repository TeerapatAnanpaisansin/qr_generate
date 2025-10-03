<!-- frontend/src/components/Icon.vue -->

<script setup>
import { computed } from 'vue'
import icons from '@/assets/icons' // default export from src/assets/icons/index.js

const { name, class: klass = '' } = defineProps({
  name: { type: String, required: true },
  class: { type: String, default: '' },
})

/* recompute when `name` changes */
const IconComponent = computed(() => icons[name] ?? null)
</script>

<template>
  <!-- render nothing if name not found (no crash) -->
  <component 
  :is="IconComponent" 
  :key="name" v-bind="$attrs" 
  :class="klass" />
</template>
