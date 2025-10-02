<!-- frontend/src/components/login_notification.vue -->

<template>

  <div
    class="fixed top-4 right-4 z-50 rounded-lg shadow-lg px-4 py-3 text-white"
    :class="bgClass"
    role="alert"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <div class="flex items-start gap-3">
      <span class="font-semibold capitalize">{{ type }}</span>
      <span class="opacity-90">{{ message }}</span>
    </div>

    <!-- Progress bar (bottom) -->
    <div class="absolute left-0 bottom-0 w-full h-1 bg-white/30">
      <div class="h-full bg-white" :style="{ width: progress + '%' }"></div>
    </div>
  </div>

</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  type: { type: String, default: 'success' },         // 'success' | 'error' | 'info'
  message: { type: String, default: '' },
  duration: { type: Number, default: 1500 }           // ms until auto-close
})
const emit = defineEmits(['close'])

const bgClass = computed(() =>
  props.type === 'error' ? 'bg-red-600'
  : props.type === 'info' ? 'bg-gray-800'
  : 'bg-emerald-600'
)

// simple rAF-driven progress so it's smooth and pauseable
const progress = ref(100)   // width percentage
const paused = ref(false)
let start = 0
let elapsed = 0
let rafId = 0

function tick(ts) {
  if (!start) start = ts - elapsed
  if (paused.value) {
    // freeze elapsed; keep scheduling frames so we resume seamlessly
    rafId = requestAnimationFrame(tick)
    return
  }
  elapsed = ts - start
  const remaining = Math.max(0, props.duration - elapsed)
  progress.value = (remaining / props.duration) * 100
  if (remaining <= 0) {
    cancelAnimationFrame(rafId)
    emit('close')
  } else {
    rafId = requestAnimationFrame(tick)
  }
}

onMounted(() => { rafId = requestAnimationFrame(tick) })
onBeforeUnmount(() => cancelAnimationFrame(rafId))

</script>