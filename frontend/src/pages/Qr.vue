<template>
  <div class="min-h-screen bg-gray-200 p-4 sm:p-6">
    <!-- Generator Card -->
    <div class="mx-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow">
      <h2 class="mb-4 text-center text-2xl font-bold text-gray-600">QR Generator</h2>

      <label class="mb-2 block text-lg font-bold text-gray-600">Enter URL</label>
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
        {{ loading ? 'Generating…' : 'Generate QR Code' }}
      </button>

      <!-- QR Code Display -->
      <div v-if="qrCodeUrl" class="mt-6 flex flex-col items-center">
        <div class="rounded-lg bg-white p-4 shadow-md">
          <img :src="qrCodeUrl" alt="QR Code" class="w-64 h-64" />
        </div>
        <p class="mt-3 text-sm text-gray-600 text-center break-all">
          {{ currentShortUrl }}
        </p>
        <div class="mt-3 flex gap-2">
          <button
            @click="downloadQR"
            class="rounded-lg bg-[#19B4AC] px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Download QR
          </button>
          <button
            @click="copyToClipboard"
            class="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            {{ copied ? 'Copied!' : 'Copy URL' }}
          </button>
        </div>
      </div>

      <DeleteNotification
        v-if="toastOpen"
        :type="toastType"
        :message="toastMessage"
        :duration="2500"
        @close="toastOpen = false"
      />
    </div>

    <!-- History Table -->
    <div class="mt-10 mb-10 w-full max-w-[1400px] bg-white p-4 sm:p-6 rounded-lg shadow-lg mx-auto">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h3 class="text-lg font-bold text-gray-600">History</h3>
        <button 
          @click="loadLinks"
          class="text-sm bg-[#19B4AC] hover:bg-[#139690] text-white px-3 py-1 rounded-lg w-full sm:w-auto">
          Refresh
        </button>
      </div>

      <!-- Mobile Card View -->
      <div class="block sm:hidden space-y-4">
        <div v-if="links.length === 0" class="text-gray-400 text-center py-8">
          No links yet
        </div>
        <div v-for="link in links" :key="link.id ?? link.code" class="border-2 border-gray-200 rounded-lg p-4">
          <div class="space-y-2">
            <div>
              <p class="text-xs text-gray-500 font-semibold">Full URL</p>
              <p class="text-sm text-gray-700 break-all">{{ link.full_url }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-semibold">Short URL</p>
              <a :href="link.short_url" target="_blank" class="text-sm text-teal-600 underline break-all">
                {{ link.short_url }}
              </a>
            </div>
            <div class="flex justify-between items-center">
              <div>
                <p class="text-xs text-gray-500 font-semibold">Clicks</p>
                <p class="text-sm text-gray-700">{{ link.clicks }}</p>
              </div>
              <div v-if="role === 'admin' && link.owner">
                <p class="text-xs text-gray-500 font-semibold">User</p>
                <p class="text-sm text-gray-700">{{ link.owner.user_name }}</p>
              </div>
              <div class="flex gap-2">
                <button @click="viewQR(link)" class="text-[#19B4AC] hover:underline text-sm font-semibold">
                  View QR
                </button>
                <button @click="removeLink(link)" class="text-red-600 hover:underline text-sm font-semibold">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Table View -->
      <div class="hidden sm:block overflow-x-auto rounded-lg">
        <table class="w-full text-sm text-center">
          <thead class="bg-[#19B4AC] text-white">
            <tr>
              <th class="px-4 py-3 text-left">Full URL</th>
              <th class="px-4 py-3">Short URL</th>
              <th class="px-4 py-3">Clicks</th>
              <th v-if="role === 'admin'" class="px-4 py-3">User</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="links.length === 0">
              <td :colspan="role === 'admin' ? 5 : 4" class="text-gray-400 border-2 border-gray-200 px-3 py-8 text-center">
                No links yet
              </td>
            </tr>

            <tr v-for="link in links" :key="link.id ?? link.code" class="hover:bg-gray-50 border-b border-gray-200">
              <td class="text-left text-gray-600 px-4 py-3 max-w-[300px] truncate" :title="link.full_url">
                {{ link.full_url }}
              </td>

              <td class="px-4 py-3">
                <a :href="link.short_url" target="_blank" class="text-teal-600 underline hover:text-teal-800">
                  {{ link.short_url }}
                </a>
              </td>

              <td class="text-gray-600 px-4 py-3 text-center">
                {{ link.clicks }}
              </td>

              <td v-if="role === 'admin'" class="px-4 py-3 text-gray-600">
                <template v-if="link.owner">
                  <div class="text-sm">{{ link.owner.user_name }}</div>
                  <div class="text-xs text-gray-500">{{ link.owner.user_email }}</div>
                </template>
                <span v-else class="text-gray-400">Unknown</span>
              </td>

              <td class="px-4 py-3 text-center">
                <button @click="viewQR(link)" class="text-[#19B4AC] hover:underline font-medium mr-3">
                  View QR
                </button>
                <button @click="removeLink(link)" class="text-red-600 hover:underline font-medium">
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
const qrCodeUrl = ref('')
const currentShortUrl = ref('')
const copied = ref(false)

const toastOpen = ref(false)
const toastType = ref('success')
const toastMessage = ref('')

const role = ref(localStorage.getItem('role') || 'user')

/**
 * Generate QR code from URL using QR code API
 */
function generateQRCode(shortUrl) {
  const API_BASE = 'https://api.qrserver.com/v1/create-qr-code/'
  const size = '256x256'
  const encoded = encodeURIComponent(shortUrl)
  return `${API_BASE}?size=${size}&data=${encoded}`
}

/**
 * Display toast notification
 */
function showToast(type, msg) {
  toastType.value = type
  toastMessage.value = msg
  toastOpen.value = true
}

/**
 * Fetch all links for current user
 */
async function loadLinks() {
  try {
    const data = await listLinks()
    links.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('Load links failed:', e)
    showToast('error', 'Failed to load links')
  }
}

/**
 * Generate short link and display QR code
 */
async function generate() {
  const real = url.value?.trim()
  if (!real) return showToast('error', 'Please enter a URL')
  
  loading.value = true
  try {
    const res = await createLink({ real_url: real })
    await loadLinks()
    
    currentShortUrl.value = res.short_url
    qrCodeUrl.value = generateQRCode(res.short_url)
    
    showToast('success', 'QR Code generated successfully!')
    url.value = ''
  } catch (e) {
    const msg = e?.response?.data?.error || 'A server error has occurred'
    showToast('error', msg)
  } finally {
    loading.value = false
  }
}

/**
 * View QR code for existing link
 */
function viewQR(link) {
  currentShortUrl.value = link.short_url
  qrCodeUrl.value = generateQRCode(link.short_url)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * Download QR code as image
 */
function downloadQR() {
  const a = document.createElement('a')
  a.href = qrCodeUrl.value
  a.download = `qr-${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Copy short URL to clipboard
 */
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(currentShortUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (e) {
    showToast('error', 'Failed to copy URL')
  }
}

/**
 * Delete a link
 */
async function removeLink(link) {
  const key = link?.id ?? link?.code
  if (!key) return showToast('error', 'Cannot delete: missing identifier')

  if (!confirm(`Delete ${link.short_url || link.code}?`)) return
  
  try {
    await deleteLink(key)
    await loadLinks()
    
    if (currentShortUrl.value === link.short_url) {
      qrCodeUrl.value = ''
      currentShortUrl.value = ''
    }
    
    showToast('success', 'Link deleted successfully')
  } catch (e) {
    const msg = e?.response?.data?.error || 'Delete failed'
    showToast('error', msg)
  }
}

onMounted(loadLinks)
</script>