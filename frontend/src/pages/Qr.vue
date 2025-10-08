<template>
  <div class="mx-auto max-w-5xl p-6">
    <div class="mx-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow">
      <h2 class="mb-4 text-center text-2xl font-semibold">QR Generator</h2>

      <label class="mb-2 block text-sm font-medium">Enter URL</label>
      <input
        v-model="url"
        type="url"
        placeholder="https://example.com/very/long/link"
        class="w-full rounded-lg border-2 border-gray-200 px-3 py-2 focus:border-teal-500 focus:outline-none"
      />
      <button
        class="mt-4 w-full rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        :disabled="loading"
        @click="generate"
      >
        {{ loading ? 'Generating…' : 'Generate' }}
      </button>

      <DeleteNotification
        v-if="toastOpen"
        :type="toastType"
        :message="toastMessage"
        :duration="2500"
        @close="toastOpen = false"
      />
    </div>

    <div class="mt-8 rounded-2xl bg-white p-4 shadow">
      <div class="mb-3 flex items-center justify-between px-2">
        <h3 class="text-lg font-semibold">History</h3>
        <button class="rounded-lg border px-3 py-1 hover:bg-gray-50" @click="loadLinks">Refresh</button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full table-fixed">
          <thead>
            <tr class="bg-teal-600 text-left text-white">
              <th class="w-[60%] px-3 py-2">Full Url</th>
              <th class="w-[25%] px-3 py-2">Short Url</th>
              <th class="w-[10%] px-3 py-2">Clicks</th>
              <th class="w-[5%] px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!links.length">
              <td colspan="4" class="px-3 py-6 text-center text-gray-400">No links yet</td>
            </tr>
            <tr v-for="l in links" :key="l.id ?? l.code" class="border-b">
              <td class="truncate px-3 py-2">
                <a :href="l.full_url" class="text-teal-700 hover:underline" target="_blank">{{ l.full_url }}</a>
              </td>
              <td class="truncate px-3 py-2">
                <a :href="l.short_url" class="text-teal-700 hover:underline" target="_blank">{{ l.short_url }}</a>
              </td>
              <td class="px-3 py-2">{{ l.clicks }}</td>
              <td class="px-3 py-2 text-right">
                <button class="rounded-md px-2 py-1 text-red-600 hover:bg-red-50" @click="removeLink(l)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createLink, listLinks, deleteLink } from '@/api/api'
import DeleteNotification from '@/components/delete_notification.vue'

const url = ref('')
const links = ref([])
const loading = ref(false)

const toastOpen = ref(false)
const toastType = ref('success')
const toastMessage = ref('')

function showToast(type, msg) {
  toastType.value = type
  toastMessage.value = msg
  toastOpen.value = true
}

async function loadLinks() {
  try {
    const data = await listLinks()
    links.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('load links failed:', e)
    showToast('error', 'Failed to load links')
  }
}

async function generate() {
  const real = url.value?.trim()
  if (!real) return showToast('error', 'Please enter a URL')
  loading.value = true
  try {
    const res = await createLink({ real_url: real })
    await loadLinks()
    showToast('success', `Shortened → ${res.short_url}`)
    url.value = ''
  } catch (e) {
    const msg = e?.response?.data?.error || 'A server error has occurred'
    showToast('error', msg)
  } finally {
    loading.value = false
  }
}

async function removeLink(link) {
  const key = link?.id ?? link?.code
  if (!key) return showToast('error', 'Cannot delete: missing identifier')

  if (!confirm(`Delete ${link.short_url || link.code}?`)) return
  try {
    await deleteLink(key)
    await loadLinks()
    showToast('success', 'Link deleted.')
  } catch (e) {
    const msg = e?.response?.data?.error || 'Delete failed'
    showToast('error', msg)
  }
}

onMounted(loadLinks)
</script>

