<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { getRecipes, getCookLogs, createCookLog, updateCookLog, uploadMedia } = useApi()

const logs = ref<any[]>([])
const recipes = ref<any[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const saving = ref(false)
const uploadingPhotos = ref(false)
const photoError = ref('')
const editingLogId = ref('')
const draftLoading = ref(false)
const uploadedAssets = ref<Array<{ url: string; id: string }>>([])
const lightboxLog = ref<any>(null)
const lightboxIndex = ref(0)

const openLightbox = (log: any, index: number) => {
  lightboxLog.value = log
  lightboxIndex.value = index
}

const closeLightbox = () => {
  lightboxLog.value = null
  lightboxIndex.value = 0
}

const lightboxPrev = () => {
  if (!lightboxLog.value) return
  const total = lightboxLog.value.photos?.length || 0
  lightboxIndex.value = (lightboxIndex.value - 1 + total) % total
  lightboxRef.value?.focus()
}

const lightboxNext = () => {
  if (!lightboxLog.value) return
  const total = lightboxLog.value.photos?.length || 0
  lightboxIndex.value = (lightboxIndex.value + 1) % total
  lightboxRef.value?.focus()
}

const lightboxPhoto = computed(() => {
  if (!lightboxLog.value?.photos) return null
  return lightboxLog.value.photos[lightboxIndex.value] || null
})

const handleLightboxKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') lightboxPrev()
  else if (e.key === 'ArrowRight') lightboxNext()
}

const lightboxRef = ref<HTMLElement | null>(null)

watch(() => lightboxLog.value, (val) => {
  if (val) nextTick(() => { lightboxRef.value?.focus() })
})

const newLog = ref({
  recipeId: '',
  selfScore: 0,
  partnerScore: 0,
  selfComment: '',
  partnerComment: '',
  notes: '',
  photos: [] as string[],
})

onMounted(async () => {
  try {
    const [recipeData, logData] = await Promise.all([
      getRecipes(),
      getCookLogs(),
    ])
    recipes.value = recipeData as any[]
    logs.value = logData as any[]
    openFromQuery()
  } catch (e) {
    console.warn('Failed to load cook logs:', e)
  } finally {
    loading.value = false
  }
})

const createLog = async () => {
  if (!newLog.value.recipeId) return
  saving.value = true
  try {
    if (editingLogId.value) {
      const log = await updateCookLog(editingLogId.value, newLog.value)
      const index = logs.value.findIndex(item => item.id === editingLogId.value)
      if (index >= 0) logs.value[index] = log
      else logs.value.unshift(log)
    } else {
      const log = await createCookLog(newLog.value)
      logs.value.unshift(log)
    }
    showCreateModal.value = false
    resetNewLog()
    clearEntryQuery()
  } catch (e) {
    console.warn('Failed to create cook log:', e)
  } finally {
    saving.value = false
  }
}

const resetNewLog = () => {
  editingLogId.value = ''
  newLog.value = {
    recipeId: '',
    selfScore: 0,
    partnerScore: 0,
    selfComment: '',
    partnerComment: '',
    notes: '',
    photos: [],
  }
  photoError.value = ''
  uploadedAssets.value = []
}

const closeCreateModal = () => {
  const idsToClean = uploadedAssets.value.map(a => a.id)
  showCreateModal.value = false
  resetNewLog()
  clearEntryQuery()
  for (const id of idsToClean) {
    $fetch('/api/media/delete', { method: 'POST', body: { id } }).catch(() => {})
  }
}

const generateDraft = async () => {
  const recipeName = recipes.value.find((r: any) => r.id === newLog.value.recipeId)?.name || ''
  if (!recipeName) return
  draftLoading.value = true
  try {
    const result = await $fetch<{ draft: string }>('/api/ai/review-draft', {
      method: 'POST',
      body: {
        recipeName,
        selfScore: newLog.value.selfScore || undefined,
        partnerScore: newLog.value.partnerScore || undefined,
        selfComment: newLog.value.selfComment || undefined,
        partnerComment: newLog.value.partnerComment || undefined,
      },
    })
    if (result?.draft) newLog.value.notes = result.draft
  } catch {} finally {
    draftLoading.value = false
  }
}

const fillLogForm = (log: any) => {
  editingLogId.value = log.id || ''
  newLog.value = {
    recipeId: log.recipeId || '',
    selfScore: log.selfScore || 0,
    partnerScore: log.partnerScore || 0,
    selfComment: log.selfComment || '',
    partnerComment: log.partnerComment || '',
    notes: log.notes || '',
    photos: Array.isArray(log.photos) ? [...log.photos] : [],
  }
  photoError.value = ''
  uploadedAssets.value = []
}

const openCreateModal = (recipeId = '') => {
  resetNewLog()
  newLog.value.recipeId = recipeId
  showCreateModal.value = true
}

const openEditModal = (log: any) => {
  fillLogForm(log)
  showCreateModal.value = true
}

const openFromQuery = () => {
  const editLogId = typeof route.query.editLog === 'string' ? route.query.editLog : ''
  if (editLogId) {
    const log = logs.value.find(item => item.id === editLogId)
    if (log) openEditModal(log)
    return
  }

  if (route.query.create === '1') {
    const recipeId = typeof route.query.recipeId === 'string' ? route.query.recipeId : ''
    openCreateModal(recipeId)
  }
}

const clearEntryQuery = () => {
  if (!route.query.create && !route.query.editLog && !route.query.recipeId) return
  router.replace({ path: route.path, query: {} })
}

const handlePhotoUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return
  photoError.value = ''
  uploadingPhotos.value = true
  try {
    for (const file of files.slice(0, 8)) {
      if (newLog.value.photos.length >= 20) break
      const asset = await uploadMedia(file, 'cook-log')
      newLog.value.photos.push(asset.url)
      if (asset.id) uploadedAssets.value.push({ url: asset.url, id: asset.id })
    }
  } catch (e) {
    console.warn('Failed to upload cook log photo:', e)
    photoError.value = '照片上传失败，换一张小于 5MB 的 jpg、png 或 webp 试试'
  } finally {
    uploadingPhotos.value = false
    input.value = ''
  }
}

const removePendingPhoto = (index: number) => {
  const removedUrl = newLog.value.photos[index]
  newLog.value.photos.splice(index, 1)
  // 同步删除对应的 asset 记录并清理服务端文件
  const assetIdx = uploadedAssets.value.findIndex(a => a.url === removedUrl)
  if (assetIdx >= 0) {
    const [asset] = uploadedAssets.value.splice(assetIdx, 1)
    if (asset) $fetch('/api/media/delete', { method: 'POST', body: { id: asset.id } }).catch(() => {})
  }
}

const photoLabel = (index: string | number) => `查看第 ${Number(index) + 1} 张烹饪照片`

const removePhotoLabel = (index: string | number) => `移除第 ${Number(index) + 1} 张照片`

const deleteLog = async (id: string) => {
  if (!confirm('确定要删除这条记录吗？')) return
  try {
    await $fetch(`/api/cook-logs/${id}`, { method: 'DELETE' })
    logs.value = logs.value.filter(l => l.id !== id)
  } catch (e) {
    console.warn('Failed to delete cook log:', e)
  }
}

const scoreColor = (score: number) => {
  if (score >= 9) return 'text-[#D86830]'
  if (score >= 7) return 'text-[#6D8B74]'
  if (score >= 5) return 'text-[#8B7D6B]'
  return 'text-[#A69080]'
}
</script>

<template>
  <div class="animate-fade-in">
    <div class="flex items-end justify-between mb-8">
      <div>
        <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">Cook Log</p>
        <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">烹饪记录</h1>
      </div>
      <button data-testid="cooklog-open-create" class="px-4 py-2 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors" @click="openCreateModal()">
        + 快速记录
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-[#A69080]">正在翻烹饪日志...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!logs.length" class="text-center py-20">
      <p class="text-4xl mb-4">📝</p>
      <p class="text-[#8B7D6B] mb-2">还没有下厨记录呢，今晚试试？</p>
      <p class="text-sm text-[#A69080]">做一道菜后点"快速记录"就好啦</p>
    </div>

    <!-- Log list -->
    <div v-else class="space-y-4">
      <div v-for="log in logs" :key="log.id"
        data-testid="cooklog-card"
        class="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors">
        <div class="flex items-start justify-between mb-3">
          <div>
            <NuxtLink :to="`/recipes/${log.recipeId}`" class="text-base font-bold text-[#1a1714] hover:text-[#C06030] transition-colors">
              {{ log.recipe?.name || '未知菜谱' }}
            </NuxtLink>
            <div class="flex flex-wrap gap-1 mt-1">
              <span v-for="tag in (log.recipe?.tags || [])" :key="tag.name || tag"
                class="text-xs text-[#8B7D6B] bg-gray-100 px-2 py-0.5 rounded-md">
                {{ tag.name || tag }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs text-[#A69080]">{{ log.date?.split('T')[0] }}</span>
            <button class="w-6 h-6 rounded-full flex items-center justify-center text-[#A69080] hover:text-[#D05050] hover:bg-red-50 transition-colors" @click="deleteLog(log.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" /></svg>
            </button>
            <button class="px-2 py-1 rounded-md text-xs text-[#8B7D6B] hover:bg-gray-100 hover:text-[#1a1714] transition-colors" @click="openEditModal(log)">
              编辑
            </button>
          </div>
        </div>

        <!-- Scores -->
        <div class="flex gap-6 text-sm">
          <div v-if="log.selfScore">
            <span class="text-[10px] font-bold text-[#A69080] uppercase tracking-wider">猪猪</span>
            <span class="font-mono font-bold ml-1" :class="scoreColor(log.selfScore)">{{ log.selfScore }}/10</span>
          </div>
          <div v-if="log.partnerScore">
            <span class="text-[10px] font-bold text-[#A69080] uppercase tracking-wider">猪宝</span>
            <span class="font-mono font-bold ml-1" :class="scoreColor(log.partnerScore)">{{ log.partnerScore }}/10</span>
          </div>
        </div>

        <!-- Photos -->
        <div v-if="log.photos?.length" class="mt-4 grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          <button
            v-for="(photo, index) in log.photos"
            :key="`${log.id}-${photo}`"
            type="button"
            data-testid="cooklog-photo"
            class="aspect-square overflow-hidden rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#C06030]/40"
            :aria-label="photoLabel(index)"
            @click="openLightbox(log, Number(index))">
            <img :src="photo" class="w-full h-full object-cover" loading="lazy" />
          </button>
        </div>

        <!-- Comments -->
        <div v-if="log.selfComment || log.partnerComment || log.notes" class="mt-3 pt-3 border-t border-gray-100 space-y-1">
          <p v-if="log.selfComment" class="text-sm text-[#6B5D4D]">猪猪: {{ log.selfComment }}</p>
          <p v-if="log.partnerComment" class="text-sm text-[#6B5D4D]">猪宝: {{ log.partnerComment }}</p>
          <p v-if="log.notes" class="text-sm text-[#A69080] italic">{{ log.notes }}</p>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="closeCreateModal">
      <div class="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div class="mb-5">
          <h3 class="text-lg font-serif font-bold text-[#1a1714]">{{ editingLogId ? '补完整这顿' : '先记一顿' }}</h3>
          <p class="mt-1 text-sm text-[#8B7D6B]">
            {{ editingLogId ? '照片、评分和复盘慢慢补也可以。' : '选好菜谱先存着，照片和评分吃完再补也行。' }}
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">菜谱</label>
            <select v-model="newLog.recipeId" data-testid="cooklog-recipe-select" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]">
              <option value="" disabled>选择菜谱...</option>
              <option v-for="r in recipes" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">猪猪评分</label>
              <input v-model.number="newLog.selfScore" type="number" min="0" max="10" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#C06030]" />
            </div>
            <div>
              <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">猪宝评分</label>
              <input v-model.number="newLog.partnerScore" type="number" min="0" max="10" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#C06030]" />
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">猪猪评语</label>
            <input v-model="newLog.selfComment" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]" />
          </div>

          <div>
            <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">猪宝评语</label>
            <input v-model="newLog.partnerComment" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider">一点复盘</label>
              <button
                v-if="newLog.recipeId"
                type="button"
                class="text-[11px] text-[#C06030] hover:text-[#A85028] disabled:opacity-50"
                :disabled="draftLoading"
                @click="generateDraft"
              >{{ draftLoading ? '生成中...' : 'AI 帮写' }}</button>
            </div>
            <textarea v-model="newLog.notes" data-testid="cooklog-notes" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-[#C06030]" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider block">照片</label>
              <span class="text-[11px] text-[#A69080]">{{ newLog.photos.length }}/20</span>
            </div>
            <label
              class="flex items-center justify-center h-24 rounded-lg border border-dashed border-[#D8C8B8] bg-[#FAF7F2] text-sm text-[#8B7D6B] cursor-pointer hover:border-[#C06030] hover:text-[#C06030] transition-colors"
              :class="uploadingPhotos ? 'opacity-70 pointer-events-none' : ''">
              <span>{{ uploadingPhotos ? '上传中...' : '添加烹饪照片' }}</span>
              <input data-testid="cooklog-photo-input" type="file" accept="image/*" multiple class="hidden" @change="handlePhotoUpload" />
            </label>
            <p v-if="photoError" class="mt-2 text-xs text-[#D05050]">{{ photoError }}</p>
            <div v-if="newLog.photos.length" class="mt-3 grid grid-cols-4 gap-2">
              <div
                v-for="(photo, index) in newLog.photos"
                :key="photo"
                data-testid="cooklog-photo-preview"
                class="relative aspect-square rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                <img :src="photo" class="w-full h-full object-cover" />
                <button
                  type="button"
                  class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white text-xs flex items-center justify-center hover:bg-black/70 transition-colors"
                  :aria-label="removePhotoLabel(index)"
                  @click="removePendingPhoto(index)">
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-2 mt-6">
          <button class="flex-1 px-4 py-2 bg-gray-100 text-[#8B7D6B] rounded-lg text-sm hover:bg-gray-200 transition-colors" @click="closeCreateModal">取消</button>
          <button
            data-testid="cooklog-save"
            class="flex-1 px-4 py-2 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            :disabled="saving || uploadingPhotos || !newLog.recipeId"
            @click="createLog">
            {{ saving ? '保存中...' : editingLogId ? '更新记录' : '先保存' }}
          </button>
        </div>
      </div>
    </div>
    <!-- 照片灯箱 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="lightboxLog && lightboxPhoto" ref="lightboxRef" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 outline-none" tabindex="-1" @click.self="closeLightbox" @keydown="handleLightboxKeydown">
          <button class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10" @click="closeLightbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-8 h-8"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" /></svg>
          </button>
          <button v-if="(lightboxLog.photos?.length || 0) > 1" class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10" @click="lightboxPrev">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-10 h-10"><path d="M15.75 19.5L8.25 12l7.5-7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button v-if="(lightboxLog.photos?.length || 0) > 1" class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10" @click="lightboxNext">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-10 h-10"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <img :src="lightboxPhoto" class="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" />
          <p class="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-mono">{{ lightboxIndex + 1 }} / {{ lightboxLog.photos?.length || 0 }}</p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
