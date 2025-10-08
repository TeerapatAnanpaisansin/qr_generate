<template>
  <div class="justify content-center mx-auto max-w-full p-6">
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
        class="mt-4 w-full rounded-lg bg-[#19B4AC] px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
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

    <!-- History Table -->
    <div class="justify content-center mt-10 mb-10 w-[1300px] max-w-[2000px] bg-white backdrop-blur-lg p-6 rounded-lg shadow-lg">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-bold text-gray-600">History</h3>
        <button 
          @click="loadLinks"
          class="text-sm bg-[#19B4AC] hover:bg-[#139690] text-white px-3 py-1 rounded-lg">
          Refresh
        </button>
      </div>

      <div class="overflow-x-auto rounded-t-lg">
        <table class="w-full text-white text-sm text-center">
          <thead class="bg-[#19B4AC] border-collapse border-2 border-[#19B4AC]">
            <tr>
              <th class="px-20 py-2">Full Url</th>
              <th class="px-14 py-2 w-[200px]">Short Url</th>
              <th class="px-4 py-2 w-[50px]">Clicks</th>
              <th v-if="role === 'admin'" class="px-6 py-2 w-[80px]">User</th>
              <th class="px-4 py-2 w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            <!-- If no links, show a placeholder row -->
            <tr v-if="links.length === 0">
              <td :colspan="role === 'admin' ? 5 : 4" class="text-gray-400 border-2 border-gray-200 px-3 py-8 text-center">
                No links yet
              </td>
            </tr>

            <!-- Loop through links and display each one -->
            <tr v-for="link in links" :key="link.id ?? link.code" class="hover:bg-gray-50">
              <td class="text-left text-gray-600 border-2 border-gray-200 px-3 py-2 max-w-[400px] break-words">
                {{ link.full_url }}
              </td>

              <td class="border-2 border-gray-200 px-3 py-2">
                <a :href="link.short_url" target="_blank" class="text-teal-600 underline">
                  {{ link.short_url }}
                </a>
              </td>

              <td class="text-gray-600 border-2 border-gray-200 px-3 py-2 text-center min-w-[50px]">
                {{ link.clicks }}
              </td>

              <!-- Show the owner column only for admin -->
              <td v-if="role === 'admin'" class="border-2 border-gray-200 px-3 py-2 text-gray-600">
                <template v-if="link.owner">
                  {{ link.owner.user_name }} ({{ link.owner.user_email }})
                </template>
                <template v-else>
                  <span class="text-gray-400">Unknown</span>
                </template>
              </td>

              <td class="border-2 border-gray-200 px-3 py-2 text-center">
                <button @click="removeLink(link)" class="text-red-600 hover:underline">
                  Delete
                </button>
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

const role = ref(localStorage.getItem('role') || 'user')

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

