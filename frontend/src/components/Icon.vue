<script setup>
import { computed } from 'vue'
import Icon from '@/assets/Icon'

const { name } = defineProps({ 
  name: { type: String, required: true } 
})

/* recompute when `name` changes */
const IconComponent = computed(() => Icon[name] ?? null)
</script>

<template>
  <!-- render nothing if name not found (no crash) -->
  <component :is="IconComponent" :key="name" v-bind="$attrs" />
</template>
