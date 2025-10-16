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
        <div class="rounded-lg bg-white p-4 shadow-md relative">
          <canvas ref="qrCanvas" class="w-64 h-64"></canvas>
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
                <button @click="askDelete(link.short_url)" class="text-red-600 hover:underline text-sm font-semibold">
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
                <button @click="askDelete(link.short_url)" class="text-red-600 hover:underline font-medium">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <ConfirmNotification
      :show="showConfirm"
      title="Delete Short Link"
      :message="`Are you sure you want to delete ${deleteTarget}?`"
      @cancel="showConfirm = false"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createLink, listLinks, deleteLink } from '@/api/api'
import DeleteNotification from '@/components/delete_notification.vue'
import ConfirmNotification from '@/components/confirm_notification.vue'

const url = ref('')
const links = ref([])
const loading = ref(false)
const qrCodeUrl = ref('')
const currentShortUrl = ref('')
const copied = ref(false)
const qrCanvas = ref(null)

const toastOpen = ref(false)
const toastType = ref('success')
const toastMessage = ref('')

const role = ref(localStorage.getItem('role') || 'user')

const showConfirm = ref(false);
const deleteTarget = ref(null);

const askDelete = (shortUrl) => {
  deleteTarget.value = shortUrl;
  showConfirm.value = true;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return

  // normalize: accept full short_url or code
  let key = deleteTarget.value
  if (/^https?:\/\//i.test(key)) {
    try {
      const u = new URL(key)
      const parts = u.pathname.split('/').filter(Boolean) // e.g. ["u","qQ_i3Gqb"]
      key = parts.pop() || key
    } catch {
      // leave key as-is if URL ctor fails
    }
  }

  try {
    await deleteLink(key)          // <- now sending only the code
    await loadLinks()
    showToast('success', 'Link deleted successfully!')
  } catch (e) {
    console.error(e)
    showToast('error', 'Failed to delete link')
  } finally {
    showConfirm.value = false
    deleteTarget.value = null
  }
}

/* Display toast notification */
function showToast(type, msg) {
  toastType.value = type
  toastMessage.value = msg
  toastOpen.value = true
}

/* Load image helper function */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/* Generate QR code with logo overlay on canvas */
async function generateQRCodeWithLogo(shortUrl) {
  const QR_SIZE = 256
  const LOGO_MAX_SIZE = 50
  const API_BASE = 'https://api.qrserver.com/v1/create-qr-code/'
  const encoded = encodeURIComponent(shortUrl)
  const qrUrl = `${API_BASE}?size=${QR_SIZE}x${QR_SIZE}&data=${encoded}`


  try {
    const canvas = qrCanvas.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = QR_SIZE
    canvas.height = QR_SIZE

    // Load QR code image
    const qrImage = await loadImage(qrUrl)
    ctx.drawImage(qrImage, 0, 0, QR_SIZE, QR_SIZE)

    // Load logo and calculate dimensions to fit
    const logo = await loadImage('/Logo.png')
    
    // Calculate aspect ratio and fit within max size
    const aspectRatio = logo.width / logo.height
    let logoWidth, logoHeight
    
    if (aspectRatio > 1) {
      logoWidth = LOGO_MAX_SIZE
      logoHeight = LOGO_MAX_SIZE / aspectRatio
    } else {
      logoHeight = LOGO_MAX_SIZE
      logoWidth = LOGO_MAX_SIZE * aspectRatio
    }
    
    const logoX = (QR_SIZE - logoWidth) / 2
    const logoY = (QR_SIZE - logoHeight) / 2
    const padding = 6

    // Draw white rounded background for logo
    ctx.fillStyle = 'white'
    const bgX = logoX - padding
    const bgY = logoY - padding
    const bgWidth = logoWidth + padding * 2
    const bgHeight = logoHeight + padding * 2
    const radius = 4
    
    ctx.beginPath()
    ctx.moveTo(bgX + radius, bgY)
    ctx.lineTo(bgX + bgWidth - radius, bgY)
    ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius)
    ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius)
    ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight)
    ctx.lineTo(bgX + radius, bgY + bgHeight)
    ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius)
    ctx.lineTo(bgX, bgY + radius)
    ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY)
    ctx.closePath()
    ctx.fill()

    // Draw logo
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight)

  } catch (error) {
    console.error('Failed to generate QR with logo:', error)
    showToast('error', 'Failed to load logo')
  }
}

/* Fetch all links for current user */
async function loadLinks() {
  try {
    const data = await listLinks()
    links.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('Load links failed:', e)
    showToast('error', 'Failed to load links')
  }
}

/* Generate short link and display QR code */
async function generate() {
  const real = url.value?.trim()
  if (!real) return showToast('error', 'Please enter a URL')
  
  loading.value = true
  try {
    const res = await createLink({ real_url: real })
    await loadLinks()
    
    currentShortUrl.value = res.short_url
    qrCodeUrl.value = 'generating'
    
    // Wait for next tick to ensure canvas is rendered
    await new Promise(resolve => setTimeout(resolve, 0))
    await generateQRCodeWithLogo(res.short_url)
    
    showToast('success', 'QR Code generated successfully!')
    url.value = ''
  } catch (e) {
    const msg = e?.response?.data?.error || 'A server error has occurred'
    showToast('error', msg)
  } finally {
    loading.value = false
  }
}

/* View QR code for existing link */
async function viewQR(link) {
  currentShortUrl.value = link.short_url
  qrCodeUrl.value = 'generating'
  
  await new Promise(resolve => setTimeout(resolve, 0))
  await generateQRCodeWithLogo(link.short_url)
  
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* Download QR code as image */
function downloadQR() {
  const canvas = qrCanvas.value
  if (!canvas) return

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-code-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

/* Copy short URL to clipboard */
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(currentShortUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (e) {
    showToast('error', 'Failed to copy URL')
  }
}

onMounted(loadLinks)
</script>