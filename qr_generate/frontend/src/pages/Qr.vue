<!-- src/pages/Qr.vue - Stable version without auto-refresh -->

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-200">
    
    <!-- toast -->
    <DeleteNotification
      v-if="toastOpen"
      :type="toastType"
      :message="toastMessage"
      @close="toastOpen = false"
    />

    <div class="flex flex-col w-[400px] bg-white p-6 mt-10 shadow-lg backdrop-blur-lg rounded-2xl">

      <h2 class="text-2xl font-bold mb-6 text-center text-[#19B4AC]">
        QR Generator
      </h2>

      <!-- Enter Url Form -->
      <form @submit.prevent="onGenerate" class="space-y-4">
        <div>
          <label for="longUrl" class="block mb-2 text-[#19B4AC] text-left text-[16px] font-bold">
            Enter URL
          </label>

          <input
            v-model.trim="longUrl"
            id="longUrl"
            type="url"
            placeholder="https://example.com/very/long/link"
            class="w-full rounded-lg border-2 border-gray-200 px-4 py-2 pr-10 text-gray-400 placeholder-slate-400 focus:outline-teal-400"
            :class="inputClass(longUrlError)"
          />
          <p v-if="longUrlError" class="text-red-500 text-sm mt-1">
            {{ longUrlError }}
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-[#19B4AC] hover:bg-[#139690] text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          <span v-if="loading" class="loader mr-2"></span>
          {{ loading ? 'Generating…' : 'Generate' }}
        </button>

        <p v-if="serverError" class="text-red-600 text-sm text-center mt-2">
          {{ serverError }}
        </p>
      </form>

      <!-- Result -->
      <div v-if="shortUrl" class="flex flex-col mt-6 text-center">
        <p class="text-sm text-[#19B4AC] break-all">
          Short URL:
          <a :href="shortUrl" class="text-teal-400 underline" target="_blank" rel="noreferrer">{{ shortUrl }}</a>
        </p>

        <!-- Qr code with GPO Logo -->
        <div class="relative inline-block">
          <img v-if="qrSrc" :src="qrSrc" alt="QR" class="mx-auto mt-3 w-48 h-48" />
          <img src="/Logo.png" alt="Logo" class="absolute top-1/2 left-1/2 w-16 h-8 -translate-x-1/2 -translate-y-1/2" />
        </div>
      
        <button>
          <a :href="qrSrc" download="qrcode.png" class="text-sm text-white bg-[#19B4AC] hover:bg-[#139690] font-semibold py-2 px-4 rounded-md transition-colors mt-4 inline-block">
            Download QR Code
          </a>
        </button>
      </div>
    </div>

    <!-- History Table -->
    <div class="justify content-center mt-10 mb-10 w-[1300px] max-w-[2000px] bg-white backdrop-blur-lg p-6 rounded-lg shadow-lg">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-bold text-gray-600">History</h3>
        <button 
          @click="loadLinks()"
          class="text-sm bg-[#19B4AC] hover:bg-[#139690] text-white px-3 py-1 rounded-lg"
        >
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
              <th v-if="role==='admin'" class="px-6 py-2 w-[80px]">User</th>
              <th class="px-4 py-2 w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="links.length === 0">
              <td :colspan="role === 'admin' ? 5 : 4" class="text-gray-400 border-2 border-gray-200 px-3 py-8 text-center">
                No links yet
              </td>
            </tr>
            <tr v-for="link in links" :key="link.id" class="hover:bg-gray-50">
              <td class="text-left text-gray-600 border-2 border-gray-200 px-3 py-2 max-w-[400px] white-space-normal break-words">
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

              <td v-if="role==='admin'" class="border-2 border-gray-200 px-3 py-2 text-gray-600">
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
import { createLink, listLinks, deleteLink } from '@/api/api.js'
import DeleteNotification from '@/components/delete_notification.vue'

const role = ref(localStorage.getItem("role") || "user")

const toastOpen = ref(false)
const toastType = ref('success')
const toastMessage = ref('')

const longUrl = ref('')
const loading = ref(false)
const shortUrl = ref('')
const qrSrc = ref('')
const longUrlError = ref('')
const serverError = ref('')
const links = ref([])

function showToast(type, msg) {
  toastType.value = type
  toastMessage.value = msg
  toastOpen.value = true
  setTimeout(() => (toastOpen.value = false), 2500)
}

function inputClass(err) {
  return err 
    ? 'border-2 border-red-500 focus:ring-red-400' 
    : 'border-2 border-gray-200 focus:ring-teal-400'
}

// Load links
async function loadLinks(showNotification = false) {
  try {
    const res = await listLinks()
    
    // Normalize clicks to handle both number and object formats
    links.value = res.map(l => ({
      ...l,
      clicks: typeof l.clicks === 'object' ? (l.clicks?.count ?? 0) : (Number(l.clicks) || 0)
    }))
    
    console.log(`Loaded ${links.value.length} links`)
    
    if (showNotification) {
      showToast('success', 'Links refreshed')
    }
  } catch (e) {
    console.error('Failed to load links:', e)
    showToast('error', 'Failed to load links')
  }
}

// Delete a link
async function removeLink(link) {
  const key = link?.id ?? link?.code
  if (!key) return showToast('error', 'Cannot delete: missing identifier')

  if (!confirm(`Delete ${link.short_url || link.code}?`)) return
  
  try {
    const res = await deleteLink(key)
    links.value = links.value.filter(x => (x.id ?? x.code) !== key)
    await loadLinks()
    showToast('success', res?.softDeleted ? 'Link removed.' : 'Link deleted.')
  } catch (e) {
    const msg = e?.response?.data?.error || 'Delete failed'
    console.error('delete failed:', e)
    showToast('error', msg)
  }
}

// Generate short link + QR code
async function onGenerate() {
  longUrlError.value = ''
  serverError.value = ''
  shortUrl.value = ''
  qrSrc.value = ''

  try {
    new URL(longUrl.value)
  } catch {
    longUrlError.value = 'Enter a valid URL starting with http(s)://'
    return
  }

  loading.value = true
  try {
    const { short_url } = await createLink({ real_url: longUrl.value.trim() })
    shortUrl.value = short_url
    qrSrc.value = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(short_url)}`
    await loadLinks()
    showToast('success', 'Short link created!')
  } catch (e) {
    serverError.value = e?.response?.data?.error || 'Failed to create link'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLinks()
})
</script>