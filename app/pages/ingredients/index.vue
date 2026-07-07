<script setup lang="ts">
import { colorClasses } from '~/constants/recipe'

const { getFridge, addFridgeItem: addFridge, removeFridgeItem: removeFridge, generateAndSaveLineArt, checkLineArtJob, getLineArtJobs, updateIngredient, getRecipes } = useApi()

const ingredientsList = ref<any[]>([])
const recipes = ref<any[]>([])
const fridgeFrozen = ref<any[]>([])
const fridgeRefrigerated = ref<any[]>([])
const fridgeRoomTemp = ref<any[]>([])
const loading = ref(true)

// Filters
const searchQuery = ref('')
const activeCategory = ref('')
const sortBy = ref<'name' | 'count' | 'category'>('count')
const lineArtFilter = ref<'all' | 'missing' | 'has'>('all')

// Drawer
const selectedIng = ref<any>(null)
const drawerOpen = ref(false)
const editForm = ref({ name: '', category: '', family: '' })
const saving = ref(false)

// Line art generation
const generating = ref<Record<string, string>>({})
const batchGenerating = ref(false)
const batchProgress = ref({ current: 0, total: 0 })

// Fridge form
const newFridgeItem = ref({ name: '', amount: '', zone: 'refrigerated' as 'frozen' | 'refrigerated' | 'room_temp', expiryDate: '' })
const activeMobileStorageZone = ref<'refrigerated' | 'frozen' | 'room_temp'>('refrigerated')

// Storage names map for card badges (name → zone)
const storageMap = computed(() => {
  const map = new Map<string, string>()
  for (const item of [...fridgeFrozen.value, ...fridgeRefrigerated.value, ...fridgeRoomTemp.value]) {
    map.set(item.name, item.zone)
  }
  return map
})

const storageItemMap = computed(() => {
  const map = new Map<string, any>()
  for (const item of [...fridgeFrozen.value, ...fridgeRefrigerated.value, ...fridgeRoomTemp.value]) {
    if (!map.has(item.name)) map.set(item.name, item)
  }
  return map
})

const storageZoneMeta = {
  refrigerated: { label: '冷藏', icon: '🧊', tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  frozen: { label: '冷冻', icon: '❄️', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
  room_temp: { label: '常温', icon: '🌡️', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
} as const

const storageGroups = computed(() => ({
  refrigerated: fridgeRefrigerated.value,
  frozen: fridgeFrozen.value,
  room_temp: fridgeRoomTemp.value,
}))

const activeMobileStorageItems = computed(() => storageGroups.value[activeMobileStorageZone.value] || [])

const storageTotal = computed(() => (
  fridgeRefrigerated.value.length + fridgeFrozen.value.length + fridgeRoomTemp.value.length
))

const formatAddedDate = (value?: string | Date | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

const expiryStatus = (value?: string | Date | null) => {
  if (!value) return null
  const expiry = new Date(value)
  if (Number.isNaN(expiry.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return { label: '已过期', class: 'bg-red-100 text-red-700' }
  if (diff <= 3) return { label: `${diff}天后过期`, class: 'bg-orange-100 text-orange-700' }
  return null
}

watch(activeMobileStorageZone, (zone) => {
  newFridgeItem.value.zone = zone
})

onMounted(async () => {
  const [ingsResult, fridgeResult, recipesResult] = await Promise.allSettled([
    $fetch<any[]>('/api/ingredients'),
    getFridge(),
    getRecipes(),
  ])
  if (ingsResult.status === 'fulfilled') ingredientsList.value = ingsResult.value
  if (recipesResult.status === 'fulfilled') recipes.value = recipesResult.value || []
  if (fridgeResult.status === 'fulfilled') {
    fridgeFrozen.value = fridgeResult.value.frozen || []
    fridgeRefrigerated.value = fridgeResult.value.refrigerated || []
    fridgeRoomTemp.value = fridgeResult.value.room_temp || []
  }
  await restoreLineArtJobs()
  loading.value = false
})

// Computed
const categories = computed(() => {
  const counts: Record<string, number> = {}
  for (const ing of ingredientsList.value) {
    const cat = ing.category || '其他'
    counts[cat] = (counts[cat] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
})

const filteredIngredients = computed(() => {
  let list = ingredientsList.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(i => i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q))
  }
  if (activeCategory.value) list = list.filter(i => (i.category || '其他') === activeCategory.value)
  if (lineArtFilter.value === 'missing') list = list.filter(i => !i.lineArtUrl)
  else if (lineArtFilter.value === 'has') list = list.filter(i => i.lineArtUrl)

  // Sort
  if (sortBy.value === 'count') list = [...list].sort((a, b) => (b.recipeCount || 0) - (a.recipeCount || 0))
  else if (sortBy.value === 'category') list = [...list].sort((a, b) => (a.category || '').localeCompare(b.category || ''))
  else list = [...list].sort((a, b) => a.name.localeCompare(b.name))

  return list
})

const stats = computed(() => ({
  total: ingredientsList.value.length,
  hasArt: ingredientsList.value.filter(i => i.lineArtUrl).length,
  missing: ingredientsList.value.filter(i => !i.lineArtUrl).length,
}))

// Related recipes for drawer
const relatedRecipes = computed(() => {
  if (!selectedIng.value) return []
  const ingName = selectedIng.value.name
  return recipes.value.filter((r: any) =>
    r.ingredients?.some((i: any) => i.name === ingName)
  ).slice(0, 12)
})

// Drawer
const openDrawer = (ing: any) => {
  selectedIng.value = ing
  editForm.value = { name: ing.name, category: ing.category || '', family: ing.family || '' }
  drawerOpen.value = true
}

const closeDrawer = () => {
  drawerOpen.value = false
  selectedIng.value = null
}

const saveIngredient = async () => {
  if (!selectedIng.value) return
  saving.value = true
  try {
    await updateIngredient(selectedIng.value.id, editForm.value)
    // Update local data
    const idx = ingredientsList.value.findIndex(i => i.id === selectedIng.value.id)
    if (idx >= 0) {
      ingredientsList.value[idx] = { ...ingredientsList.value[idx], ...editForm.value }
    }
    selectedIng.value = { ...selectedIng.value, ...editForm.value }
  } catch (e) {
    console.warn('Save failed:', e)
  } finally {
    saving.value = false
  }
}

// Line art URL parsing (may be single URL string or JSON array)
const getLineArtUrls = (ing: any): string[] => {
  if (!ing?.lineArtUrl) return []
  if (Array.isArray(ing.lineArtUrl)) return ing.lineArtUrl
  try { const parsed = JSON.parse(ing.lineArtUrl); return Array.isArray(parsed) ? parsed : [ing.lineArtUrl] } catch { return [ing.lineArtUrl] }
}

const selectedArtIndex = ref(0)

const selectLineArt = async (ing: any, url: string, idx: number) => {
  selectedArtIndex.value = idx
  // Keep all URLs but save the selected one as the primary
  const allUrls = getLineArtUrls(ing)
  // Reorder: selected URL first, then the rest
  const reordered = [url, ...allUrls.filter(u => u !== url)]
  const newLineArtUrl = reordered.length > 1 ? JSON.stringify(reordered) : url
  try {
    await updateIngredient(ing.id, { lineArtUrl: newLineArtUrl })
    ing.lineArtUrl = newLineArtUrl
    const listIdx = ingredientsList.value.findIndex(i => i.id === ing.id)
    if (listIdx >= 0) ingredientsList.value[listIdx].lineArtUrl = newLineArtUrl
    if (selectedIng.value?.id === ing.id) selectedIng.value.lineArtUrl = newLineArtUrl
  } catch (e) { console.warn('Select line art failed:', e) }
}

// Line art - async parallel generation with polling
const activeJobs = ref<Map<string, { ingredientName: string; ingredientId: string }>>(new Map())
const lineArtErrors = ref<Record<string, string>>({})
let pollTimer: ReturnType<typeof setInterval> | null = null

const updateIngredientLineArt = (ingredientId: string, imageUrls: string[]) => {
  const lineArtUrl = JSON.stringify(imageUrls)
  const idx = ingredientsList.value.findIndex(i => i.id === ingredientId)
  if (idx >= 0) ingredientsList.value[idx].lineArtUrl = lineArtUrl
  if (selectedIng.value?.id === ingredientId) selectedIng.value.lineArtUrl = lineArtUrl
}

const restoreLineArtJobs = async () => {
  const ids = ingredientsList.value.map(i => i.id)
  if (!ids.length) return
  try {
    const jobs = await getLineArtJobs(ids)
    for (const job of jobs) {
      if (!job.ingredientId) continue
      const ing = ingredientsList.value.find(i => i.id === job.ingredientId)
      if (!ing) continue
      if ((job.status === 'pending' || job.status === 'polling') && !ing.lineArtUrl) {
        activeJobs.value.set(job.id, { ingredientName: ing.name, ingredientId: ing.id })
        generating.value[ing.name] = 'polling'
      } else if (job.status === 'done' && job.imageUrls?.length && !ing.lineArtUrl) {
        generating.value[ing.name] = 'done'
        updateIngredientLineArt(ing.id, job.imageUrls)
      } else if (job.status === 'failed' && !ing.lineArtUrl) {
        generating.value[ing.name] = 'failed'
        lineArtErrors.value[ing.name] = job.error || '线稿生成失败，可以重试'
      }
    }
    if (activeJobs.value.size) startPolling()
  } catch (e) {
    console.warn('Restore line art jobs failed:', e)
  }
}

const startPolling = () => {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    if (activeJobs.value.size === 0) {
      stopPolling()
      return
    }
    for (const [jobId, info] of activeJobs.value) {
      try {
        const result = await checkLineArtJob(jobId)
        if (result.status === 'done' && result.imageUrls?.length) {
          generating.value[info.ingredientName] = 'done'
          updateIngredientLineArt(info.ingredientId, result.imageUrls)
          delete lineArtErrors.value[info.ingredientName]
          activeJobs.value.delete(jobId)
        } else if (result.status === 'failed') {
          generating.value[info.ingredientName] = 'failed'
          lineArtErrors.value[info.ingredientName] = result.error || '线稿生成失败，可以重试'
          activeJobs.value.delete(jobId)
        }
        // 'polling' → keep waiting
      } catch {
        // Job expired or error
        generating.value[info.ingredientName] = 'failed'
        lineArtErrors.value[info.ingredientName] = '线稿任务状态获取失败，可以重试'
        activeJobs.value.delete(jobId)
      }
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

const generateSingle = async (ing: any) => {
  generating.value[ing.name] = 'submitting'
  delete lineArtErrors.value[ing.name]
  try {
    const result = await generateAndSaveLineArt(ing.name, ing.id)
    if (result?.status === 'already_exists' && result?.imageUrls) {
      // Already has line art - update local data
      generating.value[ing.name] = 'done'
      updateIngredientLineArt(ing.id, result.imageUrls)
    } else if (result?.jobId) {
      activeJobs.value.set(result.jobId, { ingredientName: ing.name, ingredientId: ing.id })
      generating.value[ing.name] = 'polling'
      startPolling()
    } else if (result?.status === 'already_running') {
      generating.value[ing.name] = 'polling'
    } else {
      generating.value[ing.name] = 'failed'
    }
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || ''
    generating.value[ing.name] = msg.includes('配额') || msg.includes('429') ? 'quota' : 'failed'
    lineArtErrors.value[ing.name] = msg || '线稿生成失败，可以重试'
    console.warn('Line art generation failed:', e)
  }
}

const batchGenerateMissing = async () => {
  const missing = ingredientsList.value.filter(i => !i.lineArtUrl)
  if (!missing.length) return
  batchGenerating.value = true
  batchProgress.value = { current: 0, total: missing.length }

  // Submit all in parallel (not sequentially!)
  const promises = missing.map(async (ing) => {
    try {
      const result = await generateAndSaveLineArt(ing.name, ing.id)
      if (result?.status === 'already_exists' && result?.imageUrls) {
        generating.value[ing.name] = 'done'
        ing.lineArtUrl = JSON.stringify(result.imageUrls)
      } else if (result?.jobId) {
        activeJobs.value.set(result.jobId, { ingredientName: ing.name, ingredientId: ing.id })
        generating.value[ing.name] = 'polling'
      } else if (result?.status === 'already_running') {
        generating.value[ing.name] = 'polling'
      } else {
        generating.value[ing.name] = 'failed'
        lineArtErrors.value[ing.name] = '线稿生成失败，可以重试'
      }
    } catch {
      generating.value[ing.name] = 'failed'
      lineArtErrors.value[ing.name] = '线稿生成失败，可以重试'
    }
    batchProgress.value.current++
  })

  await Promise.all(promises)
  batchGenerating.value = false
  startPolling()
}

onUnmounted(() => {
  stopPolling()
})

// Quick store from card — toggle if same zone, move if different zone
const quickStore = async (ing: any, zone: string) => {
  const existingItem = storageItemMap.value.get(ing.name)
  if (existingItem) {
    // 同区：移除；不同区：移动
    if (existingItem.zone === zone) {
      try {
        await removeFridge(existingItem.id)
        if (zone === 'frozen') fridgeFrozen.value = fridgeFrozen.value.filter((i: any) => i.id !== existingItem.id)
        else if (zone === 'room_temp') fridgeRoomTemp.value = fridgeRoomTemp.value.filter((i: any) => i.id !== existingItem.id)
        else fridgeRefrigerated.value = fridgeRefrigerated.value.filter((i: any) => i.id !== existingItem.id)
      } catch (e) {
        console.warn('Quick remove failed:', e)
      }
      return
    }
    // 不同区：先移除旧的
    try {
      await removeFridge(existingItem.id)
      if (existingItem.zone === 'frozen') fridgeFrozen.value = fridgeFrozen.value.filter((i: any) => i.id !== existingItem.id)
      else if (existingItem.zone === 'room_temp') fridgeRoomTemp.value = fridgeRoomTemp.value.filter((i: any) => i.id !== existingItem.id)
      else fridgeRefrigerated.value = fridgeRefrigerated.value.filter((i: any) => i.id !== existingItem.id)
    } catch (e) {
      console.warn('Quick remove failed:', e)
    }
  }
  // 添加到新区
  try {
    const item = await addFridge({ name: ing.name, amount: '', zone })
    if (zone === 'frozen') fridgeFrozen.value.unshift(item)
    else if (zone === 'room_temp') fridgeRoomTemp.value.unshift(item)
    else fridgeRefrigerated.value.unshift(item)
  } catch (e) {
    console.warn('Quick store failed:', e)
  }
}

// Fridge add/remove
const handleAddFridge = async () => {
  if (!newFridgeItem.value.name.trim()) return
  const zone = newFridgeItem.value.zone
  try {
    const item = await addFridge({
      name: newFridgeItem.value.name.trim(),
      amount: newFridgeItem.value.amount,
      zone,
      expiryDate: newFridgeItem.value.expiryDate || undefined,
    })
    if (zone === 'frozen') fridgeFrozen.value.unshift(item)
    else if (zone === 'room_temp') fridgeRoomTemp.value.unshift(item)
    else fridgeRefrigerated.value.unshift(item)
    activeMobileStorageZone.value = zone
    newFridgeItem.value = { name: '', amount: '', zone, expiryDate: '' }
  } catch (e) {
    console.warn('Add storage item failed:', e)
  }
}

const handleRemoveFridge = async (zone: 'frozen' | 'refrigerated' | 'room_temp', idx: number) => {
  const list = zone === 'frozen' ? fridgeFrozen : zone === 'room_temp' ? fridgeRoomTemp : fridgeRefrigerated
  const item = list.value[idx]
  try {
    await removeFridge(item.id)
    list.value.splice(idx, 1)
  } catch (e) {
    console.warn('Remove fridge item failed:', e)
  }
}
</script>

<template>
  <div class="animate-fade-in">
    <!-- Header -->
    <div class="flex items-end justify-between mb-6">
      <div>
        <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">Ingredients</p>
        <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">食材</h1>
      </div>
      <!-- Active generation indicator -->
      <div v-if="activeJobs.size > 0" class="flex items-center gap-2 px-3 py-1.5 bg-[#D86830]/10 rounded-full">
        <span class="w-2 h-2 rounded-full bg-[#D86830] animate-pulse"></span>
        <span class="text-xs font-mono text-[#D86830]">{{ activeJobs.size }} 个线稿生成中 (可离开页面)</span>
      </div>
    </div>

    <!-- Mobile storage snapshot -->
    <section class="mb-6 rounded-lg border border-[#E3D6C8] bg-white/80 p-4 lg:hidden" data-testid="mobile-storage-summary">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h2 class="font-serif text-xl font-bold text-[#1a1714]">家里现有</h2>
          <p class="mt-0.5 text-xs text-[#8B7D6B]">{{ storageTotal }} 件存着的食材</p>
        </div>
        <span class="rounded-full bg-[#F4ECE2] px-3 py-1 font-mono text-xs text-[#6B5D4D]">
          {{ storageZoneMeta[activeMobileStorageZone].label }}
        </span>
      </div>

      <div class="mb-3 grid grid-cols-3 gap-2">
        <button
          v-for="zone in (['refrigerated', 'frozen', 'room_temp'] as const)"
          :key="zone"
          class="rounded-lg border px-2 py-2 text-left transition-colors"
          :class="activeMobileStorageZone === zone ? storageZoneMeta[zone].tone : 'border-gray-200 bg-white text-[#8B7D6B]'"
          @click="activeMobileStorageZone = zone"
        >
          <span class="block text-sm">{{ storageZoneMeta[zone].icon }} {{ storageZoneMeta[zone].label }}</span>
          <span class="mt-1 block font-mono text-xs">{{ storageGroups[zone].length }} 件</span>
        </button>
      </div>

      <div class="mb-3 grid grid-cols-[1fr_auto] gap-2">
        <input
          v-model="newFridgeItem.name"
          placeholder="食材名称"
          class="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C06030]"
        />
        <select
          v-model="newFridgeItem.zone"
          class="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm focus:outline-none"
        >
          <option value="refrigerated">冷藏</option>
          <option value="frozen">冷冻</option>
          <option value="room_temp">常温</option>
        </select>
        <input
          v-model="newFridgeItem.amount"
          placeholder="数量"
          class="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C06030]"
        />
        <div class="col-span-2 flex items-center gap-2">
          <label class="text-[10px] text-[#A69080] whitespace-nowrap">保质期</label>
          <input v-model="newFridgeItem.expiryDate" type="date"
            class="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:border-[#C06030]" />
        </div>
        <button
          class="rounded-lg bg-[#C06030] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A85028]"
          @click="handleAddFridge"
        >
          添加
        </button>
      </div>

      <div class="max-h-56 overflow-y-auto pr-1">
        <div v-if="activeMobileStorageItems.length" class="space-y-2">
          <div
            v-for="(item, idx) in activeMobileStorageItems"
            :key="item.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <div class="min-w-0">
              <div class="flex min-w-0 items-center gap-2">
                <span class="truncate text-sm font-medium text-[#1a1714]">{{ item.name }}</span>
                <span v-if="item.amount" class="font-mono text-xs text-[#A69080]">{{ item.amount }}</span>
                <span v-if="expiryStatus(item.expiryDate)" class="rounded-full px-1.5 py-0.5 text-[10px] font-medium" :class="expiryStatus(item.expiryDate)!.class">{{ expiryStatus(item.expiryDate)!.label }}</span>
              </div>
              <p v-if="formatAddedDate(item.addedDate)" class="mt-0.5 text-[11px] text-[#A69080]">
                {{ formatAddedDate(item.addedDate) }} 放入
              </p>
            </div>
            <button
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#A69080] transition-colors hover:bg-red-50 hover:text-[#D05050]"
              aria-label="移出存储"
              @click="handleRemoveFridge(activeMobileStorageZone, idx)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" /></svg>
            </button>
          </div>
        </div>
        <p v-else class="rounded-lg border border-dashed border-[#D8C9B8] py-6 text-center text-sm text-[#A69080]">
          冷藏室空空的，该去采购了
        </p>
      </div>
    </section>

    <!-- Category stats + batch generate -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <span class="font-mono text-sm font-bold text-[#1a1714] mr-1">{{ stats.total }}</span>
      <span class="text-xs text-[#8B7D6B] mr-2">种食材</span>
      <span v-for="cat in categories.slice(0, 6)" :key="cat.name"
        class="px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-all"
        :class="activeCategory === cat.name ? 'bg-[#3D3530] text-white border-[#3D3530]' : 'bg-white text-[#8B7D6B] border-gray-200 hover:bg-gray-50'"
        @click="activeCategory = activeCategory === cat.name ? '' : cat.name">
        {{ cat.name }} {{ cat.count }}
      </span>
      <span v-if="categories.length > 6" class="text-xs text-[#A69080]">+{{ categories.length - 6 }}</span>
      <div class="flex-1"></div>
      <button class="hidden px-4 py-1.5 bg-[#C06030] text-white rounded-lg text-xs font-medium hover:bg-[#A85028] transition-colors disabled:opacity-50 sm:inline-flex"
        :disabled="batchGenerating || stats.missing === 0"
        aria-label="一键生成缺失配图"
        @click="batchGenerateMissing">
        {{ batchGenerating ? `${batchProgress.current}/${batchProgress.total}` : '一键生成配图' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-[#A69080]">正在盘点食材...</p>
    </div>

    <!-- Main 70/30 grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <!-- LEFT: Ingredient Market -->
      <div class="lg:col-span-7">
        <!-- Controls -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <div class="relative flex-1 min-w-[180px] max-w-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4 text-[#A69080] absolute left-3 top-1/2 -translate-y-1/2">
              <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input v-model="searchQuery" placeholder="搜索食材..."
              class="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#C06030]"
              aria-label="搜索食材" />
          </div>
          <!-- Sort -->
          <select v-model="sortBy" class="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none">
            <option value="count">使用频次</option>
            <option value="name">名称</option>
            <option value="category">分类</option>
          </select>
          <!-- Line art filter -->
          <select v-model="lineArtFilter" class="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none">
            <option value="all">全部线稿</option>
            <option value="missing">待生成</option>
            <option value="has">已有</option>
          </select>
          <!-- Active category clear -->
          <button v-if="activeCategory" class="px-2 py-1.5 text-xs text-[#C06030] hover:text-[#A85028]" @click="activeCategory = ''">
            ✕ {{ activeCategory }}
          </button>
        </div>

        <!-- Results count -->
        <p class="text-xs text-[#A69080] mb-3 font-mono">{{ filteredIngredients.length }} 种食材</p>

        <!-- Card grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          <IngredientCard v-for="ing in filteredIngredients" :key="ing.id"
            :ingredient="ing" :in-storage="storageMap.has(ing.name)" :storage-zone="storageMap.get(ing.name)"
            :storage-item="storageItemMap.get(ing.name)"
            @select="openDrawer(ing)" @store="(zone) => quickStore(ing, zone)" />
        </div>

        <p v-if="!filteredIngredients.length" class="text-center py-12 text-[#A69080]">
          {{ searchQuery ? '没有找到匹配的食材，换个词试试？' : '食材库空空如也，先添几样常用的吧' }}
        </p>
      </div>

      <!-- RIGHT: Storage -->
      <div class="hidden lg:block lg:col-span-3">
        <div class="sticky top-6">
          <h2 class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-4">📦 存储</h2>

          <!-- Add form -->
          <div class="flex flex-col gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <input v-model="newFridgeItem.name" placeholder="食材名称"
              class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:border-[#C06030]" />
            <div class="flex gap-2">
              <input v-model="newFridgeItem.amount" placeholder="数量"
                class="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:border-[#C06030]" />
              <select v-model="newFridgeItem.zone"
                class="px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:outline-none">
                <option value="refrigerated">冷藏</option>
                <option value="frozen">冷冻</option>
                <option value="room_temp">常温</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-[10px] text-[#A69080] whitespace-nowrap">保质期</label>
              <input v-model="newFridgeItem.expiryDate" type="date"
                class="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:border-[#C06030]" />
            </div>
            <button class="w-full px-3 py-1.5 bg-[#C06030] text-white rounded-md text-xs font-medium hover:bg-[#A85028] transition-colors"
              @click="handleAddFridge">添加</button>
          </div>

          <!-- Refrigerated -->
          <div class="mb-4">
            <h3 class="text-[10px] font-bold text-[#8B7D6B] uppercase tracking-widest mb-2">🧊 冷藏 ({{ fridgeRefrigerated.length }})</h3>
            <div class="space-y-1.5">
              <div v-for="(item, idx) in fridgeRefrigerated" :key="item.id"
                class="bg-white rounded-md border border-gray-200 px-3 py-1.5 flex items-center justify-between hover:border-gray-300 transition-colors">
                <div class="min-w-0">
                  <span class="text-xs font-medium text-[#1a1714] truncate">{{ item.name }}</span>
                  <span class="font-mono text-[10px] text-[#A69080] ml-1">{{ item.amount }}</span>
                  <span v-if="expiryStatus(item.expiryDate)" class="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium" :class="expiryStatus(item.expiryDate)!.class">{{ expiryStatus(item.expiryDate)!.label }}</span>
                </div>
                <button class="w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-[#A69080] hover:text-[#D05050] transition-colors"
                  @click="handleRemoveFridge('refrigerated', idx)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" /></svg>
                </button>
              </div>
              <p v-if="!fridgeRefrigerated.length" class="text-[10px] text-[#A69080] text-center py-3">冷藏室空空的，该去采购了</p>
            </div>
          </div>

          <!-- Frozen -->
          <div>
            <h3 class="text-[10px] font-bold text-[#8B7D6B] uppercase tracking-widest mb-2">❄️ 冷冻 ({{ fridgeFrozen.length }})</h3>
            <div class="space-y-1.5">
              <div v-for="(item, idx) in fridgeFrozen" :key="item.id"
                class="bg-white rounded-md border border-gray-200 px-3 py-1.5 flex items-center justify-between hover:border-gray-300 transition-colors">
                <div class="min-w-0">
                  <span class="text-xs font-medium text-[#1a1714] truncate">{{ item.name }}</span>
                  <span class="font-mono text-[10px] text-[#A69080] ml-1">{{ item.amount }}</span>
                  <span v-if="expiryStatus(item.expiryDate)" class="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium" :class="expiryStatus(item.expiryDate)!.class">{{ expiryStatus(item.expiryDate)!.label }}</span>
                </div>
                <button class="w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-[#A69080] hover:text-[#D05050] transition-colors"
                  @click="handleRemoveFridge('frozen', idx)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" /></svg>
                </button>
              </div>
              <p v-if="!fridgeFrozen.length" class="text-[10px] text-[#A69080] text-center py-3">冷冻区暂时是空的</p>
            </div>
          </div>

          <!-- Room temp -->
          <div>
            <h3 class="text-[10px] font-bold text-[#8B7D6B] uppercase tracking-widest mb-2">🌡️ 常温 ({{ fridgeRoomTemp.length }})</h3>
            <div class="space-y-1.5">
              <div v-for="(item, idx) in fridgeRoomTemp" :key="item.id"
                class="bg-white rounded-md border border-gray-200 px-3 py-1.5 flex items-center justify-between hover:border-gray-300 transition-colors">
                <div class="min-w-0">
                  <span class="text-xs font-medium text-[#1a1714] truncate">{{ item.name }}</span>
                  <span class="font-mono text-[10px] text-[#A69080] ml-1">{{ item.amount }}</span>
                  <span v-if="expiryStatus(item.expiryDate)" class="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium" :class="expiryStatus(item.expiryDate)!.class">{{ expiryStatus(item.expiryDate)!.label }}</span>
                </div>
                <button class="w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-[#A69080] hover:text-[#D05050] transition-colors"
                  @click="handleRemoveFridge('room_temp', idx)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" /></svg>
                </button>
              </div>
              <p v-if="!fridgeRoomTemp.length" class="text-[10px] text-[#A69080] text-center py-3">常温区还没有东西</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Side drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="drawerOpen && selectedIng" class="fixed inset-0 z-50 flex justify-end">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/30" @click="closeDrawer"></div>
          <!-- Panel -->
          <div class="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div class="p-6">
              <!-- Header -->
              <div class="flex items-center justify-between mb-6">
                <button class="text-sm text-[#8B7D6B] hover:text-[#1a1714] transition-colors flex items-center gap-1" @click="closeDrawer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                  返回
                </button>
                <button class="px-4 py-1.5 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors disabled:opacity-50"
                  :disabled="saving" @click="saveIngredient">
                  {{ saving ? '保存中...' : '保存' }}
                </button>
              </div>

              <!-- Image + edit form -->
              <div class="flex gap-4 mb-6">
                <div class="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0" :class="colorClasses[selectedIng.crayonColor || ''] || 'bg-gray-50'">
                  <img v-if="getLineArtUrls(selectedIng).length" :src="getLineArtUrls(selectedIng)[selectedArtIndex] || getLineArtUrls(selectedIng)[0]" class="w-full h-full object-cover" />
                  <HandDrawnPlaceholder v-else :tags="[selectedIng.name]" class="w-full h-full" />
                </div>
                <div class="flex-1 space-y-3">
                  <div>
                    <label class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-1 block">名称</label>
                    <input v-model="editForm.name" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#C06030]" />
                  </div>
                  <div>
                    <label class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-1 block">分类</label>
                    <input v-model="editForm.category" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#C06030]" />
                  </div>
                  <div>
                    <label class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-1 block">科</label>
                    <input v-model="editForm.family" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#C06030]" />
                  </div>
                </div>
              </div>

              <!-- Line art generation -->
              <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-[#8B7D6B]">线稿图</span>
                  <span class="text-[10px]" :class="getLineArtUrls(selectedIng).length ? 'text-[#6D8B74]' : 'text-[#A69080]'">
                    {{ getLineArtUrls(selectedIng).length ? `${getLineArtUrls(selectedIng).length} 张可选` : '未生成' }}
                  </span>
                </div>

                <!-- Multi-image grid (when multiple available) -->
                <div v-if="getLineArtUrls(selectedIng).length > 1" class="grid grid-cols-4 gap-2 mb-3">
                  <div v-for="(url, idx) in getLineArtUrls(selectedIng)" :key="idx"
                    class="aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all"
                    :class="selectedArtIndex === idx ? 'border-[#C06030] shadow-md' : 'border-transparent hover:border-gray-300'"
                    @click="selectLineArt(selectedIng, url, idx)">
                    <img :src="url" class="w-full h-full object-cover" />
                  </div>
                </div>

                <button class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  :class="generating[selectedIng.name] === 'done' ? 'bg-[#6D8B74] text-white' : generating[selectedIng.name] === 'polling' ? 'bg-[#D86830]/20 text-[#D86830]' : getLineArtUrls(selectedIng).length ? 'bg-gray-200 text-[#8B7D6B] hover:bg-gray-300' : 'bg-[#C06030] text-white hover:bg-[#A85028]'"
                  :disabled="generating[selectedIng.name] === 'submitting' || generating[selectedIng.name] === 'polling' || generating[selectedIng.name] === 'quota'"
                  @click="generateSingle(selectedIng)">
                  {{ generating[selectedIng.name] === 'submitting' ? '提交中...' : generating[selectedIng.name] === 'polling' ? '生成中... (可离开页面)' : generating[selectedIng.name] === 'done' ? '✓ 生成完成' : generating[selectedIng.name] === 'quota' ? '今日配额已用完' : generating[selectedIng.name] === 'failed' ? '生成失败，点击重试' : getLineArtUrls(selectedIng).length ? '重新生成' : '生成配图' }}
                </button>
                <p v-if="lineArtErrors[selectedIng.name]" class="mt-2 text-xs text-[#B4472A]">
                  {{ lineArtErrors[selectedIng.name] }}
                </p>
              </div>

              <!-- Related recipes -->
              <div class="mb-6">
                <h3 class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-3">关联菜品 ({{ relatedRecipes.length }})</h3>
                <div v-if="relatedRecipes.length" class="grid grid-cols-3 gap-2">
                  <NuxtLink v-for="r in relatedRecipes" :key="r.id" :to="`/recipes/${r.id}`"
                    class="bg-gray-50 rounded-md p-2 text-center hover:bg-gray-100 transition-colors">
                    <p class="text-xs font-medium text-[#1a1714] truncate">{{ r.name }}</p>
                    <p class="font-mono text-[10px] text-[#D86830] mt-0.5">⭐ {{ r.score }}</p>
                  </NuxtLink>
                </div>
                <p v-else class="text-xs text-[#A69080]">这个食材还没出现在任何菜谱里</p>
              </div>

              <!-- Info -->
              <div class="text-[10px] text-[#A69080] space-y-1">
                <p v-if="selectedIng.family">科: {{ selectedIng.family }}</p>
                <p>颜色: {{ selectedIng.crayonColor || '未设置' }}</p>
                <p>关联菜品: {{ selectedIng.recipeCount }} 道</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.drawer-enter-active, .drawer-leave-active {
  transition: all 0.3s ease;
}
.drawer-enter-active .relative, .drawer-leave-active .relative {
  transition: transform 0.3s ease;
}
.drawer-enter-from .relative, .drawer-leave-to .relative {
  transform: translateX(100%);
}
.drawer-enter-from .absolute, .drawer-leave-to .absolute {
  opacity: 0;
}
</style>
