<template>
  <div
    v-if="show"
    class="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 transition"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-[340px] max-w-[90%] p-6 text-center animate-fadeIn"
    >
      <h3 class="text-lg font-semibold text-gray-800 mb-2">
        {{ title }}
      </h3>
      <p class="text-gray-600 text-sm mb-6">
        {{ message }}
      </p>

      <div class="flex justify-center gap-3">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
        >
          Cancel
        </button>
        <button
          @click="$emit('confirm')"
          class="px-4 py-2 rounded-lg bg-[#19B4AC] hover:bg-[#139690] text-white transition"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: Boolean,
  title: { type: String, default: 'Confirm Delete' },
  message: { type: String, default: 'Are you sure you want to delete this item?' }
})
defineEmits(['confirm', 'cancel'])
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}
</style>
